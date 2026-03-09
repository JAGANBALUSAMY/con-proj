const reworkRepository = require('#backend/repositories/reworkRepository');
const userRepository = require('#backend/repositories/userRepository');
const socketUtil = require('#backend/utils/socket');
const { SOCKET_EVENTS } = require('#backend/utils/constants');

/**
 * Logic for creating a rework log
 */
const createReworkLog = async (data, operatorId) => {
    const { batchId, reworkStage, quantity, curedQuantity, scrappedQuantity, startTime, endTime } = data;

    const qty = parseInt(quantity);
    const cured = parseInt(curedQuantity);
    const scrapped = parseInt(scrappedQuantity);

    if (cured + scrapped !== qty) throw new Error('Sum of cured and scrapped must equal total reworked quantity');
    if (!['CUTTING', 'STITCHING'].includes(reworkStage)) throw new Error('Invalid reworkStage');

    // Operator validation
    const operator = await userRepository.findUserById(operatorId);
    if (!operator || operator.role !== 'OPERATOR' || operator.verificationStatus !== 'VERIFIED') {
        throw new Error('Only VERIFIED operators can log rework');
    }

    const sections = operator.sectionAssignments.map(sa => sa.stage);
    if (!sections.includes(reworkStage) && !sections.includes('REWORK')) {
        throw new Error('Access denied: Unauthorized section for rework');
    }

    // Overlap checks would go here (already implemented in ProductionService, could be shared)

    // Batch validation
    const batch = await reworkRepository.findBatchWithDefectsAndRework(parseInt(batchId), reworkStage);
    if (!batch) throw new Error('Batch not found');
    if (['COMPLETED', 'CANCELLED'].includes(batch.status)) throw new Error('Batch closed');

    const totalDefects = batch.defectRecords.reduce((sum, d) => sum + d.quantity, 0);
    const totalRework = batch.reworkRecords.reduce((sum, r) => sum + r.quantity, 0);
    const available = totalDefects - totalRework;

    if (qty > available) throw new Error(`Double Rework Guard: Only ${available} units available.`);
    if (batch.defectiveQuantity < qty) throw new Error('Incomplete QC pool.');

    const reworkRecord = await reworkRepository.createReworkRecord({
        batchId: batch.id,
        operatorUserId: operatorId,
        managedByUserId: operator.createdByUserId,
        reworkStage,
        quantity: qty,
        curedQuantity: cured,
        scrappedQuantity: scrapped,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        status: 'PENDING',
        approvalStatus: 'PENDING'
    });

    socketUtil.emitEvent(SOCKET_EVENTS.APPROVAL.UPDATED, reworkRecord);
    socketUtil.emitEvent(SOCKET_EVENTS.BATCH.STATUS_UPDATED, { batchId: reworkRecord.batchId });

    return reworkRecord;
};

module.exports = {
    createReworkLog
};
