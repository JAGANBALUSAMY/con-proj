const prisma = require('../utils/prisma');
const socketUtil = require('../utils/socket');

/**
 * Approve a Production Log
 * CRITICAL: Advancing the Batch stage happens here.
 */
const approveProductionLog = async (req, res) => {
    try {
        const { logId } = req.params;
        const managerId = req.user.userId;

        // 1. Find the log and verify ownership
        const log = await prisma.productionLog.findUnique({
            where: { id: parseInt(logId) },
            include: { operator: true, batch: true }
        });

        if (!log) return res.status(404).json({ error: 'Log not found' });

        // Constraint #12: Manager must be the owning manager of the operator
        if (log.operator.createdByUserId !== managerId) {
            return res.status(403).json({ error: 'Unauthorized: You can only approve work from your own operators' });
        }

        // Constraint #9: Manager must be assigned to the section/stage
        if (!req.user.sections.includes(log.stage)) {
            return res.status(403).json({ error: `Unauthorized: You are not assigned to oversee the ${log.stage} section` });
        }

        if (log.approvalStatus !== 'PENDING') {
            return res.status(400).json({ error: `Log is already ${log.approvalStatus}` });
        }

        // 2. Perform Transaction: Approve Log + Advance Batch Stage
        const result = await prisma.$transaction(async (tx) => {
            // Update Log
            const updatedLog = await tx.productionLog.update({
                where: { id: log.id },
                data: {
                    approvalStatus: 'APPROVED',
                    approvedByUserId: managerId,
                    approvedAt: new Date()
                }
            });

            // Advance Batch Stage if it's not the final stage
            const stages = ['CUTTING', 'STITCHING', 'QUALITY_CHECK', 'REWORK', 'LABELING', 'FOLDING', 'PACKING'];
            const currentIndex = stages.indexOf(log.batch.currentStage);

            if (currentIndex < stages.length - 1) {
                const nextStage = stages[currentIndex + 1];
                await tx.batch.update({
                    where: { id: log.batchId },
                    data: { currentStage: nextStage }
                });
            } else {
                // Final stage (PACKING) completion
                await tx.batch.update({
                    where: { id: log.batchId },
                    data: { status: 'COMPLETED' }
                });
            }

            return updatedLog;
        });

        const responseData = { message: 'Log approved and batch advanced', log: result };

        // Real-time update for Manager (Sync queue) and Operator (Sync batch stage)
        socketUtil.emitEvent('approval:updated', responseData.log);
        socketUtil.emitEvent('batch:status_updated', { batchId: result.batchId });

        return res.status(200).json(responseData);

    } catch (error) {
        console.error('Approval Error:', error);
        return res.status(500).json({ error: 'Failed to approve production log' });
    }
};

/**
 * Approve Rework
 * NOTE: Rework approval does NOT advance the batch stage.
 */
const approveRework = async (req, res) => {
    try {
        const { reworkId } = req.params;
        const managerId = req.user.userId;

        const rework = await prisma.reworkRecord.findUnique({
            where: { id: parseInt(reworkId) },
            include: { operator: true, batch: true }
        });

        if (!rework) return res.status(404).json({ error: 'Rework record not found' });

        // Ownership check
        if (rework.operator.createdByUserId !== managerId) {
            return res.status(403).json({ error: 'Unauthorized: Ownership mismatch' });
        }

        // Section isolation
        if (!req.user.sections.includes(rework.reworkStage)) {
            return res.status(403).json({ error: 'Unauthorized: Section mismatch' });
        }

        const result = await prisma.$transaction(async (tx) => {
            const updated = await tx.reworkRecord.update({
                where: { id: rework.id },
                data: {
                    approvalStatus: 'APPROVED',
                    approvedByUserId: managerId,
                    approvedAt: new Date()
                }
            });

            // Quantities are added back to batch.usableQuantity upon approval
            await tx.batch.update({
                where: { id: rework.batchId },
                data: {
                    usableQuantity: { increment: rework.curedQuantity },
                    scrappedQuantity: { increment: rework.scrappedQuantity }
                }
            });

            return updated;
        });

        const responseData = { message: 'Rework approved', rework: result };

        // Real-time update for Manager
        socketUtil.emitEvent('approval:updated', responseData.rework);

        return res.status(200).json(responseData);
    } catch (error) {
        return res.status(500).json({ error: 'Rework approval failed' });
    }
};

/**
 * Reject a Production Log
 */
const rejectProductionLog = async (req, res) => {
    try {
        const { logId } = req.params;
        const { reason } = req.body;
        const managerId = req.user.userId;

        const log = await prisma.productionLog.findUnique({
            where: { id: parseInt(logId) },
            include: { operator: true }
        });

        if (!log) return res.status(404).json({ error: 'Log not found' });
        if (log.operator.createdByUserId !== managerId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const updatedLog = await prisma.productionLog.update({
            where: { id: log.id },
            data: {
                approvalStatus: 'REJECTED',
                approvedByUserId: managerId,
                approvedAt: new Date(),
                rejectionReason: reason || 'Work rejected by manager'
            }
        });

        const responseData = { message: 'Log rejected', log: updatedLog };

        // Real-time update for Manager
        socketUtil.emitEvent('approval:updated', responseData.log);

        return res.status(200).json(responseData);
    } catch (error) {
        return res.status(500).json({ error: 'Failed to reject log' });
    }
};

module.exports = {
    approveProductionLog,
    rejectProductionLog,
    approveRework
};
