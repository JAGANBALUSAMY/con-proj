const prisma = require('#infra/database/client');

/**
 * Common count queries for Admin stats
 */
const getCounts = async (roles = [], statuses = []) => {
    const queries = {
        totalUsers: prisma.user.count(),
        activeBatches: prisma.batch.count({ where: { status: 'IN_PROGRESS' } }),
    };

    if (roles.includes('MANAGER')) {
        queries.managerCount = prisma.user.count({ where: { role: 'MANAGER' } });
    }
    if (roles.includes('OPERATOR')) {
        queries.operatorCount = prisma.user.count({ where: { role: 'OPERATOR' } });
    }
    if (statuses.includes('COMPLETED') || statuses.includes('CANCELLED')) {
        queries.totalHistory = prisma.batch.count({ where: { status: { in: ['COMPLETED', 'CANCELLED'] } } });
    }

    const results = await Promise.all(Object.values(queries));
    const keys = Object.keys(queries);
    return keys.reduce((acc, key, i) => {
        acc[key] = results[i];
        return acc;
    }, {});
};

/**
 * Get active batches for Admin
 */
const getActiveBatches = async () => {
    return await prisma.batch.findMany({
        where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
        orderBy: { updatedAt: 'desc' }
    });
};

/**
 * Get batch history with pagination
 */
const getBatchHistory = async (skip, take) => {
    return await prisma.batch.findMany({
        where: { status: { in: ['COMPLETED', 'CANCELLED'] } },
        orderBy: { updatedAt: 'desc' },
        skip,
        take
    });
};

/**
 * Get Manager's team (Operators)
 */
const getManagerTeam = async (managerId, assignedSections) => {
    return await prisma.user.findMany({
        where: {
            role: 'OPERATOR',
            OR: [
                { createdByUserId: managerId },
                {
                    sectionAssignments: {
                        some: {
                            stage: { in: assignedSections }
                        }
                    }
                }
            ]
        },
        select: {
            id: true,
            fullName: true,
            employeeCode: true,
            verificationStatus: true,
            sectionAssignments: { select: { stage: true } }
        }
    });
};

/**
 * Get Production Logs for Approval Queue
 */
const getProductionLogsForQueue = async (operatorIds, assignedSections) => {
    return await prisma.productionLog.findMany({
        where: {
            operatorUserId: { in: operatorIds },
            approvalStatus: 'PENDING',
            stage: { in: assignedSections }
        },
        include: {
            batch: { select: { id: true, batchNumber: true, briefTypeName: true, updatedAt: true, totalQuantity: true, scrappedQuantity: true, defectiveQuantity: true } },
            operator: { select: { fullName: true } }
        },
        orderBy: { createdAt: 'desc' }
    });
};

/**
 * Get Batch summary for Queue Enrichment
 */
const getBatchMetricsForEnrichment = async (batchId) => {
    const [pendingRework, approvedQCLogs, pendingQCLogs] = await Promise.all([
        prisma.reworkRecord.findFirst({ where: { batchId, approvalStatus: 'PENDING' } }),
        prisma.productionLog.findMany({ where: { batchId, stage: 'QUALITY_CHECK', approvalStatus: 'APPROVED' } }),
        prisma.productionLog.findFirst({ where: { batchId, stage: 'QUALITY_CHECK', approvalStatus: 'PENDING' } })
    ]);
    return { pendingRework, approvedQCLogs, pendingQCLogs };
};

/**
 * Get Pending Batches for Cutting Manager
 */
const getPendingBatchesForCutting = async () => {
    return await prisma.batch.findMany({
        where: {
            currentStage: 'CUTTING',
            status: 'PENDING'
        },
        orderBy: { createdAt: 'desc' }
    });
};

/**
 * Get Rework Queue for Manager
 */
const getReworkQueue = async (operatorIds, reworkStages) => {
    return await prisma.reworkRecord.findMany({
        where: {
            operatorUserId: { in: operatorIds },
            approvalStatus: 'PENDING',
            reworkStage: { in: reworkStages }
        },
        include: {
            batch: { select: { batchNumber: true } },
            operator: { select: { fullName: true } }
        }
    });
};

/**
 * Get Active Batches in specific sections
 */
const getActiveBatchesBySections = async (assignedSections) => {
    return await prisma.batch.findMany({
        where: {
            currentStage: { in: assignedSections },
            status: 'IN_PROGRESS'
        }
    });
};

/**
 * Create a new Batch
 */
const createBatch = async (data) => {
    return await prisma.batch.create({ data });
};

/**
 * Find Batch by Number (for validation)
 */
const findBatchByNumber = async (batchNumber) => {
    return await prisma.batch.findUnique({ where: { batchNumber } });
};

/**
 * Find Batch by ID (for cancellation)
 */
const findBatchById = async (id) => {
    return await prisma.batch.findUnique({ where: { id } });
};

/**
 * Check for Packing approval
 */
const findPackingApproval = async (batchId) => {
    return await prisma.productionLog.findFirst({
        where: {
            batchId,
            stage: 'PACKING',
            approvalStatus: 'APPROVED'
        }
    });
};

/**
 * Update Batch status
 */
const updateBatchStatus = async (id, status) => {
    return await prisma.batch.update({
        where: { id },
        data: { status }
    });
};

module.exports = {
    getCounts,
    getActiveBatches,
    getBatchHistory,
    getManagerTeam,
    getProductionLogsForQueue,
    getBatchMetricsForEnrichment,
    getPendingBatchesForCutting,
    getReworkQueue,
    getActiveBatchesBySections,
    createBatch,
    findBatchByNumber,
    findBatchById,
    findPackingApproval,
    updateBatchStatus
};
