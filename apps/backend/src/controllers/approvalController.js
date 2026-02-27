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
            // A. RACE CONDITION PROTECTION: Re-fetch batch and log inside transaction
            const currentLog = await tx.productionLog.findUnique({
                where: { id: log.id },
                select: { approvalStatus: true }
            });
            if (!currentLog || currentLog.approvalStatus !== 'PENDING') {
                throw new Error(`Log #${log.id} is no longer pending or has been deleted.`);
            }

            const currentBatch = await tx.batch.findUnique({
                where: { id: log.batchId }
            });
            if (!currentBatch || currentBatch.status === 'COMPLETED' || currentBatch.status === 'CANCELLED') {
                throw new Error(`Batch #${log.batchId} is ${currentBatch?.status || 'not found'} and cannot be modified.`);
            }

            // B. Single-Approval Enforcement: Max 1 APPROVED log per batch per stage
            const existingApproved = await tx.productionLog.findFirst({
                where: {
                    batchId: log.batchId,
                    stage: log.stage,
                    approvalStatus: 'APPROVED'
                }
            });
            if (existingApproved) {
                throw new Error(`Stage ${log.stage} for batch #${log.batchId} is already approved.`);
            }

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
            const stages = ['CUTTING', 'STITCHING', 'QUALITY_CHECK', 'LABELING', 'FOLDING', 'PACKING'];
            const currentIndex = stages.indexOf(currentBatch.currentStage);

            if (currentBatch.currentStage === 'PACKING') {
                // Final stage (PACKING) completion
                const existingBox = await tx.box.findUnique({ where: { batchId: log.batchId } });
                if (existingBox) {
                    throw new Error('A Box for this batch already exists.');
                }

                await tx.box.create({
                    data: {
                        boxCode: `BOX-${currentBatch.batchNumber}`,
                        batchId: log.batchId,
                        quantity: log.quantityOut,
                        status: 'PACKED'
                    }
                });

                await tx.batch.update({
                    where: { id: log.batchId },
                    data: { status: 'COMPLETED' }
                });
            } else {
                // Advance Batch Stage
                const nextStage = stages[currentIndex + 1];
                const updateData = {
                    currentStage: nextStage,
                    usableQuantity: log.quantityOut // Sync usable quantity to what was actually produced
                };

                // Account for loss (difference between what entered the section and what came out)
                const loss = currentBatch.usableQuantity - log.quantityOut;

                if (loss > 0) {
                    if (currentBatch.currentStage === 'QUALITY_CHECK') {
                        // Loss at QC is explicitly "Defective"
                        updateData.defectiveQuantity = { increment: loss };
                    } else {
                        // Loss at any other stage is "Scrapped"
                        updateData.scrappedQuantity = { increment: loss };
                    }
                }

                // Initialisation logic for CUTTING (first section)
                if (currentBatch.currentStage === 'CUTTING') {
                    // Cutting uses totalQuantity as base
                    const cuttingLoss = currentBatch.totalQuantity - log.quantityOut;
                    updateData.usableQuantity = log.quantityOut;
                    updateData.scrappedQuantity = { increment: cuttingLoss };
                    updateData.status = 'IN_PROGRESS';
                }

                await tx.batch.update({
                    where: { id: log.batchId },
                    data: updateData
                });
            }

            // C. Quantity Equation Assertion: usable + defective + scrapped === total
            const finalBatch = await tx.batch.findUnique({ where: { id: log.batchId } });
            if (finalBatch.usableQuantity + finalBatch.defectiveQuantity + finalBatch.scrappedQuantity !== finalBatch.totalQuantity) {
                throw new Error(`Quantity Inconsistency: total(${finalBatch.totalQuantity}) != usable(${finalBatch.usableQuantity}) + def(${finalBatch.defectiveQuantity}) + scrap(${finalBatch.scrappedQuantity})`);
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
        // Rework approval authority belongs to the manager of the section where defects originated.
        if (!req.user.sections.includes(rework.reworkStage)) {
            return res.status(403).json({
                error: `Unauthorized: You are not assigned to the ${rework.reworkStage} section. This rework must be approved by the origin section manager.`
            });
        }

        if (rework.approvalStatus !== 'PENDING') {
            return res.status(400).json({ error: `Rework is already ${rework.approvalStatus}` });
        }

        // Transaction: Approve + Mutate Batch Quantities
        const result = await prisma.$transaction(async (tx) => {
            // RACE CONDITION PROTECTION
            const currentRework = await tx.reworkRecord.findUnique({
                where: { id: rework.id }
            });
            if (!currentRework || currentRework.approvalStatus !== 'PENDING') {
                throw new Error('Rework record is no longer pending.');
            }

            const currentBatch = await tx.batch.findUnique({
                where: { id: rework.batchId }
            });
            if (!currentBatch || currentBatch.status === 'COMPLETED' || currentBatch.status === 'CANCELLED') {
                throw new Error('Cannot modify a completed or cancelled batch.');
            }

            // 1. Update ReworkRecord
            const updatedRework = await tx.reworkRecord.update({
                where: { id: rework.id },
                data: {
                    approvalStatus: 'APPROVED',
                    approvedByUserId: managerId,
                    approvedAt: new Date()
                }
            });

            // 2. Update Batch Quantities
            const updatedBatch = await tx.batch.update({
                where: { id: rework.batchId },
                data: {
                    defectiveQuantity: { decrement: rework.quantity },
                    usableQuantity: { increment: rework.curedQuantity },
                    scrappedQuantity: { increment: rework.scrappedQuantity },
                }
            });

            // 3. Final Invariant Assertion
            if (updatedBatch.usableQuantity + updatedBatch.defectiveQuantity + updatedBatch.scrappedQuantity !== updatedBatch.totalQuantity) {
                throw new Error(`Quantity Inconsistency: total(${updatedBatch.totalQuantity}) != usable(${updatedBatch.usableQuantity}) + def(${updatedBatch.defectiveQuantity}) + scrap(${updatedBatch.scrappedQuantity})`);
            }

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

        const updatedRework = await prisma.$transaction(async (tx) => {
            const currentRework = await tx.reworkRecord.findUnique({ where: { id: rework.id } });
            if (!currentRework || currentRework.approvalStatus !== 'PENDING') {
                throw new Error('Rework is no longer pending.');
            }

            return await tx.reworkRecord.update({
                where: { id: rework.id },
                data: {
                    approvalStatus: 'REJECTED',
                    approvedByUserId: managerId,
                    approvedAt: new Date(),
                    rejectionReason: reason || 'Rework rejected by manager'
                }
            });
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

        // Reject flow must also check status and apply terminal state
        const updatedLog = await prisma.$transaction(async (tx) => {
            const currentLog = await tx.productionLog.findUnique({ where: { id: log.id } });
            if (!currentLog || currentLog.approvalStatus !== 'PENDING') {
                throw new Error('Log is no longer pending.');
            }

            return await tx.productionLog.update({
                where: { id: log.id },
                data: {
                    approvalStatus: 'REJECTED',
                    approvedByUserId: managerId,
                    approvedAt: new Date(),
                    rejectionReason: reason || 'Work rejected by manager'
                }
            });
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

        // Update Batch inside transaction
        const updatedBatch = await prisma.$transaction(async (tx) => {
            return await tx.batch.update({
                where: { id: batch.id },
                data: {
                    status: 'IN_PROGRESS',
                    usableQuantity: batch.totalQuantity,
                }
            });
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
