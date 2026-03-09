const prisma = require('#infra/database/client');

/**
 * Find user by employee code
 */
const findUserByEmployeeCode = async (employeeCode) => {
    return await prisma.user.findUnique({
        where: { employeeCode }
    });
};

/**
 * Find user by ID with sections
 */
const findUserById = async (id) => {
    return await prisma.user.findUnique({
        where: { id },
        include: { sectionAssignments: true }
    });
};

/**
 * Create user and assignments in transaction
 */
const createUserWithAssignments = async (userData, sectionStages) => {
    return await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
            data: userData
        });

        const assignments = sectionStages.map(stage => ({
            userId: user.id,
            stage: stage
        }));

        await tx.sectionAssignment.createMany({
            data: assignments
        });

        return user;
    });
};

/**
 * Update user basic info
 */
const updateUser = async (id, data) => {
    return await prisma.user.update({
        where: { id },
        data
    });
};

/**
 * Get all users with pagination
 */
const getUsers = async (skip, take, where = {}) => {
    return await prisma.user.findMany({
        where,
        skip,
        take,
        include: {
            sectionAssignments: { select: { stage: true } }
        },
        orderBy: { createdAt: 'desc' }
    });
};

/**
 * Count users
 */
const countUsers = async (where = {}) => {
    return await prisma.user.count({ where });
};

/**
 * Replace sections in transaction
 */
const replaceUserSections = async (userId, sections) => {
    return await prisma.$transaction(async (tx) => {
        await tx.sectionAssignment.deleteMany({
            where: { userId }
        });

        const assignments = sections.map(stage => ({
            userId,
            stage
        }));

        await tx.sectionAssignment.createMany({
            data: assignments
        });
    });
};

module.exports = {
    findUserByEmployeeCode,
    findUserById,
    createUserWithAssignments,
    updateUser,
    getUsers,
    countUsers,
    replaceUserSections
};
