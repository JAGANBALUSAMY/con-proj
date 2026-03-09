const prisma = require('#infra/database/client');

/**
 * Find operator by ID with sections
 */
const findOperatorById = async (id) => {
    return await prisma.user.findUnique({
        where: { id },
        include: { sectionAssignments: true }
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
 * Find pending transfer request for operator
 */
const findPendingTransfer = async (operatorId) => {
    return await prisma.sectionTransferRequest.findFirst({
        where: {
            operatorId,
            status: 'PENDING'
        }
    });
};

/**
 * Find existing approved log for batch at stage
 */
const findApprovedLog = async (batchId, stage) => {
    return await prisma.productionLog.findFirst({
        where: {
            batchId,
            stage,
            approvalStatus: 'APPROVED'
        }
    });
};

/**
 * Find machine by ID
 */
const findMachineById = async (id) => {
    return await prisma.machine.findUnique({
        where: { id }
    });
};

/**
 * Check machine time overlap
 */
const findMachineOverlap = async (machineId, start, end) => {
    return await prisma.productionLog.findFirst({
        where: {
            machineId,
            AND: [
                { startTime: { lt: end } },
                { endTime: { gt: start } }
            ]
        }
    });
};

/**
 * Check operator time overlap (Log)
 */
const findOperatorOverlap = async (operatorId, start, end) => {
    return await prisma.productionLog.findFirst({
        where: {
            operatorUserId: operatorId,
            AND: [
                { startTime: { lt: end } },
                { endTime: { gt: start } }
            ]
        }
    });
};

/**
 * Check operator time overlap (Rework)
 */
const findReworkOverlap = async (operatorId, start, end) => {
    return await prisma.reworkRecord.findFirst({
        where: {
            operatorUserId: operatorId,
            AND: [
                { startTime: { lt: end } },
                { endTime: { gt: start } }
            ]
        }
    });
};

/**
 * Create production log
 */
const createProductionLog = async (data) => {
    return await prisma.productionLog.create({
        data,
        include: {
            batch: { select: { batchNumber: true, briefTypeName: true } },
            operator: { select: { fullName: true, employeeCode: true } },
            machine: { select: { machineCode: true } }
        }
    });
};

module.exports = {
    findOperatorById,
    findBatchById,
    findPendingTransfer,
    findApprovedLog,
    findMachineById,
    findMachineOverlap,
    findOperatorOverlap,
    findReworkOverlap,
    createProductionLog
};
