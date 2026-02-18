const prisma = require('../utils/prisma');
const socketUtil = require('../utils/socket');

/**
 * Create Production Log (Operator only)
 * Constraints enforced:
 * - Operator must be VERIFIED
 * - Batch must exist and currentStage must match operator's assigned section
 * - Machine (if provided) must exist and be OPERATIONAL
 * - endTime >= startTime
 * - approvalStatus = PENDING (operator cannot approve)
 * - Batch.currentStage MUST NOT change
 */
const createProductionLog = async (req, res) => {
    try {
        const operatorId = req.user.userId;
        const { batchId, machineId, startTime, endTime, quantityIn, quantityOut, notes } = req.body;

        // 1. Validate required fields
        if (!batchId || !startTime || !endTime) {
            return res.status(400).json({ error: 'batchId, startTime, and endTime are required' });
        }

        // 2. Fetch operator to verify status and get assigned section
        const operator = await prisma.user.findUnique({
            where: { id: operatorId },
            include: { sectionAssignments: true }
        });

        if (!operator || operator.role !== 'OPERATOR') {
            return res.status(403).json({ error: 'Only operators can create production logs' });
        }

        if (operator.verificationStatus !== 'VERIFIED') {
            return res.status(403).json({ error: 'Operator must be VERIFIED to log work' });
        }

        const operatorSections = operator.sectionAssignments.map(sa => sa.stage);

        // 3. Fetch batch and validate section isolation
        const batch = await prisma.batch.findUnique({
            where: { id: parseInt(batchId) }
        });

        if (!batch) {
            return res.status(404).json({ error: 'Batch not found' });
        }

        // Section isolation: Operator can only log work for batches in their assigned section
        if (!operatorSections.includes(batch.currentStage)) {
            return res.status(403).json({
                error: 'Access denied: Batch is not in your assigned section',
                batchStage: batch.currentStage,
                yourSections: operatorSections
            });
        }

        // 3b. Pending Transfer Guard
        const pendingTransfer = await prisma.sectionTransferRequest.findFirst({
            where: {
                operatorId: operatorId,
                status: 'PENDING'
            }
        });

        if (pendingTransfer && batch.currentStage === pendingTransfer.toSection) {
            return res.status(403).json({
                error: `Access Denied: You have a pending transfer request to ${pendingTransfer.toSection}. You cannot log work there until it is ACCEPTED by the target manager.`
            });
        }

        // 4. Validate time range
        const start = new Date(startTime);
        const end = new Date(endTime);

        if (end < start) {
            return res.status(400).json({ error: 'End time must be greater than or equal to start time' });
        }

        // 4b. Completed Batch Lock
        if (batch.status === 'COMPLETED') {
            return res.status(400).json({ error: 'Cannot log work for a COMPLETED batch.' });
        }

        if (batch.status === 'CANCELLED') {
            return res.status(400).json({ error: 'Cannot log work for a CANCELLED batch.' });
        }

        // 4c. Single Approved Log Lock
        const existingApprovedLog = await prisma.productionLog.findFirst({
            where: {
                batchId: parseInt(batchId),
                stage: batch.currentStage,
                approvalStatus: 'APPROVED'
            }
        });

        if (existingApprovedLog) {
            return res.status(400).json({
                error: `This stage (${batch.currentStage}) has already been approved. No further logs allowed.`
            });
        }

        // 5. Machine Safety & Overlap
        if (machineId) {
            const mId = parseInt(machineId);
            const machine = await prisma.machine.findUnique({
                where: { id: mId }
            });

            if (!machine) {
                return res.status(404).json({ error: 'Machine not found' });
            }

            if (machine.status !== 'OPERATIONAL') {
                return res.status(400).json({ error: `Machine ${machine.machineCode} is ${machine.status} and cannot be used.` });
            }

            // Machine Contention Overlap
            const machineOverlap = await prisma.productionLog.findFirst({
                where: {
                    machineId: mId,
                    AND: [
                        { startTime: { lt: end } },
                        { endTime: { gt: start } }
                    ]
                }
            });

            if (machineOverlap) {
                return res.status(400).json({
                    error: `Machine contention: Machine is already in use during this time period by log #${machineOverlap.id}`
                });
            }
        }

        // 5b. Operator Overlap Check
        const operatorOverlap = await prisma.productionLog.findFirst({
            where: {
                operatorUserId: operatorId,
                AND: [
                    { startTime: { lt: end } },
                    { endTime: { gt: start } }
                ]
            }
        });

        if (operatorOverlap) {
            return res.status(400).json({
                error: `Operator overlap: You already have a production log (#${operatorOverlap.id}) during this time period.`
            });
        }

        // Operator Overlap Check (ReworkRecords)
        const reworkOverlap = await prisma.reworkRecord.findFirst({
            where: {
                operatorUserId: operatorId,
                AND: [
                    { startTime: { lt: end } },
                    { endTime: { gt: start } }
                ]
            }
        });

        if (reworkOverlap) {
            return res.status(400).json({
                error: `Operator overlap: You have a rework log (#${reworkOverlap.id}) during this time period.`
            });
        }

        // 6. Generic Quantity Validation (All Stages)
        const qIn = parseInt(quantityIn);
        const qOut = parseInt(quantityOut);

        if (qIn <= 0) {
            return res.status(400).json({ error: 'Invalid Quantity: Input must be greater than 0.' });
        }

        if (quantityOut && qOut > qIn) {
            return res.status(400).json({
                error: `Invalid Quantity: Output (${qOut}) cannot exceed Input (${qIn}).`
            });
        }

        // For non-cutting stages, Input cannot exceed Batch Usable Quantity
        if (batch.currentStage !== 'CUTTING' && qIn > batch.usableQuantity) {
            return res.status(400).json({
                error: `Invalid Quantity: Input (${qIn}) cannot exceed Batch Usable Quantity (${batch.usableQuantity}).`
            });
        }

        // Cutting stage specific: Out <= totalQuantity
        if (batch.currentStage === 'CUTTING' && qOut > batch.totalQuantity) {
            return res.status(400).json({
                error: `Invalid Quantity: CUTTING stage output (${qOut}) cannot exceed Total Quantity (${batch.totalQuantity}).`
            });
        }

        // 7. Stage-Specific Validation
        if (['LABELING', 'FOLDING', 'PACKING'].includes(batch.currentStage)) {
            const requiredQuantity = batch.usableQuantity;

            // Enforce quantityIn matches usableQuantity
            if (qIn !== requiredQuantity) {
                return res.status(400).json({
                    error: `${batch.currentStage} must process exact usable quantity: ${requiredQuantity}`,
                    required: requiredQuantity,
                    received: qIn
                });
            }

            // Enforce quantityOut equals usableQuantity (STRICT)
            if (qOut !== requiredQuantity) {
                return res.status(400).json({
                    error: `${batch.currentStage} stage MUST output exact usable quantity (${requiredQuantity}). No variation allowed.`,
                    received: qOut
                });
            }
        }


        // 8. Create ProductionLog with PENDING approval status
        const productionLog = await prisma.productionLog.create({
            data: {
                batch: { connect: { id: parseInt(batchId) } },
                operator: { connect: { id: operatorId } },
                recordedBy: { connect: { id: operatorId } },
                machine: machineId ? { connect: { id: parseInt(machineId) } } : undefined,
                stage: batch.currentStage,
                startTime: start,
                endTime: end,
                quantityIn: quantityIn ? parseInt(quantityIn) : null,
                quantityOut: quantityOut ? parseInt(quantityOut) : null,
                approvalStatus: 'PENDING'
            },
            include: {
                batch: { select: { batchNumber: true, briefTypeName: true } },
                operator: { select: { fullName: true, employeeCode: true } },
                machine: { select: { machineCode: true } }
            }
        });

        // Stage advancement happens ONLY when Manager approves the log
        const responseData = {
            message: 'Production log created successfully. Awaiting manager approval.',
            log: productionLog
        };

        // Real-time update for Manager
        socketUtil.emitEvent('approval:updated', responseData.log);

        return res.status(201).json(responseData);

    } catch (error) {
        console.error('Create production log error:', error);
        return res.status(500).json({ error: 'Failed to create production log', details: error.message });
    }
};

module.exports = {
    createProductionLog
};
