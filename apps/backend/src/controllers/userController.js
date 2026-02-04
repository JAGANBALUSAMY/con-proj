const bcrypt = require('bcryptjs');
const prisma = require('../utils/prisma');

/**
 * Admin creates a Manager
 * Requirements:
 * 1. Admin only (handled by middleware)
 * 2. EmployeeCode unique
 * 3. password provided
 * 4. At least one section assigned
 * 5. Auto-verified
 */
const createManager = async (req, res) => {
    try {
        const { employeeCode, password, fullName, sections } = req.body;

        // 1. Basic Validation
        if (!employeeCode || !password || !fullName) {
            return res.status(400).json({ error: 'Please provide employeeCode, password, and fullName' });
        }

        // 2. Section Validation (Manager MUST have >= 1 section)
        if (!sections || !Array.isArray(sections) || sections.length === 0) {
            return res.status(400).json({ error: 'Manager must be assigned to at least one production section' });
        }

        // 3. Check if employeeCode already exists
        const existingUser = await prisma.user.findUnique({
            where: { employeeCode }
        });

        if (existingUser) {
            return res.status(400).json({ error: 'Employee code already in use' });
        }

        // 4. Hash Password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 5. Create Manager with Section Assignments in a Transaction
        const result = await prisma.$transaction(async (tx) => {
            const manager = await tx.user.create({
                data: {
                    employeeCode,
                    fullName,
                    password: hashedPassword,
                    role: 'MANAGER',
                    verificationStatus: 'VERIFIED', // Auto-verified as per constraints
                    createdByUserId: req.user.userId, // Link to the Admin creating it
                }
            });

            // Create section assignments
            const assignments = sections.map(stage => ({
                userId: manager.id,
                stage: stage
            }));

            await tx.sectionAssignment.createMany({
                data: assignments
            });

            return manager;
        });

        // Return created manager (excluding password)
        return res.status(201).json({
            message: 'Manager created successfully',
            user: {
                id: result.id,
                employeeCode: result.employeeCode,
                fullName: result.fullName,
                role: result.role,
                sections: sections
            }
        });

    } catch (error) {
        if (error.code === 'P2002') { // Prisma unique constraint error
            return res.status(400).json({ error: 'Unique constraint violation (Employee Code already exists)' });
        }
        console.error('Create manager error:', error);
        return res.status(500).json({ error: 'Internal server error during manager creation' });
    }
};

module.exports = {
    createManager,
};
