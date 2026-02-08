const bcrypt = require('bcryptjs');
const prisma = require('../utils/prisma');
const { signToken } = require('../utils/jwt');

/**
 * Login using employeeCode and password
 * Validates: Existence, status (ACTIVE), and verificationStatus (VERIFIED)
 */
const login = async (req, res) => {
    try {
        let { employeeCode, password } = req.body;

        if (!employeeCode || !password) {
            return res.status(400).json({ error: 'Please provide employee code and password' });
        }

        // 4. Normalize employeeCode (trim + uppercase)
        employeeCode = employeeCode.trim().toUpperCase();

        // 1. Log fetched user for MANAGER (audit)
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

        console.log(`[AUTH DEBUG] Fetching user: ${employeeCode} | Found: ${!!user}`);

        if (!user) {
            console.log(`Login failure: User ${employeeCode} not found`);
            return res.status(401).json({ error: 'Invalid employee code or password' });
        }

        // 2 & 3. Log bcrypt.compare result and verify if hashed
        console.log(`[AUTH DEBUG] Password is hashed: ${user.password.startsWith('$2a$')}`);
        const isMatch = await bcrypt.compare(password, user.password);
        console.log(`[AUTH DEBUG] Password match for ${employeeCode}: ${isMatch}`);

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid employee code or password' });
        }

        // 6. Verify status === 'ACTIVE'
        console.log(`[AUTH DEBUG] User status: ${user.status}`);
        if (user.status !== 'ACTIVE') {
            return res.status(403).json({ error: 'Account is inactive. Contact Administrator.' });
        }

        // 5. Verify verificationStatus === 'VERIFIED'
        console.log(`[AUTH DEBUG] Verification status: ${user.verificationStatus}`);
        if (user.verificationStatus !== 'VERIFIED') {
            return res.status(403).json({
                error: `Account status is ${user.verificationStatus}. Login denied until verified by Manager.`
            });
        }

        // 7. Verify manager has ≥1 SectionAssignment
        const sections = user.sectionAssignments.map(sa => sa.stage);
        console.log(`[AUTH DEBUG] Sections: ${sections.length}`);

        // Only block if role is not ADMIN (Admins are global)
        if (user.role !== 'ADMIN' && sections.length === 0) {
            console.log(`[AUTH DEBUG] Blocking login: ${user.role} has no sections`);
            return res.status(403).json({ error: 'No production sections assigned. Contact Administrator.' });
        }

        // Prepare JWT Payload
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
