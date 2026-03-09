const userRepository = require('#backend/repositories/userRepository');
const bcrypt = require('bcryptjs');
const socketUtil = require('#backend/utils/socket');
const { SOCKET_EVENTS, PAGINATION } = require('#backend/utils/constants');

/**
 * Logic for creating a manager
 */
const createManager = async (data, adminId) => {
    const { employeeCode, password, fullName, sections } = data;

    if (!sections || !Array.isArray(sections) || sections.length === 0) {
        throw new Error('Manager must be assigned to at least one production section');
    }

    const existing = await userRepository.findUserByEmployeeCode(employeeCode);
    if (existing) throw new Error('Employee code already in use');

    const hashedPassword = await bcrypt.hash(password, 10);

    const manager = await userRepository.createUserWithAssignments({
        employeeCode,
        fullName,
        password: hashedPassword,
        role: 'MANAGER',
        verificationStatus: 'VERIFIED',
        createdByUserId: adminId
    }, sections);

    socketUtil.emitEvent(SOCKET_EVENTS.PRODUCTION.ALERT, {
        type: 'INFO',
        message: `New Manager created: ${fullName}`
    });

    return { manager, sections };
};

/**
 * Logic for creating an operator
 */
const createOperator = async (data, managerId) => {
    const { employeeCode, password, fullName, section } = data;

    const manager = await userRepository.findUserById(managerId);
    if (!manager || manager.role !== 'MANAGER') throw new Error('Only Managers can create operators');

    const managerSections = manager.sectionAssignments.map(sa => sa.stage);
    if (managerSections.length === 0) throw new Error('Manager has no assigned sections to inherit from');

    let sectionToAssign = section;
    if (!sectionToAssign) {
        if (managerSections.length === 1) sectionToAssign = managerSections[0];
        else throw new Error('Please specify a section for the operator.');
    }

    if (!managerSections.includes(sectionToAssign)) throw new Error('Invalid section selection.');

    const existing = await userRepository.findUserByEmployeeCode(employeeCode);
    if (existing) throw new Error('Employee code already in use');

    const hashedPassword = await bcrypt.hash(password, 10);

    const operator = await userRepository.createUserWithAssignments({
        employeeCode,
        fullName,
        password: hashedPassword,
        role: 'OPERATOR',
        verificationStatus: 'PENDING',
        createdByUserId: managerId
    }, [sectionToAssign]);

    socketUtil.emitEvent(SOCKET_EVENTS.PRODUCTION.ALERT, {
        type: 'INFO',
        message: `New Operator created: ${fullName}`
    });

    return { operator, section: sectionToAssign };
};

/**
 * Logic for verifying an operator
 */
const verifyOperator = async (id, managerId, userRole) => {
    const operator = await userRepository.findUserById(parseInt(id));
    if (!operator) throw new Error('Operator not found');

    if (userRole !== 'ADMIN' && operator.createdByUserId !== managerId) {
        throw new Error('Unauthorized verification');
    }

    if (operator.verificationStatus !== 'PENDING') throw new Error(`User is already ${operator.verificationStatus}`);

    return await userRepository.updateUser(operator.id, {
        verificationStatus: 'VERIFIED',
        verifiedByUserId: managerId,
        verifiedAt: new Date()
    });
};

/**
 * Get all users
 */
const getUsers = async (query) => {
    const page = parseInt(query.page) || PAGINATION.DEFAULT_PAGE;
    const limit = parseInt(query.limit) || PAGINATION.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
        userRepository.getUsers(skip, limit),
        userRepository.countUsers()
    ]);

    const sanitized = users.map(u => {
        const { password, ...rest } = u;
        return { ...rest, sections: u.sectionAssignments.map(sa => sa.stage) };
    });

    return {
        users: sanitized,
        pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    };
};

/**
 * Update Manager Sections
 */
const updateManagerSections = async (id, sections) => {
    if (!sections || !Array.isArray(sections) || sections.length === 0) {
        throw new Error('At least one section is required');
    }

    const user = await userRepository.findUserById(parseInt(id));
    if (!user) throw new Error('User not found');
    if (user.role !== 'MANAGER' && user.role !== 'OPERATOR') throw new Error('Invalid target role');

    await userRepository.replaceUserSections(user.id, sections);
    return sections;
};

/**
 * Reset User Password
 */
const resetPassword = async (id, newPassword, actorRole) => {
    const user = await userRepository.findUserById(parseInt(id));
    if (!user) throw new Error('User not found');

    // Logic for role constraints can be added here

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await userRepository.updateUser(user.id, { password: hashedPassword });
};

/**
 * Toggle User Status
 */
const toggleStatus = async (id, status) => {
    if (!['ACTIVE', 'INACTIVE'].includes(status)) throw new Error('Invalid status');

    const user = await userRepository.findUserById(parseInt(id));
    if (!user) throw new Error('User not found');

    const updated = await userRepository.updateUser(user.id, { status });

    if (user.role === 'MANAGER') {
        socketUtil.emitEvent('manager:status_updated', {
            id: updated.id,
            employeeCode: updated.employeeCode,
            fullName: updated.fullName,
            status: updated.status
        });
    }

    return updated;
};

/**
 * Get My Operators (for Manager)
 */
const getMyOperators = async (managerId, assignedSections, query) => {
    const page = parseInt(query.page) || PAGINATION.DEFAULT_PAGE;
    const limit = parseInt(query.limit) || PAGINATION.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const where = {
        role: 'OPERATOR',
        OR: [
            { createdByUserId: managerId },
            {
                sectionAssignments: {
                    some: { stage: { in: assignedSections } }
                }
            }
        ]
    };

    const [operators, total] = await Promise.all([
        userRepository.getUsers(skip, limit, where),
        userRepository.countUsers(where)
    ]);

    const sanitized = operators.map(op => {
        const { password, ...rest } = op;
        return { ...rest, sections: op.sectionAssignments.map(sa => sa.stage) };
    });

    return {
        operators: sanitized,
        pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    };
};

module.exports = {
    createManager,
    createOperator,
    verifyOperator,
    getUsers,
    updateManagerSections,
    resetPassword,
    toggleStatus,
    getMyOperators
};
