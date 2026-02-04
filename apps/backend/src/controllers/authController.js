const bcrypt = require('bcryptjs');
const prisma = require('../utils/prisma');
const { signToken } = require('../utils/jwt');

/**
 * Login using employeeCode and password
 * Validates: Existence, status (ACTIVE), and verificationStatus (VERIFIED)
 */
const login = async (req, res) => {
    try {
        const { employeeCode, password } = req.body;

        if (!employeeCode || !password) {
            return res.status(400).json({ error: 'Please provide employee code and password' });
        }

        // Find user with section assignments
        const user = await prisma.user.findUnique({
            where: { employeeCode },
            include: {
                sectionAssignments: {
                    select: {
                        stage: true,
                    },
                },
            },
        });

        // 1. Validate existence and password
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Invalid employee code or password' });
        }

        // 2. Validate Status (ACTIVE)
        if (user.status !== 'ACTIVE') {
            return res.status(403).json({ error: 'Account is inactive. Contact Administrator.' });
        }

        // 3. Validate Verification (VERIFIED)
        // CRITICAL: Deny login for PENDING or REJECTED users as per CONSTRAINTS.md
        if (user.verificationStatus !== 'VERIFIED') {
            return res.status(403).json({
                error: `Account status is ${user.verificationStatus}. Login denied until verified by Manager.`
            });
        }

        // Prepare JWT Payload
        const sections = user.sectionAssignments.map(sa => sa.stage);

        const token = signToken({
            userId: user.id,
            role: user.role,
            sections: sections,
        });

        // Respond with user context (minus password)
        return res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                fullName: user.fullName,
                employeeCode: user.employeeCode,
                role: user.role,
                sections: sections,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Internal server error during login' });
    }
};

module.exports = {
    login,
};
