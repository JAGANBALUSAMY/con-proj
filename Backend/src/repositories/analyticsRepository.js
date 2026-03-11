const prisma = require('#infra/database/client');

/**
 * Fetch logs for efficiency analytics
 */
const getApprovedLogsForEfficiency = async (where) => {
    return await prisma.productionLog.findMany({
        where,
        orderBy: { approvedAt: 'desc' },
        select: {
            batchId: true,
            stage: true,
            startTime: true,
            endTime: true,
            approvedAt: true
        }
    });
};

/**
 * Get grouped production log stats for performance
 */
const getProductionLogGroupBy = async (where, by) => {
    return await prisma.productionLog.groupBy({
        by,
        where,
        _sum: {
            quantityIn: true,
            quantityOut: true
        },
        _count: {
            _all: true
        }
    });
};

/**
 * Get grouped defect record stats
 */
const getDefectRecordGroupBy = async (where, by) => {
    return await prisma.defectRecord.groupBy({
        by,
        where,
        _sum: {
            quantity: true
        },
        _count: {
            _all: true
        }
    });
};

/**
 * Find user by ID for hydrating analytics
 */
const findUserById = async (id) => {
    return await prisma.user.findUnique({
        where: { id },
        select: {
            fullName: true,
            employeeCode: true,
            sectionAssignments: { select: { stage: true } }
        }
    });
};

/**
 * Get top performers by throughput
 */
const getTopPerformers = async (where, take = 10) => {
    return await prisma.productionLog.groupBy({
        by: ['operatorUserId'],
        where,
        _sum: {
            quantityOut: true
        },
        _count: {
            _all: true
        },
        orderBy: {
            _sum: {
                quantityOut: 'desc'
            }
        },
        take
    });
};

/**
 * Get count of batches based on filters
 */
const getBatchCount = async (where) => {
    return await prisma.batch.count({ where });
};

module.exports = {
    getApprovedLogsForEfficiency,
    getProductionLogGroupBy,
    getDefectRecordGroupBy,
    findUserById,
    getTopPerformers,
    getBatchCount
};
