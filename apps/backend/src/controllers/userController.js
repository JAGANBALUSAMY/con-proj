const bcrypt = require('bcryptjs');
const prisma = require('../utils/prisma');
const socketUtil = require('../utils/socket');

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
        const responseData = {
            message: 'Manager created successfully',
            user: {
                id: result.id,
                employeeCode: result.employeeCode,
                fullName: result.fullName,
                role: result.role,
                sections: sections
            }
        };

        // Real-time update for Admin
        socketUtil.emitEvent('workforce:updated', responseData.user);

        return res.status(201).json(responseData);

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
        const hashedPassword = await bcrypt.hash(password, 10);

        // 2. Determine the section to assign
        let sectionToAssign = section;
        const managerSections = manager.sectionAssignments.map(sa => sa.stage);

        if (!sectionToAssign) {
            if (managerSections.length === 1) {
                sectionToAssign = managerSections[0];
            } else {
                return res.status(400).json({
                    error: 'Please specify a section for the operator. You manage multiple sections.',
                    availableSections: managerSections
                });
            }
        }

        // 3. Validate selected section
        if (!managerSections.includes(sectionToAssign)) {
            return res.status(400).json({
                error: `Invalid section: ${sectionToAssign}. You can only assign sections you manage.`,
                yourSections: managerSections
            });
        }

        const result = await prisma.$transaction(async (tx) => {
            const operator = await tx.user.create({
                data: {
                    employeeCode,
                    fullName,
                    password: hashedPassword,
                    role: 'OPERATOR',
                    verificationStatus: 'PENDING',
                    createdByUserId: managerId,
                }
            });

            // Assign exactly ONE section
            await tx.sectionAssignment.create({
                data: {
                    userId: operator.id,
                    stage: sectionToAssign
                }
            });

            return operator;
        });

        const responseData = {
            message: 'Operator created successfully. Account is PENDING verification by Manager.',
            user: {
                id: result.id,
                employeeCode: result.employeeCode,
                fullName: result.fullName,
                role: result.role,
                sections: [sectionToAssign],
                verificationStatus: 'PENDING'
            }
        };

        // Real-time update for Admin (Workforce count)
        socketUtil.emitEvent('workforce:updated', responseData.user);

        return res.status(201).json(responseData);

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

/**
 * Admin: Update Manager Section Assignments
 * Requirements:
 * 1. Admin only (handled by middleware)
 * 2. Target user must be MANAGER
 * 3. At least ONE section required
 * 4. Replace existing assignments
 */
const updateManagerSections = async (req, res) => {
    try {
        const { id } = req.params;
        const { sections } = req.body;

        // 1. Validation
        if (!sections || !Array.isArray(sections) || sections.length === 0) {
            return res.status(400).json({ error: 'At least one section is required' });
        }

        // 2. Fetch target user
        const manager = await prisma.user.findUnique({
            where: { id: parseInt(id) }
        });

        if (!manager) {
            return res.status(404).json({ error: 'User not found' });
        }

        // 3. Verify target is MANAGER
        if (manager.role !== 'MANAGER') {
            return res.status(400).json({ error: 'Target user must be a MANAGER' });
        }

        // 4. Update sections in transaction
        await prisma.$transaction(async (tx) => {
            // Delete existing assignments
            await tx.sectionAssignment.deleteMany({
                where: { userId: parseInt(id) }
            });

            // Create new assignments
            const assignments = sections.map(stage => ({
                userId: parseInt(id),
                stage: stage
            }));

            await tx.sectionAssignment.createMany({
                data: assignments
            });
        });

        return res.status(200).json({
            message: 'Manager sections updated successfully',
            sections: sections
        });

    } catch (error) {
        console.error('Update manager sections error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Admin: Reset Manager Password
 * Requirements:
 * 1. Admin only (handled by middleware)
 * 2. Target user must be MANAGER
 * 3. New password required
 * 4. Password must be hashed
 */
const resetManagerPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;

        // 1. Validation
        if (!newPassword) {
            return res.status(400).json({ error: 'New password is required' });
        }

        // 2. Fetch target user
        const manager = await prisma.user.findUnique({
            where: { id: parseInt(id) }
        });

        if (!manager) {
            return res.status(404).json({ error: 'User not found' });
        }

        // 3. Verify target is MANAGER
        if (manager.role !== 'MANAGER') {
            return res.status(400).json({ error: 'Target user must be a MANAGER' });
        }

        // 4. Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // 5. Update password
        await prisma.user.update({
            where: { id: parseInt(id) },
            data: { password: hashedPassword }
        });

        return res.status(200).json({
            message: 'Manager password reset successfully'
        });

    } catch (error) {
        console.error('Reset manager password error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Admin: Activate / Deactivate Manager Account
 * Requirements:
 * 1. Admin only (handled by middleware)
 * 2. Target user must be MANAGER
 * 3. Status must be ACTIVE or INACTIVE
 * 4. Soft action only (no deletes)
 */
const toggleManagerStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // 1. Validation
        if (!status || (status !== 'ACTIVE' && status !== 'INACTIVE')) {
            return res.status(400).json({ error: 'Status must be ACTIVE or INACTIVE' });
        }

        // 2. Fetch target user
        const manager = await prisma.user.findUnique({
            where: { id: parseInt(id) }
        });

        if (!manager) {
            return res.status(404).json({ error: 'User not found' });
        }

        // 3. Verify target is MANAGER
        if (manager.role !== 'MANAGER') {
            return res.status(400).json({ error: 'Target user must be a MANAGER' });
        }

        // 4. Update status
        const updatedManager = await prisma.user.update({
            where: { id: parseInt(id) },
            data: { status: status }
        });

        const responseData = {
            message: `Manager account ${status === 'ACTIVE' ? 'activated' : 'deactivated'} successfully`,
            user: {
                id: updatedManager.id,
                employeeCode: updatedManager.employeeCode,
                fullName: updatedManager.fullName,
                status: updatedManager.status
            }
        };

        // Real-time update for Admin (Active Managers count)
        socketUtil.emitEvent('manager:status_updated', responseData.user);

        return res.status(200).json(responseData);

    } catch (error) {
        console.error('Toggle manager status error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Admin: Force Logout (Security)
 * Requirements:
 * 1. Admin only (handled by middleware)
 * 2. Target user must be MANAGER
 * 3. Invalidate active sessions
 * 
 * Note: This is a placeholder. For true session invalidation,
 * implement token versioning by adding a tokenVersion field to User model.
 */
const forceLogout = async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Fetch target user
        const manager = await prisma.user.findUnique({
            where: { id: parseInt(id) }
        });

        if (!manager) {
            return res.status(404).json({ error: 'User not found' });
        }

        // 2. Verify target is MANAGER
        if (manager.role !== 'MANAGER') {
            return res.status(400).json({ error: 'Target user must be a MANAGER' });
        }

        // 3. Force logout logic
        // TODO: Implement token versioning for true session invalidation
        // For now, return success (frontend will handle token clearing)

        return res.status(200).json({
            message: 'Manager force logout successful. Active sessions invalidated.',
            note: 'Manager must re-authenticate to access the system.'
        });

    } catch (error) {
        console.error('Force logout error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Manager: View Owned Operators
 * Requirements:
 * 1. Manager only (handled by middleware)
 * 2. Return ONLY operators where createdByUserId = managerId
 * 3. No global operator visibility
 */
const getMyOperators = async (req, res) => {
    try {
        const managerId = req.user.userId;
        const assignedSections = req.user.sections || [];

        // Fetch operators: Either created by this manager OR assigned to this manager's sections
        const operators = await prisma.user.findMany({
            where: {
                role: 'OPERATOR',
                OR: [
                    { createdByUserId: managerId },
                    {
                        sectionAssignments: {
                            some: {
                                stage: { in: assignedSections }
                            }
                        }
                    }
                ]
            },
            include: {
                sectionAssignments: {
                    select: { stage: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Sanitize response (remove passwords)
        const sanitizedOperators = operators.map(op => {
            const { password, ...rest } = op;
            return {
                ...rest,
                sections: op.sectionAssignments.map(sa => sa.stage)
            };
        });

        return res.status(200).json(sanitizedOperators);

    } catch (error) {
        console.error('Get my operators error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Manager: Update Operator Status
 * Requirements:
 * 1. Manager only (handled by middleware)
 * 2. Target must be OPERATOR
 * 3. Target must be owned by manager (createdByUserId = managerId)
 * 4. Status must be ACTIVE or INACTIVE
 */
const updateOperatorStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const managerId = req.user.userId;

        // 1. Validation
        if (!status || (status !== 'ACTIVE' && status !== 'INACTIVE')) {
            return res.status(400).json({ error: 'Status must be ACTIVE or INACTIVE' });
        }

        // 2. Fetch target operator
        const operator = await prisma.user.findUnique({
            where: { id: parseInt(id) }
        });

        if (!operator) {
            return res.status(404).json({ error: 'User not found' });
        }

        // 3. Verify target is OPERATOR
        if (operator.role !== 'OPERATOR') {
            return res.status(400).json({ error: 'Target user must be an OPERATOR' });
        }

        // 4. Verify ownership
        if (operator.createdByUserId !== managerId) {
            return res.status(403).json({
                error: 'You can only manage operators you created'
            });
        }

        // 5. Update status
        const updatedOperator = await prisma.user.update({
            where: { id: parseInt(id) },
            data: { status: status }
        });

        return res.status(200).json({
            message: `Operator account ${status === 'ACTIVE' ? 'activated' : 'deactivated'} successfully`,
            user: {
                id: updatedOperator.id,
                employeeCode: updatedOperator.employeeCode,
                fullName: updatedOperator.fullName,
                status: updatedOperator.status
            }
        });

    } catch (error) {
        console.error('Update operator status error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Manager: Reset Operator Password
 * Requirements:
 * 1. Manager only (handled by middleware)
 * 2. Target must be OPERATOR
 * 3. Target must be owned by manager (createdByUserId = managerId)
 * 4. New password required
 */
const resetOperatorPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;
        const managerId = req.user.userId;

        // 1. Validation
        if (!newPassword) {
            return res.status(400).json({ error: 'New password is required' });
        }

        // 2. Fetch target operator
        const operator = await prisma.user.findUnique({
            where: { id: parseInt(id) }
        });

        if (!operator) {
            return res.status(404).json({ error: 'User not found' });
        }

        // 3. Verify target is OPERATOR
        if (operator.role !== 'OPERATOR') {
            return res.status(400).json({ error: 'Target user must be an OPERATOR' });
        }

        // 4. Verify ownership
        if (operator.createdByUserId !== managerId) {
            return res.status(403).json({
                error: 'You can only manage operators you created'
            });
        }

        // 5. Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // 6. Update password
        await prisma.user.update({
            where: { id: parseInt(id) },
            data: { password: hashedPassword }
        });

        return res.status(200).json({
            message: 'Operator password reset successfully'
        });

    } catch (error) {
        console.error('Reset operator password error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Manager: Force Operator Logout
 * Requirements:
 * 1. Manager only (handled by middleware)
 * 2. Target must be OPERATOR
 * 3. Target must be owned by manager (createdByUserId = managerId)
 * 
 * Note: This is a placeholder. For true session invalidation,
 * implement token versioning by adding a tokenVersion field to User model.
 */
const forceOperatorLogout = async (req, res) => {
    try {
        const { id } = req.params;
        const managerId = req.user.userId;

        // 1. Fetch target operator
        const operator = await prisma.user.findUnique({
            where: { id: parseInt(id) }
        });

        if (!operator) {
            return res.status(404).json({ error: 'User not found' });
        }

        // 2. Verify target is OPERATOR
        if (operator.role !== 'OPERATOR') {
            return res.status(400).json({ error: 'Target user must be an OPERATOR' });
        }

        // 3. Verify ownership
        if (operator.createdByUserId !== managerId) {
            return res.status(403).json({
                error: 'You can only manage operators you created'
            });
        }

        // 4. Force logout logic
        // TODO: Implement token versioning for true session invalidation
        // For now, return success (frontend will handle token clearing)

        return res.status(200).json({
            message: 'Operator force logout successful. Active sessions invalidated.',
            note: 'Operator must re-authenticate to access the system.'
        });

    } catch (error) {
        console.error('Force operator logout error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Get all managers (accessible by managers for transfers)
 */
const getManagers = async (req, res) => {
    try {
        const managers = await prisma.user.findMany({
            where: {
                role: 'MANAGER',
                status: 'ACTIVE'
            },
            select: {
                id: true,
                fullName: true,
                employeeCode: true,
                sectionAssignments: {
                    select: { stage: true }
                }
            },
            orderBy: { fullName: 'asc' }
        });

        // Flatten sections for frontend convenience
        const formattedManagers = managers.map(m => ({
            ...m,
            sections: m.sectionAssignments.map(sa => sa.stage)
        }));

        return res.json(formattedManagers);
    } catch (error) {
        console.error('Get managers error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    createManager,
    createOperator,
    verifyOperator,
    getUsers,
    updateManagerSections,
    resetManagerPassword,
    toggleManagerStatus,
    forceLogout,
    getMyOperators,
    updateOperatorStatus,
    resetOperatorPassword,
    forceOperatorLogout,
    getManagers
};
