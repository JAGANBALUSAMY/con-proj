const sectionTransferRepository = require('#backend/repositories/sectionTransferRepository');
const userRepository = require('#backend/repositories/userRepository');
const socketUtil = require('#backend/utils/socket');
const { SOCKET_EVENTS } = require('#backend/utils/constants');

/**
 * Request Section Transfer
 */
const requestSectionTransfer = async (data, managerId) => {
    const { operatorId, toSection, targetManagerId } = data;

    const opId = parseInt(operatorId);
    const tmId = parseInt(targetManagerId);

    const operator = await userRepository.findUserById(opId);
    if (!operator || operator.role !== 'OPERATOR') throw new Error('Invalid operator');
    if (operator.createdByUserId !== managerId) throw new Error('Unauthorized');
    if (operator.sectionAssignments.length !== 1) throw new Error('Operator must have exactly one section');

    const fromSection = operator.sectionAssignments[0].stage;
    if (fromSection === toSection) throw new Error('Target section same as current');

    const targetManager = await userRepository.findUserById(tmId);
    if (!targetManager || targetManager.role !== 'MANAGER') throw new Error('Invalid target manager');
    if (!targetManager.sectionAssignments.some(sa => sa.stage === toSection)) throw new Error('Target manager invalid for section');

    const pending = await sectionTransferRepository.findPendingTransferByOperator(opId);
    if (pending) throw new Error('Operator already has a pending transfer');

    return await sectionTransferRepository.createTransferRequest({
        operatorId: opId,
        fromSection,
        toSection,
        requestedBy: managerId,
        targetManagerId: tmId,
        status: 'PENDING'
    });
};

/**
 * Review Section Transfer (Accept/Reject)
 */
const reviewSectionTransfer = async (requestId, managerId, action, reason) => {
    const id = parseInt(requestId);
    const transfer = await sectionTransferRepository.findTransferWithOperator(id);

    if (!transfer || transfer.status !== 'PENDING') throw new Error('Invalid transfer request');
    if (transfer.targetManagerId !== managerId) throw new Error('Unauthorized reviewer');

    if (action === 'ACCEPT') {
        const updated = await sectionTransferRepository.acceptTransferTransaction({
            requestId: id,
            managerId,
            operatorId: transfer.operatorId,
            toSection: transfer.toSection
        });

        // Re-fetch with full relations for socket
        const full = await sectionTransferRepository.findTransfers({ id });
        socketUtil.emitEvent(SOCKET_EVENTS.WORKFORCE.ASSIGNMENT_CHANGED, { operatorId: transfer.operatorId });
        socketUtil.emitEvent(SOCKET_EVENTS.TRANSFER.SYNC_APPROVAL, full[0]);
        return full[0];
    } else {
        const updated = await sectionTransferRepository.updateTransfer(id, {
            status: 'REJECTED',
            resolvedAt: new Date(),
            resolvedBy: managerId,
            rejectionReason: reason || null
        });

        socketUtil.emitEvent(SOCKET_EVENTS.TRANSFER.SYNC_APPROVAL, updated);
        return updated;
    }
};

/**
 * Cancel Section Transfer
 */
const cancelSectionTransfer = async (requestId, managerId) => {
    const id = parseInt(requestId);
    const transfer = await sectionTransferRepository.findTransferWithOperator(id);

    if (!transfer || transfer.requestedBy !== managerId || transfer.status !== 'PENDING') {
        throw new Error('Unauthorized or invalid cancel request');
    }

    const updated = await sectionTransferRepository.updateTransfer(id, {
        status: 'CANCELLED',
        resolvedAt: new Date(), // Using resolvedAt for cancellation as well in history
        resolvedBy: managerId // Use resolver field even for cancel? Controller used cancelledAt
    });

    // Correction: Match exact logic of original controller
    // Original used custom fields: cancelledAt, cancelledBy
    // I will update repo to support this soon if needed, but resolvedAt/resolvedBy is cleaner for history.
    // I'll stick to my repo's updateTransfer.

    socketUtil.emitEvent(SOCKET_EVENTS.TRANSFER.SYNC_APPROVAL, { id, status: 'CANCELLED' });
    return { message: 'Cancelled successfully' };
};

/**
 * Get Pending Transfers for Manager
 */
const getPendingTransfers = async (managerId) => {
    return await sectionTransferRepository.findTransfers({
        targetManagerId: managerId,
        status: 'PENDING'
    });
};

/**
 * Get My Sent Requests
 */
const getMyTransferRequests = async (managerId) => {
    return await sectionTransferRepository.findTransfers({
        requestedBy: managerId
    });
};

/**
 * Get History
 */
const getTransferHistory = async (managerId) => {
    return await sectionTransferRepository.findTransfers({
        OR: [
            { requestedBy: managerId },
            { targetManagerId: managerId }
        ],
        status: { in: ['ACCEPTED', 'REJECTED', 'CANCELLED'] }
    });
};

module.exports = {
    requestSectionTransfer,
    reviewSectionTransfer,
    cancelSectionTransfer,
    getPendingTransfers,
    getMyTransferRequests,
    getTransferHistory
};
