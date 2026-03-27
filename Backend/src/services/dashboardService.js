const dashboardRepository = require('#backend/repositories/dashboardRepository');
const socketUtil = require('#backend/utils/socket');
const { SOCKET_EVENTS, PAGINATION } = require('#backend/utils/constants');

/**
 * Get Admin Stats
 */
const getAdminStats = async (query) => {
    const page = parseInt(query.page) || PAGINATION.DEFAULT_PAGE;
    const limit = parseInt(query.limit) || PAGINATION.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const [counts, activeBatchList, batchHistory] = await Promise.all([
        dashboardRepository.getCounts(['MANAGER', 'OPERATOR'], ['COMPLETED', 'CANCELLED']),
        dashboardRepository.getActiveBatches(),
        dashboardRepository.getBatchHistory(skip, limit)
    ]);

    return {
        stats: {
            ...counts,
            // Frontend admin card reads `managers`; keep both keys for compatibility.
            managers: counts.managerCount || 0,
            activeBatchList,
            batchHistory,
            pagination: {
                total: counts.totalHistory,
                page,
                limit,
                pages: Math.ceil(counts.totalHistory / limit)
            }
        }
    };
};

/**
 * Get Manager Dashboard
 */
const getManagerDashboard = async (user) => {
    const managerId = user.userId;
    const assignedSections = user.sections || [];

    const team = await dashboardRepository.getManagerTeam(managerId, assignedSections);
    const operatorIds = team.map(op => op.id);

    const rawQueue = await dashboardRepository.getProductionLogsForQueue(operatorIds, assignedSections);

    let approvalQueue = await Promise.all(rawQueue.map(async (log) => {
        const metrics = await dashboardRepository.getBatchMetricsForEnrichment(log.batchId);
        const { approvedQCLogs, pendingRework } = metrics;

        const qcClearedTotal = approvedQCLogs.reduce((sum, ql) => sum + ql.quantityOut, 0);
        const survivingTotal = log.batch.totalQuantity - log.batch.scrappedQuantity;

        return {
            ...log,
            isWaitingForRework: log.batch.defectiveQuantity > 0 || !!pendingRework,
            isReQCRequired: qcClearedTotal < survivingTotal,
            hasOtherPendingQC: !!metrics.pendingQCLogs,
            qcClearedTotal,
            survivingTotal
        };
    }));

    if (assignedSections.includes('CUTTING')) {
        const pendingBatches = await dashboardRepository.getPendingBatchesForCutting();
        const batchItems = pendingBatches.map(b => ({
            id: b.id,
            type: 'BATCH',
            batch: { batchNumber: b.batchNumber, briefTypeName: b.briefTypeName, updatedAt: b.updatedAt },
            operator: { fullName: 'System / Planning' },
            stage: 'CUTTING',
            quantityIn: b.totalQuantity,
            createdAt: b.createdAt
        }));
        approvalQueue = [...batchItems, ...approvalQueue];
    }

    const validReworkStages = ['CUTTING', 'STITCHING'];
    const reworkQueryStages = assignedSections.filter(s => validReworkStages.includes(s));
    const reworkQueue = await dashboardRepository.getReworkQueue(operatorIds, reworkQueryStages);

    const rawBatches = await dashboardRepository.getActiveBatchesBySections(assignedSections);
    const activeBatches = await Promise.all(rawBatches.map(async (b) => {
        const metrics = await dashboardRepository.getBatchMetricsForEnrichment(b.id);
        const qcClearedTotal = metrics.approvedQCLogs.reduce((sum, log) => sum + (log.quantityOut || 0), 0);
        const survivingTotal = b.totalQuantity - b.scrappedQuantity;

        return {
            ...b,
            isWaitingForRework: b.defectiveQuantity > 0 || !!metrics.pendingRework,
            isReQCRequired: qcClearedTotal < survivingTotal,
            hasPendingQC: !!metrics.pendingQCLogs,
            qcClearedTotal,
            survivingTotal
        };
    }));

    return { sections: assignedSections, team, approvalQueue, reworkQueue, activeBatches };
};

/**
 * Get Operator Dashboard
 */
const getOperatorDashboard = async (user) => {
    const operatorId = user.userId;
    const assignedSections = user.sections;

    // Direct use of prisma for complex OR (simplified for this migration context)
    const prisma = require('#infra/database/client');
    const batches = await prisma.batch.findMany({
        where: {
            OR: [
                { currentStage: { in: assignedSections } },
                {
                    defectRecords: {
                        some: {
                            reworkStage: assignedSections.includes('REWORK')
                                ? { in: ['CUTTING', 'STITCHING'] }
                                : { in: assignedSections.filter(s => ['CUTTING', 'STITCHING'].includes(s)) }
                        }
                    }
                }
            ],
            status: 'IN_PROGRESS'
        },
        include: { defectRecords: true }
    });

    const filteredBatches = await Promise.all(batches.map(async (batch) => {
        const [pendingProdLog, pendingReworkLog] = await Promise.all([
            prisma.productionLog.findFirst({
                where: { batchId: batch.id, stage: batch.currentStage, approvalStatus: 'PENDING' }
            }),
            prisma.reworkRecord.findFirst({
                where: {
                    batchId: batch.id,
                    reworkStage: assignedSections.includes('REWORK')
                        ? { in: ['CUTTING', 'STITCHING'] }
                        : { in: assignedSections.filter(s => ['CUTTING', 'STITCHING'].includes(s)) },
                    approvalStatus: 'PENDING'
                }
            })
        ]);
        return (!pendingProdLog && !pendingReworkLog) ? batch : null;
    }));

    const recentLogs = await prisma.productionLog.findMany({
        where: { operatorUserId: operatorId },
        include: { batch: { select: { batchNumber: true } } },
        take: 10,
        orderBy: { createdAt: 'desc' }
    });

    return {
        section: assignedSections[0],
        batches: filteredBatches.filter(b => b !== null),
        recentLogs
    };
};

/**
 * Create a new Batch
 */
const createBatch = async (data, user) => {
    const { batchNumber, totalQuantity } = data;

    if (user.role === 'MANAGER' && !(user.sections || []).includes('CUTTING')) {
        throw new Error('Access denied: CUTTING stage is not in your assigned sections');
    }

    const existing = await dashboardRepository.findBatchByNumber(batchNumber);
    if (existing) throw new Error('Batch number already exists');

    const batch = await dashboardRepository.createBatch({
        ...data,
        totalQuantity: parseInt(totalQuantity),
        currentStage: 'CUTTING',
        status: 'PENDING',
        usableQuantity: 0,
        defectiveQuantity: 0,
        reworkedPendingQuantity: 0,
        pendingQCQuantity: parseInt(totalQuantity),
        scrappedQuantity: 0
    });

    socketUtil.emitEvent(SOCKET_EVENTS.BATCH.CREATED, batch);
    return batch;
};

/**
 * Cancel a Batch
 */
const cancelBatch = async (batchId) => {
    const bId = parseInt(batchId);
    const batch = await dashboardRepository.findBatchById(bId);

    if (!batch) throw new Error('Batch not found');
    if (!['PENDING', 'IN_PROGRESS'].includes(batch.status)) {
        throw new Error(`Cannot cancel a batch with status: ${batch.status}`);
    }

    const packingApproval = await dashboardRepository.findPackingApproval(bId);
    if (packingApproval) {
        throw new Error('Cannot cancel batch: PACKING stage has already been approved.');
    }

    return await dashboardRepository.updateBatchStatus(bId, 'CANCELLED');
};

module.exports = {
    getAdminStats,
    getManagerDashboard,
    getOperatorDashboard,
    createBatch,
    cancelBatch
};
