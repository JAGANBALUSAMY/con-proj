const prisma = require('#infra/database/client');

/**
 * Find transfer request with relations
 */
const findTransferWithOperator = async (id) => {
    return await prisma.sectionTransferRequest.findUnique({
        where: { id },
        include: {
            operator: { include: { sectionAssignments: true } }
        }
    });
};

/**
 * Find pending transfer for operator
 */
const findPendingTransferByOperator = async (operatorId) => {
    return await prisma.sectionTransferRequest.findFirst({
        where: {
            operatorId,
            status: 'PENDING'
        }
    });
};

/**
 * Create transfer request
 */
const createTransferRequest = async (data) => {
    return await prisma.sectionTransferRequest.create({
        data,
        include: {
            operator: { select: { id: true, fullName: true, employeeCode: true } },
            requester: { select: { id: true, fullName: true, employeeCode: true } },
            targetManager: { select: { id: true, fullName: true, employeeCode: true } }
        }
    });
};

/**
 * Find many transfer requests
 */
const findTransfers = async (where) => {
    return await prisma.sectionTransferRequest.findMany({
        where,
        include: {
            operator: { select: { id: true, fullName: true, employeeCode: true } },
            requester: { select: { id: true, fullName: true, employeeCode: true } },
            targetManager: { select: { id: true, fullName: true, employeeCode: true } },
            resolver: { select: { id: true, fullName: true, employeeCode: true } }
        },
        orderBy: { requestedAt: 'desc' }
    });
};

/**
 * Transaction: Accept Transfer
 */
const acceptTransferTransaction = async ({ requestId, managerId, operatorId, toSection }) => {
    return await prisma.$transaction(async (tx) => {
        const current = await tx.sectionTransferRequest.findUnique({
            where: { id: requestId },
            select: { status: true }
        });

        if (!current || current.status !== 'PENDING') {
            throw new Error('Transfer request no longer pending');
        }

        await tx.sectionAssignment.deleteMany({ where: { userId: operatorId } });
        await tx.sectionAssignment.create({ data: { userId: operatorId, stage: toSection } });

        return await tx.sectionTransferRequest.update({
            where: { id: requestId },
            data: {
                status: 'ACCEPTED',
                resolvedAt: new Date(),
                resolvedBy: managerId
            }
        });
    });
};

/**
 * Simple Update
 */
const updateTransfer = async (id, data) => {
    return await prisma.sectionTransferRequest.update({
        where: { id },
        data,
        include: {
            operator: { select: { id: true, fullName: true, employeeCode: true } },
            requester: { select: { id: true, fullName: true, employeeCode: true } },
            targetManager: { select: { id: true, fullName: true, employeeCode: true } },
            resolver: { select: { id: true, fullName: true, employeeCode: true } }
        }
    });
};

module.exports = {
    findTransferWithOperator,
    findPendingTransferByOperator,
    createTransferRequest,
    findTransfers,
    acceptTransferTransaction,
    updateTransfer
};
