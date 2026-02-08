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

/**
 * Manager creates an Operator
 * Requirements:
 * 1. Manager only (handled by middleware)
 * 2. EmployeeCode unique
 * 3. password provided
 * 4. Inherits ALL sections from the creating Manager
 * 5. Status = PENDING
 */
const createOperator = async (req, res) => {
    try {
        const { employeeCode, password, fullName } = req.body;
        const managerId = req.user.userId;

        // 1. Basic Validation
        if (!employeeCode || !password || !fullName) {
            return res.status(400).json({ error: 'Please provide employeeCode, password, and fullName' });
        }

        // 2. Fetch Manager's Sections (Inheritance)
        const manager = await prisma.user.findUnique({
            where: { id: managerId },
            include: {
                sectionAssignments: true
            }
        });

        if (!manager || manager.role !== 'MANAGER') {
            return res.status(403).json({ error: 'Only Managers can create operators' });
        }

        if (manager.sectionAssignments.length === 0) {
            return res.status(400).json({ error: 'Manager has no assigned sections to inherit from' });
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

        // 5. Create Operator with Inherited Sections in a Transaction
        const result = await prisma.$transaction(async (tx) => {
            const operator = await tx.user.create({
                data: {
                    employeeCode,
                    fullName,
                    password: hashedPassword,
                    role: 'OPERATOR',
                    verificationStatus: 'PENDING', // Operators start as PENDING as per constraints
                    createdByUserId: managerId, // Explicit ownership
                }
            });

            // Inherit all stages from the manager
            const assignments = manager.sectionAssignments.map(sa => ({
                userId: operator.id,
                stage: sa.stage
            }));

            await tx.sectionAssignment.createMany({
                data: assignments
            });

            return operator;
        });

        return res.status(201).json({
            message: 'Operator created successfully. Account is PENDING verification by Manager.',
            user: {
                id: result.id,
                employeeCode: result.employeeCode,
                fullName: result.fullName,
                role: result.role,
                sections: manager.sectionAssignments.map(sa => sa.stage),
                verificationStatus: 'PENDING'
            }
        });

    } catch (error) {
        console.error('Create operator error:', error);
        return res.status(500).json({ error: 'Internal server error during operator creation' });
    }
};

/**
 * Manager verifies an Operator
 * Requirements:
 * 1. Manager only (handled by middleware)
 * 2. Only the Manager who created the operator can verify it
 * 3. Update status to VERIFIED, record who and when
 */
const verifyOperator = async (req, res) => {
    try {
        const { id } = req.params;
        const managerId = req.user.userId;

        // 1. Fetch the user to be verified
        const operator = await prisma.user.findUnique({
            where: { id: parseInt(id) }
        });

        if (!operator) {
            return res.status(404).json({ error: 'Operator not found' });
        }

        // 2. Hierarchy Check: Only the creating manager can verify
        if (operator.createdByUserId !== managerId) {
            return res.status(403).json({
                error: 'Unauthorized: Only the Manager who created this Operator can verify them'
            });
        }

        // 3. Status Check: Only PENDING users can be verified
        if (operator.verificationStatus !== 'PENDING') {
            return res.status(400).json({
                error: `User is already ${operator.verificationStatus}`
            });
        }

        // 4. Update Operator
        const updatedOperator = await prisma.user.update({
            where: { id: parseInt(id) },
            data: {
                verificationStatus: 'VERIFIED',
                verifiedByUserId: managerId,
                verifiedAt: new Date()
            }
        });

        return res.status(200).json({
            message: 'Operator verified successfully. They can now log in.',
            user: {
                id: updatedOperator.id,
                employeeCode: updatedOperator.employeeCode,
                fullName: updatedOperator.fullName,
                verificationStatus: updatedOperator.verificationStatus,
                verifiedAt: updatedOperator.verifiedAt
            }
        });

    } catch (error) {
        console.error('Verify operator error:', error);
        return res.status(500).json({ error: 'Internal server error during verification' });
    }
};

/**
 * Admin: Get all users
 */
const getUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            include: {
                sectionAssignments: { select: { stage: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Remove passwords
        const sanitizedUsers = users.map(u => {
            const { password, ...rest } = u;
            return {
                ...rest,
                sections: u.sectionAssignments.map(sa => sa.stage)
            };
        });

        return res.status(200).json(sanitizedUsers);
    } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch users' });
    }
};

module.exports = {
    createManager,
    createOperator,
    verifyOperator,
    getUsers,
};
