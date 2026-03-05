const prisma = require('../utils/prisma');
const socketUtil = require('../utils/socket');

/**
 * Record Defect (Operator Quality Check)
 * - Validates Operator Section (QUALITY_CHECK)
 * - Classification: Initial QC vs Re-QC (Strictly classified per User Rule 2)
 */
const recordDefect = async (req, res) => {
    try {
        const { batchId, quantityIn, defectiveQuantity, defects, startTime, endTime } = req.body;
        const operatorId = req.user.userId;

        if (!batchId || !quantityIn || defectiveQuantity === undefined || !defects || !startTime || !endTime) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

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

        const batch = await prisma.batch.findUnique({
            where: { id: parseInt(batchId) }
        });

        if (!batch) return res.status(404).json({ error: 'Batch not found' });
        if (batch.currentStage !== 'QUALITY_CHECK') {
            return res.status(400).json({ error: 'Batch is not in QUALITY_CHECK stage' });
        }

        // --- 📊 LEDGER CLASSIFICATION (User Rule 2) ---
        const qtyIn = parseInt(quantityIn);
        const surviving = batch.totalQuantity - batch.scrappedQuantity;
        const remainingToQC = surviving - batch.usableQuantity - batch.reworkedPendingQuantity;
        const reworkedPending = batch.reworkedPendingQuantity;

        let logType = '';
        if (qtyIn === remainingToQC && remainingToQC > 0) {
            logType = 'INITIAL_QC';
        } else if (qtyIn === reworkedPending && reworkedPending > 0) {
            logType = 'RE_QC';
        } else {
            return res.status(400).json({
                error: `Invalid QC Quantity. Input (${qtyIn}) must match either Remaining (${remainingToQC}) or Pending Re-QC (${reworkedPending}). Mixing pools is forbidden.`,
                remainingToQC,
                reworkedPending
            });
        }

        if (defectiveQuantity > qtyIn) {
            return res.status(400).json({ error: 'Defective quantity cannot exceed inspected quantity' });
        }

        const defectSum = defects.reduce((sum, d) => sum + (parseInt(d.quantity) || 0), 0);
        if (defectSum !== parseInt(defectiveQuantity)) {
            return res.status(400).json({
                error: `Sum of defect entries (${defectSum}) does not match total defective quantity (${defectiveQuantity})`
            });
        }

        const result = await prisma.$transaction(async (tx) => {
            if (defects.length > 0) {
                await tx.defectRecord.createMany({
                    data: defects.map(d => ({
                        batchId: parseInt(batchId),
                        stage: d.stage || 'QUALITY_CHECK',
                        reworkStage: d.reworkStage || 'STITCHING', // Default to STITCHING if not provided
                        defectCode: d.defectCode,
                        quantity: d.quantity,
                        severity: d.severity,
                        detectedByUserId: operatorId
                    }))
                });
            }

            return await tx.productionLog.create({
                data: {
                    batchId: parseInt(batchId),
                    stage: 'QUALITY_CHECK',
                    operatorUserId: operatorId,
                    recordedByUserId: operatorId,
                    startTime: new Date(startTime),
                    endTime: new Date(endTime),
                    quantityIn: qtyIn,
                    quantityOut: qtyIn - parseInt(defectiveQuantity),
                    approvalStatus: 'PENDING',
                    // We'll store the type in rejectionReason temporarily or just let approval derive it
                    rejectionReason: `TYPE:${logType}`
                },
                include: {
                    batch: { select: { batchNumber: true, briefTypeName: true } },
                    operator: { select: { fullName: true } }
                }
            });
        });

        socketUtil.emitEvent('approval:updated', result);

        return res.status(201).json({
            message: `QC log (${logType}) submitted for approval`,
            log: result
        });

    } catch (error) {
        console.error('Record defect error:', error);
        return res.status(500).json({ error: 'Failed to record defects', details: error.message });
    }
};

/**
 * Get Quality Summary for Batch (Ledger Model)
 */
const getBatchQualitySummary = async (req, res) => {
    try {
        const { batchId } = req.params;
        const batch = await prisma.batch.findUnique({
            where: { id: parseInt(batchId) },
            include: {
                defectRecords: true,
                reworkRecords: true
            }
        });

        if (!batch) return res.status(404).json({ error: 'Batch not found' });

        const surviving = batch.totalQuantity - batch.scrappedQuantity;

        // Ledger States (User Core Mental Model)
        const qcCleared = batch.usableQuantity;
        const defective = batch.defectiveQuantity;
        const reworkedPending = batch.reworkedPendingQuantity || 0; // New Field

        // Derived: User Rule Correction 2
        const remainingToQC = surviving - qcCleared - reworkedPending;

        // Defect Breakdown by Stage
        const stages = ['CUTTING', 'STITCHING'];
        const defectCountByStage = {};
        const availableReworkByStage = {};

        for (const stage of stages) {
            const totalDefects = batch.defectRecords
                .filter(d => d.reworkStage === stage)
                .reduce((sum, d) => sum + d.quantity, 0);

            const processedRework = batch.reworkRecords
                .filter(r => r.reworkStage === stage && r.approvalStatus !== 'REJECTED')
                .reduce((sum, r) => sum + r.quantity, 0);

            defectCountByStage[stage] = totalDefects;
            availableReworkByStage[stage] = Math.max(0, totalDefects - processedRework);
        }

        const summary = {
            batch: {
                id: batch.id,
                batchNumber: batch.batchNumber,
                originalTotal: batch.totalQuantity,
                survivingTotal: surviving,

                // Ledger Keys
                qcCleared,            // State 1: Final
                defective,            // State 2: Awaiting Rework
                reworkedPending,      // State 3: Cured, Awaiting Re-QC

                // Ledger Math
                remainingToQC,        // Derived

                defectCountByStage,
                availableReworkByStage
            }
        };

        return res.json(summary);

    } catch (error) {
        console.error('Get QC summary error:', error);
        return res.status(500).json({ error: 'Failed to fetch summary', details: error.message });
    }
};

module.exports = {
    recordDefect,
    getBatchQualitySummary
};
