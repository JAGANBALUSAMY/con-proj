const productionRepository = require('#backend/repositories/productionRepository');
const socketUtil = require('#backend/utils/socket');
const { SOCKET_EVENTS } = require('#backend/utils/constants');

/**
 * Logic for creating a production log
 */
const createProductionLog = async (data, operatorId) => {
    const { batchId, machineId, startTime, endTime, quantityIn, quantityOut, notes } = data;

    // 1. Operator validation
    const operator = await productionRepository.findOperatorById(operatorId);
    if (!operator || operator.role !== 'OPERATOR') {
        throw new Error('Only operators can create production logs');
    }
    if (operator.verificationStatus !== 'VERIFIED') {
        throw new Error('Operator must be VERIFIED to log work');
    }

    const operatorSections = operator.sectionAssignments.map(sa => sa.stage);

    // 2. Batch validation
    const batch = await productionRepository.findBatchById(parseInt(batchId));
    if (!batch) throw new Error('Batch not found');

    if (!operatorSections.includes(batch.currentStage)) {
        throw new Error('Access denied: Batch is not in your assigned section');
    }

    const pendingTransfer = await productionRepository.findPendingTransfer(operatorId);
    if (pendingTransfer && batch.currentStage === pendingTransfer.toSection) {
        throw new Error(`Access Denied: You have a pending transfer request to ${pendingTransfer.toSection}.`);
    }

    // 3. Status and Time validation
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (end < start) throw new Error('End time must be greater than or equal to start time');

    if (batch.status === 'PENDING') throw new Error('Cannot log work for a PENDING batch. Manager must start it.');
    if (batch.status === 'COMPLETED') throw new Error('Cannot log work for a COMPLETED batch.');
    if (batch.status === 'CANCELLED') throw new Error('Cannot log work for a CANCELLED batch.');

    const existingApproved = await productionRepository.findApprovedLog(batch.id, batch.currentStage);
    if (existingApproved) throw new Error(`This stage (${batch.currentStage}) has already been approved.`);

    // 4. Overlap checks
    if (machineId) {
        const machine = await productionRepository.findMachineById(parseInt(machineId));
        if (!machine) throw new Error('Machine not found');
        if (machine.status !== 'OPERATIONAL') throw new Error(`Machine ${machine.machineCode} is ${machine.status}`);

        const machineOverlap = await productionRepository.findMachineOverlap(machine.id, start, end);
        if (machineOverlap) throw new Error('Machine is already in use during this time period');
    }

    const opOverlap = await productionRepository.findOperatorOverlap(operatorId, start, end);
    if (opOverlap) throw new Error('Operator already has a production log during this time period');

    const rwOverlap = await productionRepository.findReworkOverlap(operatorId, start, end);
    if (rwOverlap) throw new Error('Operator already has a rework log during this time period');

    // 5. Quantity validation
    const qIn = parseInt(quantityIn);
    const qOut = parseInt(quantityOut);

    if (qIn <= 0) throw new Error('Invalid Quantity: Input must be greater than 0.');
    if (qOut > qIn) throw new Error('Invalid Quantity: Output cannot exceed Input.');

    if (['STITCHING', 'QUALITY_CHECK'].includes(batch.currentStage) && qIn > batch.pendingQCQuantity) {
        throw new Error(`Invalid Quantity: Input exceeds Batch Pending QC (${batch.pendingQCQuantity}).`);
    }
    if (['LABELING', 'FOLDING', 'PACKING'].includes(batch.currentStage) && qIn > batch.usableQuantity) {
        throw new Error(`Invalid Quantity: Input exceeds Batch Usable Quantity (${batch.usableQuantity}).`);
    }
    if (batch.currentStage === 'CUTTING' && qOut > batch.totalQuantity) {
        throw new Error(`Invalid Quantity: CUTTING stage output cannot exceed Total Quantity (${batch.totalQuantity}).`);
    }

    // Strict quantity for post-QC
    if (['LABELING', 'FOLDING', 'PACKING'].includes(batch.currentStage)) {
        if (qIn !== batch.usableQuantity || qOut !== batch.usableQuantity) {
            throw new Error(`${batch.currentStage} must process exact usable quantity: ${batch.usableQuantity}`);
        }
    }

    // 6. Create Log
    const productionLog = await productionRepository.createProductionLog({
        batchId: batch.id,
        operatorUserId: operatorId,
        recordedByUserId: operatorId,
        machineId: machineId ? parseInt(machineId) : null,
        stage: batch.currentStage,
        startTime: start,
        endTime: end,
        quantityIn: qIn,
        quantityOut: qOut,
        approvalStatus: 'PENDING'
    });

    socketUtil.emitEvent(SOCKET_EVENTS.APPROVAL.UPDATED, productionLog);
    socketUtil.emitEvent(SOCKET_EVENTS.BATCH.STATUS_UPDATED, { batchId: batch.id });

    return productionLog;
};

module.exports = {
    createProductionLog
};
