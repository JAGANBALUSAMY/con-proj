const prisma = require('#infra/database/client');

/**
 * Find production log with operator and batch
 */
const findLogWithOperator = async (id) => {
    return await prisma.productionLog.findUnique({
        where: { id },
        include: { operator: true, batch: true }
    });
};

/**
 * Find rework record with operator and batch
 */
const findReworkWithOperator = async (id) => {
    return await prisma.reworkRecord.findUnique({
        where: { id },
        include: { operator: true, batch: true }
    });
};

/**
 * Find batch by ID
 */
const findBatchById = async (id) => {
    return await prisma.batch.findUnique({
        where: { id }
    });
};

/**
 * Find existing approved log for batch at stage
 */
const findExistingApproved = async (batchId, stage) => {
    return await prisma.productionLog.findFirst({
        where: {
            batchId,
            stage,
            approvalStatus: 'APPROVED'
        }
    });
};

/**
 * Transaction: Approve Production Log + Advance Batch
 */
const approveLogTransaction = async ({ logId, managerId, batchId, logUpdate, batchUpdate, boxData, isFinal }) => {
    return await prisma.$transaction(async (tx) => {
        // Race condition check
        const currentLog = await tx.productionLog.findUnique({
            where: { id: logId },
            select: { approvalStatus: true }
        });
        if (!currentLog || currentLog.approvalStatus !== 'PENDING') {
            throw new Error('Log is no longer pending or has been deleted.');
        }

        const currentBatch = await tx.batch.findUnique({
            where: { id: batchId }
        });
        if (!currentBatch || currentBatch.status === 'COMPLETED' || currentBatch.status === 'CANCELLED') {
            throw new Error('Batch is no longer modifiable.');
        }

        // Update Log
        const updatedLog = await tx.productionLog.update({
            where: { id: logId },
            data: logUpdate
        });

        // Box creation for final stage
        if (isFinal && boxData) {
            const existingBox = await tx.box.findUnique({ where: { batchId } });
            if (existingBox) throw new Error('A Box for this batch already exists.');
            await tx.box.create({ data: boxData });
        }

        // Update Batch
        const updatedBatch = await tx.batch.update({
            where: { id: batchId },
            data: batchUpdate
        });

        // Invariant check
        const sum = updatedBatch.usableQuantity + updatedBatch.defectiveQuantity +
            updatedBatch.reworkedPendingQuantity + updatedBatch.pendingQCQuantity +
            updatedBatch.scrappedQuantity;
        if (sum !== updatedBatch.totalQuantity) {
            throw new Error('Ledger Inconsistency detected');
        }

        return updatedLog;
    });
};

/**
 * Transaction: Approve Rework + Update Batch
 */
const approveReworkTransaction = async ({ reworkId, managerId, batchId, reworkUpdate, batchUpdate }) => {
    return await prisma.$transaction(async (tx) => {
        const currentRework = await tx.reworkRecord.findUnique({ where: { id: reworkId } });
        if (!currentRework || currentRework.approvalStatus !== 'PENDING') throw new Error('Rework is no longer pending.');

        const currentBatch = await tx.batch.findUnique({ where: { id: batchId } });
        if (!currentBatch || ['COMPLETED', 'CANCELLED'].includes(currentBatch.status)) throw new Error('Batch not modifiable.');

        const updatedRework = await tx.reworkRecord.update({
            where: { id: reworkId },
            data: reworkUpdate
        });

        const updatedBatch = await tx.batch.update({
            where: { id: batchId },
            data: batchUpdate
        });

        const sum = updatedBatch.usableQuantity + updatedBatch.defectiveQuantity +
            updatedBatch.reworkedPendingQuantity + updatedBatch.scrappedQuantity +
            updatedBatch.pendingQCQuantity;
        if (sum !== updatedBatch.totalQuantity) throw new Error('Ledger Inconsistency detected');

        return { rework: updatedRework, batch: updatedBatch };
    });
};

/**
 * Simple Log Update
 */
const updateProductionLog = async (id, data) => {
    return await prisma.productionLog.update({
        where: { id },
        data
    });
};

/**
 * Simple Rework Update
 */
const updateReworkRecord = async (id, data) => {
    return await prisma.reworkRecord.update({
        where: { id },
        data
    });
};

/**
 * Simple Batch Update
 */
const updateBatch = async (id, data) => {
    return await prisma.batch.update({
        where: { id },
        data
    });
};

module.exports = {
    findLogWithOperator,
    findReworkWithOperator,
    findBatchById,
    findExistingApproved,
    approveLogTransaction,
    approveReworkTransaction,
    updateProductionLog,
    updateReworkRecord,
    updateBatch
};
