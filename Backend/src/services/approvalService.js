const approvalRepository = require('#backend/repositories/approvalRepository');
const socketUtil = require('#backend/utils/socket');
const { SOCKET_EVENTS } = require('#backend/utils/constants');
const prisma = require('#infra/database/client'); // Used for findFirst in logic

/**
 * Approve Production Log
 */
const approveProductionLog = async (logId, managerId, userSections) => {
    const log = await approvalRepository.findLogWithOperator(parseInt(logId));
    if (!log) throw new Error('Log not found');

    const sections = userSections || [];

    // Authorization
    if (['QUALITY_CHECK', 'LABELING', 'FOLDING', 'PACKING'].includes(log.stage)) {
        if (!sections.includes(log.stage)) throw new Error(`Unauthorized for ${log.stage}`);
    } else {
        if (log.operator.createdByUserId !== managerId) throw new Error('Unauthorized: Not your operator');
        if (!sections.includes(log.stage)) throw new Error(`Unauthorized oversee for ${log.stage}`);
    }

    if (log.approvalStatus !== 'PENDING') throw new Error(`Log is already ${log.approvalStatus}`);

    const batch = log.batch;
    const stages = ['CUTTING', 'STITCHING', 'QUALITY_CHECK', 'LABELING', 'FOLDING', 'PACKING'];
    const currentIndex = stages.indexOf(batch.currentStage);
    const isFinal = batch.currentStage === 'PACKING';

    const logUpdate = {
        approvalStatus: 'APPROVED',
        approvedByUserId: managerId,
        approvedAt: new Date()
    };

    let batchUpdate = {};
    let boxData = null;

    if (isFinal) {
        boxData = {
            boxCode: `BOX-${batch.batchNumber}`,
            batchId: batch.id,
            quantity: log.quantityOut,
            status: 'PACKED'
        };
        batchUpdate.status = 'COMPLETED';
    } else {
        const logLoss = log.quantityIn - (log.quantityOut || 0);
        let nextStage = stages[currentIndex + 1];

        if (batch.currentStage === 'CUTTING') {
            const cuttingLoss = batch.totalQuantity - log.quantityOut;
            batchUpdate = {
                scrappedQuantity: { increment: cuttingLoss },
                pendingQCQuantity: log.quantityOut,
                usableQuantity: { decrement: batch.totalQuantity },
                status: 'IN_PROGRESS'
            };
        } else if (batch.currentStage === 'STITCHING') {
            if (logLoss > 0) {
                batchUpdate = {
                    scrappedQuantity: { increment: logLoss },
                    pendingQCQuantity: { decrement: logLoss }
                };
            }
        } else if (batch.currentStage === 'QUALITY_CHECK') {
            const logType = log.rejectionReason?.startsWith('TYPE:') ? log.rejectionReason.split(':')[1] : 'INITIAL_QC';
            batchUpdate.usableQuantity = { increment: log.quantityOut };

            if (logType === 'RE_QC') batchUpdate.reworkedPendingQuantity = { decrement: log.quantityIn };
            else batchUpdate.pendingQCQuantity = { decrement: log.quantityIn };

            if (logLoss > 0) batchUpdate.defectiveQuantity = { increment: logLoss };

            // Advancement logic
            // Note: This needs to check DB state within transaction for absolute correctness
            // But for planning the update, we can pre-calculate or let repo handle
            // However, the current code has a complex "HOLD" logic.
            // I'll keep the HOLD logic by injecting a check for pending items.

            // Re-check for hold (HACK: using direct prisma for now inside service to check status)
            const hasPendingRework = await prisma.reworkRecord.findFirst({
                where: { batchId: batch.id, approvalStatus: 'PENDING' }
            });
            const hasPendingQC = await prisma.productionLog.findFirst({
                where: { batchId: batch.id, stage: 'QUALITY_CHECK', approvalStatus: 'PENDING', NOT: { id: log.id } }
            });

            const survivingTotal = batch.totalQuantity - batch.scrappedQuantity;
            const finalCleared = batch.usableQuantity + log.quantityOut;

            if (finalCleared !== survivingTotal || hasPendingRework || hasPendingQC) {
                nextStage = 'QUALITY_CHECK';
            }
        } else {
            if (logLoss > 0) {
                batchUpdate = {
                    usableQuantity: { decrement: logLoss },
                    scrappedQuantity: { increment: logLoss }
                };
            }
        }
        batchUpdate.currentStage = nextStage;
    }

    const updatedLog = await approvalRepository.approveLogTransaction({
        logId: log.id,
        managerId,
        batchId: batch.id,
        logUpdate,
        batchUpdate,
        boxData,
        isFinal
    });

    socketUtil.emitEvent(SOCKET_EVENTS.APPROVAL.UPDATED, updatedLog);
    socketUtil.emitEvent(SOCKET_EVENTS.BATCH.STATUS_UPDATED, { batchId: batch.id });

    return updatedLog;
};

/**
 * Approve Rework
 */
const approveRework = async (reworkId, managerId, userSections) => {
    const rework = await approvalRepository.findReworkWithOperator(parseInt(reworkId));
    if (!rework) throw new Error('Rework record not found');

    if (!userSections.includes(rework.reworkStage)) throw new Error('Unauthorized');

    if (rework.approvalStatus !== 'PENDING') throw new Error(`Rework is ${rework.approvalStatus}`);

    const result = await approvalRepository.approveReworkTransaction({
        reworkId: rework.id,
        managerId,
        batchId: rework.batchId,
        reworkUpdate: {
            approvalStatus: 'APPROVED',
            approvedByUserId: managerId,
            approvedAt: new Date()
        },
        batchUpdate: {
            defectiveQuantity: { decrement: rework.quantity },
            reworkedPendingQuantity: { increment: rework.curedQuantity },
            scrappedQuantity: { increment: rework.scrappedQuantity }
        }
    });

    socketUtil.emitEvent(SOCKET_EVENTS.APPROVAL.UPDATED, result.rework);
    return result;
};

/**
 * Reject Rework
 */
const rejectRework = async (reworkId, managerId, userSections, reason) => {
    const rework = await approvalRepository.findReworkWithOperator(parseInt(reworkId));
    if (!rework) throw new Error('Rework not found');
    if (!userSections.includes(rework.reworkStage)) throw new Error('Unauthorized');

    const updated = await approvalRepository.updateReworkRecord(rework.id, {
        approvalStatus: 'REJECTED',
        approvedByUserId: managerId,
        approvedAt: new Date(),
        rejectionReason: reason || 'Rework rejected'
    });

    socketUtil.emitEvent(SOCKET_EVENTS.APPROVAL.UPDATED, updated);
    return updated;
};

/**
 * Reject Production Log
 */
const rejectProductionLog = async (logId, managerId, reason) => {
    const log = await approvalRepository.findLogWithOperator(parseInt(logId));
    if (!log) throw new Error('Log not found');

    // Auth: only owner
    if (log.operator.createdByUserId !== managerId) throw new Error('Unauthorized');

    const updated = await approvalRepository.updateProductionLog(log.id, {
        approvalStatus: 'REJECTED',
        approvedByUserId: managerId,
        approvedAt: new Date(),
        rejectionReason: reason || 'Work rejected'
    });

    socketUtil.emitEvent(SOCKET_EVENTS.APPROVAL.UPDATED, updated);
    return updated;
};

/**
 * Start Batch
 */
const startBatch = async (batchId, userSections) => {
    const batch = await approvalRepository.findBatchById(parseInt(batchId));
    if (!batch) throw new Error('Batch not found');
    if (!userSections.includes('CUTTING')) throw new Error('Only Cutting managers can start a batch');
    if (batch.status !== 'PENDING') throw new Error('Batch already started');

    const updated = await approvalRepository.updateBatch(batch.id, {
        status: 'IN_PROGRESS',
        usableQuantity: batch.totalQuantity
    });

    socketUtil.emitEvent(SOCKET_EVENTS.BATCH.STATUS_UPDATED, { batchId: batch.id });
    return updated;
};

module.exports = {
    approveProductionLog,
    approveRework,
    rejectRework,
    rejectProductionLog,
    startBatch
};
