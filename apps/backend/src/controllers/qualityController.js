const prisma = require('../utils/prisma');
const socketUtil = require('../utils/socket');

/**
 * Record Quality Check & Defects (OPERATOR only, QUALITY_CHECK section)
 *
 * Constraints enforced:
 * - Constraint 9:  Operator must be assigned to QUALITY_CHECK section
 * - Constraint 10: Operator must be VERIFIED
 * - Constraint 12: Creates ProductionLog with approvalStatus = PENDING
 * - Constraint 13: defectiveQuantity ≤ quantityIn (inspected)
 * - Constraint 4:  Cumulative: existing inspected + quantityIn ≤ totalQuantity
 *                  usableQuantity + defectiveQuantity + scrappedQuantity = totalQuantity
 */
const recordDefect = async (req, res) => {
    try {
        const operatorId = req.user.userId;
        const {
            batchId,
            quantityIn,       // Total units inspected in this session
            defectiveQuantity, // Total defective units found
            defects,           // Array: [{ defectCode, quantity, severity }]
            startTime,
            endTime
        } = req.body;

        // ── 1. Validate required fields ──────────────────────────────────────
        if (!batchId || quantityIn == null || defectiveQuantity == null || !startTime || !endTime) {
            return res.status(400).json({
                error: 'batchId, quantityIn, defectiveQuantity, startTime, and endTime are required'
            });
        }

        if (!Array.isArray(defects) || defects.length === 0) {
            return res.status(400).json({ error: 'At least one defect entry is required' });
        }

        const qtyIn = parseInt(quantityIn);
        const defQty = parseInt(defectiveQuantity);

        if (qtyIn <= 0) {
            return res.status(400).json({ error: 'quantityIn must be greater than 0' });
        }

        // ── 2. Constraint 13: defectiveQuantity ≤ quantityIn ─────────────────
        if (defQty < 0 || defQty > qtyIn) {
            return res.status(400).json({
                error: `defectiveQuantity (${defQty}) must be between 0 and quantityIn (${qtyIn})`
            });
        }

        // ── 3. Validate defects array sum matches defectiveQuantity ───────────
        const defectSum = defects.reduce((sum, d) => sum + parseInt(d.quantity || 0), 0);
        if (defectSum !== defQty) {
            return res.status(400).json({
                error: `Sum of individual defect quantities (${defectSum}) must equal defectiveQuantity (${defQty})`
            });
        }

        // ── 4. Validate each defect entry ─────────────────────────────────────
        const validSeverities = ['MINOR', 'MAJOR', 'CRITICAL'];
        for (const d of defects) {
            if (!d.defectCode || !d.severity || d.quantity == null) {
                return res.status(400).json({ error: 'Each defect must have defectCode, severity, and quantity' });
            }
            if (!validSeverities.includes(d.severity)) {
                return res.status(400).json({ error: `Invalid severity: ${d.severity}. Must be MINOR, MAJOR, or CRITICAL` });
            }
            if (parseInt(d.quantity) <= 0) {
                return res.status(400).json({ error: 'Each defect quantity must be greater than 0' });
            }
        }

        // ── 5. Validate time range ─────────────────────────────────────────────
        const start = new Date(startTime);
        const end = new Date(endTime);
        if (end < start) {
            return res.status(400).json({ error: 'endTime must be greater than or equal to startTime' });
        }

        // ── 6. Fetch operator and verify section + status ──────────────────────
        const operator = await prisma.user.findUnique({
            where: { id: operatorId },
            include: { sectionAssignments: true }
        });

        if (!operator || operator.role !== 'OPERATOR') {
            return res.status(403).json({ error: 'Only operators can record quality checks' });
        }

        if (operator.verificationStatus !== 'VERIFIED') {
            return res.status(403).json({ error: 'Operator must be VERIFIED to record quality checks' });
        }

        const operatorSections = operator.sectionAssignments.map(sa => sa.stage);
        if (!operatorSections.includes('QUALITY_CHECK')) {
            return res.status(403).json({
                error: 'Access denied: You are not assigned to the QUALITY_CHECK section',
                yourSections: operatorSections
            });
        }

        // ── 7. Fetch batch and validate stage ──────────────────────────────────
        const batch = await prisma.batch.findUnique({
            where: { id: parseInt(batchId) }
        });

        if (!batch) {
            return res.status(404).json({ error: 'Batch not found' });
        }

        if (batch.currentStage !== 'QUALITY_CHECK') {
            return res.status(400).json({
                error: `Batch is not in QUALITY_CHECK stage. Current stage: ${batch.currentStage}`
            });
        }

        if (batch.status === 'COMPLETED' || batch.status === 'CANCELLED') {
            return res.status(400).json({ error: `Batch is ${batch.status} and cannot be modified` });
        }

        // ── 8. Cumulative quantity validation ──────────────────────────────────
        // Total already inspected = existing defective + existing usable (from prior QC sessions)
        // scrappedQuantity is only set during rework, so we don't count it here.
        const alreadyInspected = batch.defectiveQuantity + batch.usableQuantity;
        const newTotalInspected = alreadyInspected + qtyIn;

        if (newTotalInspected > batch.totalQuantity) {
            return res.status(400).json({
                error: `Quantity overflow: already inspected ${alreadyInspected}, adding ${qtyIn} would exceed totalQuantity (${batch.totalQuantity})`,
                alreadyInspected,
                remaining: batch.totalQuantity - alreadyInspected
            });
        }

        // ── 9. Check for existing PENDING log (prevent duplicate submissions) ──
        const existingPendingLog = await prisma.productionLog.findFirst({
            where: {
                batchId: parseInt(batchId),
                stage: 'QUALITY_CHECK',
                approvalStatus: 'PENDING'
            }
        });

        if (existingPendingLog) {
            return res.status(409).json({
                error: 'A quality check submission is already pending approval for this batch. Please wait for manager review.'
            });
        }

        // ── 10. Execute transaction ────────────────────────────────────────────
        const usableFromThisSession = qtyIn - defQty;

        const result = await prisma.$transaction(async (tx) => {
            // a. Create DefectRecord entries (one per defect type)
            const defectRecords = await Promise.all(
                defects.map(d =>
                    tx.defectRecord.create({
                        data: {
                            batchId: parseInt(batchId),
                            stage: 'QUALITY_CHECK',
                            defectCode: d.defectCode.trim().toUpperCase(),
                            quantity: parseInt(d.quantity),
                            severity: d.severity,
                            detectedByUserId: operatorId
                        }
                    })
                )
            );

            // b. Update batch quantities
            const updatedBatch = await tx.batch.update({
                where: { id: parseInt(batchId) },
                data: {
                    defectiveQuantity: { increment: defQty },
                    usableQuantity: { increment: usableFromThisSession },
                    status: batch.status === 'PENDING' ? 'IN_PROGRESS' : undefined
                }
            });

            // c. Create ProductionLog with PENDING approval (Constraint 12)
            const productionLog = await tx.productionLog.create({
                data: {
                    batchId: parseInt(batchId),
                    stage: 'QUALITY_CHECK',
                    operatorUserId: operatorId,
                    recordedByUserId: operatorId,
                    startTime: start,
                    endTime: end,
                    quantityIn: qtyIn,
                    quantityOut: usableFromThisSession,
                    approvalStatus: 'PENDING'
                },
                include: {
                    batch: { select: { batchNumber: true, briefTypeName: true } },
                    operator: { select: { fullName: true, employeeCode: true } }
                }
            });

            return { productionLog, defectRecords, updatedBatch };
        });

        // ── 11. Emit real-time events ──────────────────────────────────────────
        socketUtil.emitEvent('approval:updated', result.productionLog);

        return res.status(201).json({
            message: 'Quality check recorded successfully. Awaiting manager approval.',
            log: result.productionLog,
            defectRecords: result.defectRecords,
            batchQuantities: {
                totalQuantity: result.updatedBatch.totalQuantity,
                usableQuantity: result.updatedBatch.usableQuantity,
                defectiveQuantity: result.updatedBatch.defectiveQuantity,
                scrappedQuantity: result.updatedBatch.scrappedQuantity
            }
        });

    } catch (error) {
        console.error('Record defect error:', error);
        return res.status(500).json({ error: 'Failed to record quality check' });
    }
};

/**
 * GET /api/quality/batch/:batchId/summary
 * Returns defect summary for a batch (for operator context panel)
 */
const getQualitySummary = async (req, res) => {
    try {
        const { batchId } = req.params;
        const operatorId = req.user.userId;

        // Verify operator is assigned to QUALITY_CHECK
        const operator = await prisma.user.findUnique({
            where: { id: operatorId },
            include: { sectionAssignments: true }
        });

        const operatorSections = operator?.sectionAssignments.map(sa => sa.stage) || [];
        if (!operatorSections.includes('QUALITY_CHECK')) {
            return res.status(403).json({ error: 'Access denied: Not assigned to QUALITY_CHECK' });
        }

        const [batch, defectRecords, logs] = await Promise.all([
            prisma.batch.findUnique({ where: { id: parseInt(batchId) } }),
            prisma.defectRecord.findMany({
                where: { batchId: parseInt(batchId), stage: 'QUALITY_CHECK' },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.productionLog.findMany({
                where: { batchId: parseInt(batchId), stage: 'QUALITY_CHECK' },
                select: { id: true, approvalStatus: true, quantityIn: true, quantityOut: true, createdAt: true },
                orderBy: { createdAt: 'desc' }
            })
        ]);

        if (!batch) return res.status(404).json({ error: 'Batch not found' });

        const alreadyInspected = batch.defectiveQuantity + batch.usableQuantity;
        const remaining = batch.totalQuantity - alreadyInspected;

        return res.status(200).json({
            batch: {
                id: batch.id,
                batchNumber: batch.batchNumber,
                totalQuantity: batch.totalQuantity,
                usableQuantity: batch.usableQuantity,
                defectiveQuantity: batch.defectiveQuantity,
                scrappedQuantity: batch.scrappedQuantity,
                alreadyInspected,
                remaining
            },
            defectRecords,
            logs
        });
    } catch (error) {
        console.error('Quality summary error:', error);
        return res.status(500).json({ error: 'Failed to fetch quality summary' });
    }
};

module.exports = { recordDefect, getQualitySummary };
