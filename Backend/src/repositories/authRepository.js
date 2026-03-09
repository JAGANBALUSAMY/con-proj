const prisma = require('#infra/database/client');

/**
 * Find user by employee code with section assignments
 */
const findUserByEmployeeCode = async (employeeCode) => {
    return await prisma.user.findUnique({
        where: { employeeCode },
        include: {
            sectionAssignments: {
                select: {
                    stage: true,
                },
            },
        },
    });
};

module.exports = {
    findUserByEmployeeCode,
};
