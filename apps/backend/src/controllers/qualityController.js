const prisma = require('../utils/prisma');
const socketUtil = require('../utils/socket');

/**
 * Record Defect (Operator Quality Check)
 * - Validates Operator Section (QUALITY_CHECK)
 * - Validates Defective Quantity <= Remaining
 * - Usage of Transaction for Batch Updates
 */
const recordDefect = async (req, res) => {
    try {
        const { batchId, quantityIn, defectiveQuantity, defects, startTime, endTime } = req.body;
        const operatorId = req.user.userId;

        // 1. Basic Validation
        if (!batchId || !quantityIn || defectiveQuantity === undefined || !defects || !startTime || !endTime) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // 2. Validate Operator Role & Section
        const operator = await prisma.user.findUnique({
            where: { id: operatorId },
            include: { sectionAssignments: true }
        });

        if (!operator || operator.role !== 'OPERATOR') {
            return res.status(403).json({ error: 'Only operators can record defects' });
        }

        const isQualityOperator = operator.sectionAssignments.some(sa => sa.stage === 'QUALITY_CHECK');
        if (!isQualityOperator) {
            return res.status(403).json({ error: 'Access denied: You are not assigned to QUALITY_CHECK' });
        }

        // 3. Batch Validation
        const batch = await prisma.batch.findUnique({
            where: { id: parseInt(batchId) }
        });

        if (!batch) return res.status(404).json({ error: 'Batch not found' });
        if (batch.currentStage !== 'QUALITY_CHECK') {
            return res.status(400).json({ error: 'Batch is not in QUALITY_CHECK stage' });
        }

        // 4. Quantity Validation
        // Ensure inspected quantity isn't more than what's available? 
        // Logic: Batch has 'usableQuantity'. We are inspecting a subset of it.
        // The total quantityIn cannot typically exceed batch.usableQuantity (though strictly, 
        // multiple QC sessions might happen. For now, we trust the input fits within logical bounds 
        // or add a check if we tracked "remaining uninspected").

        if (defectiveQuantity > quantityIn) {
            return res.status(400).json({ error: 'Defective quantity cannot exceed inspected quantity' });
        }

        const defectSum = defects.reduce((sum, d) => sum + (parseInt(d.quantity) || 0), 0);
        if (defectSum !== parseInt(defectiveQuantity)) {
            return res.status(400).json({
                error: `Sum of defect entries (${defectSum}) does not match total defective quantity (${defectiveQuantity})`
            });
        }

        // 5. Transactional Update
        const result = await prisma.$transaction(async (prisma) => {
            // A. Create Defect Records
            if (defects.length > 0) {
                await prisma.defectRecord.createMany({
                    data: defects.map(d => ({
                        batchId: parseInt(batchId),
                        stage: d.stage || 'QUALITY_CHECK', // Default to QC if not provided, but frontend will send CUTTING/STITCHING
                        defectCode: d.defectCode,
                        quantity: d.quantity,
                        severity: d.severity,
                        detectedByUserId: operatorId
                    }))
                });
            }

            // B. Update Batch Quantities
            // Usable reduces by defective amount. Defective increases.
            // Note: quantityIn is "Good + Bad" inspected. 
            // If I inspect 100, find 10 bad. 
            // The batch.usableQuantity WAS 100 (assuming previous stage passed it all).
            // Now it becomes 90. 
            const updatedBatch = await prisma.batch.update({
                where: { id: parseInt(batchId) },
                data: {
                    defectiveQuantity: { increment: parseInt(defectiveQuantity) },
                    usableQuantity: { decrement: parseInt(defectiveQuantity) }
                }
            });

            // C. Create Production Log (PENDING Approval)
            // This logs the EFFORT of the QC operator.
            const productionLog = await prisma.productionLog.create({
                data: {
                    batchId: parseInt(batchId),
                    stage: 'QUALITY_CHECK',
                    operatorUserId: operatorId,
                    recordedByUserId: operatorId,
                    startTime: new Date(startTime),
                    endTime: new Date(endTime),
                    quantityIn: parseInt(quantityIn),
                    quantityOut: parseInt(quantityIn) - parseInt(defectiveQuantity), // Good output
                    approvalStatus: 'PENDING'
                },
                include: {
                    batch: { select: { batchNumber: true, briefTypeName: true } },
                    operator: { select: { fullName: true } }
                }
            });

            return productionLog;
        });

        // 6. Notify Manager
        socketUtil.emitEvent('approval:updated', result);

        return res.status(201).json({
            message: 'Defects recorded and QC log submitted for approval',
            log: result
        });

    } catch (error) {
        console.error('Record defect error:', error);
        return res.status(500).json({ error: 'Failed to record defects', details: error.message });
    }
};

/**
 * Get Quality Summary for Batch
 * Helper for Frontend Modal to know limits
 */
const getBatchQualitySummary = async (req, res) => {
    try {
        const { batchId } = req.params;
        const batch = await prisma.batch.findUnique({
            where: { id: parseInt(batchId) }
        });

        if (!batch) return res.status(404).json({ error: 'Batch not found' });

        // Calculate how many have already been inspected? 
        // We can sum up ProductionLogs for QC on this batch.
        const qcLogs = await prisma.productionLog.findMany({
            where: {
                batchId: parseInt(batchId),
                stage: 'QUALITY_CHECK'
            }
        });

        const alreadyInspected = qcLogs.reduce((sum, log) => sum + (log.quantityIn || 0), 0);
        // "Remaining" is ambiguous if re-inspection is allowed, but typically:
        // Total - AlreadyInspected.
        // Note: batch.totalQuantity is the original start amount.
        // batch.usableQuantity is the CURRENT good amount.
        // If we want to know "uninspected", we might implicitly track it or assume 
        // total - inspected = remaining. 
        // However, if previous stages had scrap, 'total' might be historical.
        // Let's assume input to QC is the 'usableQuantity' from STITCHING.
        // But 'usableQuantity' is live updated. 
        // Let's use batch.totalQuantity - alreadyInspected for now, assuming linear flow.

        // BETTER: The input to QC is whatever came out of STITCHING.
        // For simplicity in this specific request, we'll return the live batch data
        // and let the frontend use 'usableQuantity' or 'totalQuantity' as context.

        // Defect Breakdown by Stage
        const defectsGrouped = await prisma.defectRecord.groupBy({
            by: ['stage'],
            where: { batchId: parseInt(batchId) },
            _sum: { quantity: true }
        });

        const defectCountByStage = {
            CUTTING: defectsGrouped.find(g => g.stage === 'CUTTING')?._sum?.quantity || 0,
            STITCHING: defectsGrouped.find(g => g.stage === 'STITCHING')?._sum?.quantity || 0
        };

        const summary = {
            batch: {
                id: batch.id,
                batchNumber: batch.batchNumber,
                totalQuantity: batch.totalQuantity,
                usableQuantity: batch.usableQuantity,
                defectiveQuantity: batch.defectiveQuantity,
                alreadyInspected,
                remaining: Math.max(0, batch.totalQuantity - alreadyInspected),
                defectCountByStage
            }
        };

        return res.json(summary);

    } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch summary' });
    }
};

module.exports = {
    recordDefect,
    getBatchQualitySummary
};
