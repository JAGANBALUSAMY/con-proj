const prisma = require('../utils/prisma');

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

        // 4. Validate time range
        const start = new Date(startTime);
        const end = new Date(endTime);

        if (end < start) {
            return res.status(400).json({ error: 'End time must be greater than or equal to start time' });
        }

        // 5. Validate machine (if provided)
        if (machineId) {
            const machine = await prisma.machine.findUnique({
                where: { id: parseInt(machineId) }
            });

            if (!machine) {
                return res.status(404).json({ error: 'Machine not found' });
            }

            if (machine.status !== 'OPERATIONAL') {
                return res.status(400).json({ error: 'Machine is not operational' });
            }
        }

        // 6. Create ProductionLog with PENDING approval status
        const productionLog = await prisma.productionLog.create({
            data: {
                batchId: parseInt(batchId),
                operatorUserId: operatorId,
                machineId: machineId ? parseInt(machineId) : null,
                stage: batch.currentStage,
                startTime: start,
                endTime: end,
                quantityIn: quantityIn || null,
                quantityOut: quantityOut || null,
                notes: notes || null,
                approvalStatus: 'PENDING' // Operator work requires manager approval
            },
            include: {
                batch: { select: { batchNumber: true, briefTypeName: true } },
                operator: { select: { fullName: true, employeeCode: true } },
                machine: { select: { machineCode: true } }
            }
        });

        // CRITICAL: Batch.currentStage MUST NOT change
        // Stage advancement happens ONLY when Manager approves the log

        return res.status(201).json({
            message: 'Production log created successfully. Awaiting manager approval.',
            log: productionLog
        });

    } catch (error) {
        console.error('Create production log error:', error);
        return res.status(500).json({ error: 'Failed to create production log' });
    }
};

module.exports = {
    createProductionLog
};
