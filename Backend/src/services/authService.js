const bcrypt = require('bcryptjs');
const authRepository = require('#backend/repositories/authRepository');
const { signToken } = require('#backend/utils/jwt');

/**
 * Authenticate user and return token + user data
 */
const authenticate = async (employeeCode, password) => {
    const normalizedCode = employeeCode.trim().toUpperCase();
    const user = await authRepository.findUserByEmployeeCode(normalizedCode);

    if (!user) {
        throw new Error('Invalid employee code or password');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw new Error('Invalid employee code or password');
    }

    if (user.status !== 'ACTIVE') {
        throw new Error('Account is inactive. Contact Administrator.');
    }

    if (user.verificationStatus !== 'VERIFIED') {
        throw new Error(`Account status is ${user.verificationStatus}. Login denied until verified by Manager.`);
    }

    const sections = user.sectionAssignments.map(sa => sa.stage);

    if (user.role !== 'ADMIN' && sections.length === 0) {
        throw new Error('No production sections assigned. Contact Administrator.');
    }

    const token = signToken({
        userId: user.id,
        role: user.role,
        sections: sections,
    });

    return {
        token,
        user: {
            id: user.id,
            fullName: user.fullName,
            employeeCode: user.employeeCode,
            role: user.role,
            sections: sections,
        },
    };
};

module.exports = {
    authenticate,
};
