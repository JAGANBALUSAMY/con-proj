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

        // Authorization: Dual-mode per Constraint 12 & 23
        // - QUALITY_CHECK: Section manager authority (Constraint 23)
        //   Any manager assigned to QUALITY_CHECK section can approve.
        // - All other stages: Ownership-based (Constraint 12)
        //   Only the owning manager (creator) can approve.
        if (log.stage === 'QUALITY_CHECK' || log.stage === 'LABELING' || log.stage === 'FOLDING' || log.stage === 'PACKING') {
            // Constraint 23: Section manager approves quality check, labeling, folding & packing logs
            if (!req.user.sections.includes(log.stage)) {
                return res.status(403).json({
                    error: `Unauthorized: You are not assigned to the ${log.stage} section`
                });
            }
        } else {
            // Constraint 12: Owning manager approves all other stage logs
            if (log.operator.createdByUserId !== managerId) {
                return res.status(403).json({
                    error: 'Unauthorized: You can only approve work from your own operators'
                });
            }
            // Constraint 9: Manager must also be assigned to the section
            if (!req.user.sections.includes(log.stage)) {
                return res.status(403).json({
                    error: `Unauthorized: You are not assigned to oversee the ${log.stage} section`
                });
            }
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

            if (log.batch.currentStage === 'PACKING') {
                // Final stage (PACKING) completion
                // Check if Box already exists (Double-check)
                const existingBox = await tx.box.findUnique({ where: { batchId: log.batchId } });
                if (existingBox) {
                    // Since we are in a transaction, throwing error aborts it
                    throw new Error('A Box for this batch already exists.');
                }

                // Create Box
                // Box Code format: BOX-{BatchNumber}
                await tx.box.create({
                    data: {
                        boxCode: `BOX-${log.batch.batchNumber}`,
                        batchId: log.batchId,
                        quantity: log.quantityOut,
                        status: 'PACKED'
                    }
                });

                // Complete Batch
                // NOTE: We do NOT change currentStage. It remains PACKING. Status becomes COMPLETED.
                await tx.batch.update({
                    where: { id: log.batchId },
                    data: { status: 'COMPLETED' }
                });
            } else {
                // Standard Stage Advancement
                const nextStage = stages[currentIndex + 1];
                const updateData = { currentStage: nextStage };

                // SPECIAL HANDLING: CUTTING
                // Cutting stage establishes the actual usable quantity of the batch
                if (log.batch.currentStage === 'CUTTING') {
                    updateData.usableQuantity = log.quantityOut;
                    updateData.status = 'IN_PROGRESS';
                }

                // For other stages, if quantityOut < quantityIn (e.g. minor loss), 
                // we should arguably update usableQuantity, but for now we rely on explicit Defect/Rework flows.
                // However, to be robust, if quantityOut is defined and different, we sync it?
                // Let's stick to CUTTING initialization for now to fix the 0-quantity bug.

                await tx.batch.update({
                    where: { id: log.batchId },
                    data: updateData
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
        console.error('Approval Error Stack:', error);
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

        // Authorization: Constraint 23 (Section-based authority)
        // Manager must be assigned to the section where rework happened (reworkStage)
        if (!req.user.sections.includes(rework.reworkStage)) {
            return res.status(403).json({
                error: `Unauthorized: You are not assigned to the ${rework.reworkStage} section`
            });
        }

        if (rework.approvalStatus !== 'PENDING') {
            return res.status(400).json({ error: `Rework is already ${rework.approvalStatus}` });
        }

        // Transaction: Approve + Mutate Batch Quantities
        const result = await prisma.$transaction(async (tx) => {
            // 1. Update ReworkRecord
            const updatedRework = await tx.reworkRecord.update({
                where: { id: rework.id },
                data: {
                    approvalStatus: 'APPROVED',
                    approvedByUserId: managerId,
                    approvedAt: new Date()
                }
            });

            // 2. Update Batch Quantities (Critial Logic)
            // defectiveQuantity -= quantity (removed from defective pool)
            // usableQuantity += curedQuantity (returned to main flow)
            // scrappedQuantity += scrappedQuantity (permanently lost)
            const updatedBatch = await tx.batch.update({
                where: { id: rework.batchId },
                data: {
                    defectiveQuantity: { decrement: rework.quantity },
                    usableQuantity: { increment: rework.curedQuantity },
                    scrappedQuantity: { increment: rework.scrappedQuantity },
                    status: rework.batch.status === 'PENDING' ? 'IN_PROGRESS' : undefined
                }
            });

            return { rework: updatedRework, batch: updatedBatch };
        });

        const responseData = { message: 'Rework approved', rework: result.rework, batchStats: result.batch };

        // Real-time update for Manager
        socketUtil.emitEvent('approval:updated', responseData.rework);

        return res.status(200).json(responseData);
    } catch (error) {
        console.error('Rework approval error:', error);
        return res.status(500).json({ error: 'Rework approval failed' });
    }
};

/**
 * Reject Rework
 * NO batch mutation happens.
 */
const rejectRework = async (req, res) => {
    try {
        const { reworkId } = req.params;
        const { reason } = req.body;
        const managerId = req.user.userId;

        const rework = await prisma.reworkRecord.findUnique({
            where: { id: parseInt(reworkId) }
        });

        if (!rework) return res.status(404).json({ error: 'Rework record not found' });

        // Authorization: Constraint 23 (Section-based authority)
        if (!req.user.sections.includes(rework.reworkStage)) {
            return res.status(403).json({
                error: `Unauthorized: You are not assigned to the ${rework.reworkStage} section`
            });
        }

        if (rework.approvalStatus !== 'PENDING') {
            return res.status(400).json({ error: `Rework is already ${rework.approvalStatus}` });
        }

        const updatedRework = await prisma.reworkRecord.update({
            where: { id: rework.id },
            data: {
                approvalStatus: 'REJECTED',
                approvedByUserId: managerId,
                approvedAt: new Date(),
                rejectionReason: reason || 'Rework rejected by manager'
            }
        });

        const responseData = { message: 'Rework rejected', rework: updatedRework };

        // Real-time update
        socketUtil.emitEvent('approval:updated', responseData.rework);

        return res.status(200).json(responseData);
    } catch (error) {
        console.error('Rework rejection error:', error);
        return res.status(500).json({ error: 'Failed to reject rework' });
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

/**
 * Approve Batch Start (Cutting Stage Managers Only)
 * Transitions Batch from PENDING to IN_PROGRESS.
 * Sets usableQuantity = totalQuantity (Material issued).
 */
const startBatch = async (req, res) => {
    try {
        const { batchId } = req.params;
        const managerId = req.user.userId;

        const batch = await prisma.batch.findUnique({
            where: { id: parseInt(batchId) }
        });

        if (!batch) return res.status(404).json({ error: 'Batch not found' });

        // Authorization: Constraint 23 (Section-based authority)
        // Only managers assigned to CUTTING (Start stage) can verify/start a batch
        if (!req.user.sections.includes('CUTTING')) {
            return res.status(403).json({
                error: 'Unauthorized: Only Cutting validation managers can start a batch'
            });
        }

        if (batch.status !== 'PENDING') {
            return res.status(400).json({ error: `Batch is already ${batch.status}` });
        }

        if (batch.currentStage !== 'CUTTING') {
            return res.status(400).json({ error: 'Batch start can only happen at CUTTING stage' });
        }

        // Update Batch
        const updatedBatch = await prisma.batch.update({
            where: { id: batch.id },
            data: {
                status: 'IN_PROGRESS',
                usableQuantity: batch.totalQuantity, // Material Issued
                // We don't verifyByUserID on batch table currently, but logs track actions.
                // Could add specific 'startedBy' if schema allowed, but status change is enough.
            }
        });

        const responseData = { message: 'Batch Started', batch: updatedBatch };

        // Real-time update
        socketUtil.emitEvent('batch:status_updated', { batchId: batch.id });

        return res.status(200).json(responseData);

    } catch (error) {
        console.error('Batch start error:', error);
        return res.status(500).json({ error: 'Failed to start batch' });
    }
};

module.exports = {
    approveProductionLog,
    rejectProductionLog,
    approveRework,
    rejectRework,
    startBatch
};
