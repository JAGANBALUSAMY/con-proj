const qualityRepository = require('#backend/repositories/qualityRepository');
const socketUtil = require('#backend/utils/socket');
const { SOCKET_EVENTS } = require('#backend/utils/constants');
const productionRepository = require('#backend/repositories/productionRepository');

/**
 * Logic for recording defects
 */
const recordDefect = async (data, operatorId) => {
    const { batchId, quantityIn, defectiveQuantity, defects, startTime, endTime } = data;

    // 1. Operator validation
    const operator = await productionRepository.findOperatorById(operatorId);
    if (!operator || operator.role !== 'OPERATOR') {
        throw new Error('Only operators can record defects');
    }
    if (!operator.sectionAssignments.some(sa => sa.stage === 'QUALITY_CHECK')) {
        throw new Error('Access denied: You are not assigned to QUALITY_CHECK');
    }

    // 2. Batch validation
    const batch = await qualityRepository.findBatchWithRelations(parseInt(batchId));
    if (!batch) throw new Error('Batch not found');
    if (batch.currentStage !== 'QUALITY_CHECK') throw new Error('Batch is not in QUALITY_CHECK stage');

    // 3. Ledger classification
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
        throw new Error(`Invalid QC Quantity. Input (${qtyIn}) must match either Remaining (${remainingToQC}) or Pending Re-QC (${reworkedPending}).`);
    }

    if (parseInt(defectiveQuantity) > qtyIn) throw new Error('Defective quantity cannot exceed inspected quantity');

    const defectSum = defects.reduce((sum, d) => sum + (parseInt(d.quantity) || 0), 0);
    if (defectSum !== parseInt(defectiveQuantity)) {
        throw new Error('Sum of defect entries does not match total defective quantity');
    }

    // 4. Record in Transaction
    const defectData = defects.map(d => ({
        batchId: batch.id,
        stage: d.stage || 'QUALITY_CHECK',
        reworkStage: d.reworkStage || 'STITCHING',
        defectCode: d.defectCode,
        quantity: parseInt(d.quantity),
        severity: d.severity,
        detectedByUserId: operatorId
    }));

    const qualityLogData = {
        batchId: batch.id,
        stage: 'QUALITY_CHECK',
        operatorUserId: operatorId,
        recordedByUserId: operatorId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        quantityIn: qtyIn,
        quantityOut: qtyIn - parseInt(defectiveQuantity),
        approvalStatus: 'PENDING',
        rejectionReason: `TYPE:${logType}`
    };

    const result = await qualityRepository.recordDefectsInTransaction(defectData, qualityLogData);
    socketUtil.emitEvent(SOCKET_EVENTS.APPROVAL.UPDATED, result);

    return { result, logType };
};

/**
 * Logic for batch quality summary
 */
const getBatchQualitySummary = async (batchId) => {
    const batch = await qualityRepository.findBatchWithRelations(parseInt(batchId));
    if (!batch) throw new Error('Batch not found');

    const surviving = batch.totalQuantity - batch.scrappedQuantity;
    const qcCleared = batch.usableQuantity;
    const defective = batch.defectiveQuantity;
    const reworkedPending = batch.reworkedPendingQuantity || 0;
    const remainingToQC = surviving - qcCleared - reworkedPending;

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

    return {
        batch: {
            id: batch.id,
            batchNumber: batch.batchNumber,
            originalTotal: batch.totalQuantity,
            survivingTotal: surviving,
            qcCleared,
            defective,
            reworkedPending,
            remainingToQC,
            defectCountByStage,
            availableReworkByStage
        }
    };
};

module.exports = {
    recordDefect,
    getBatchQualitySummary
};
