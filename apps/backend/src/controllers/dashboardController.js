const prisma = require('../utils/prisma');

/**
 * ADMIN: Global factory overview
 */
const getAdminStats = async (req, res) => {
    try {
        const [userCount, managerCount, operatorCount, activeBatchCount] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { role: 'MANAGER' } }),
            prisma.user.count({ where: { role: 'OPERATOR' } }),
            prisma.batch.count({ where: { status: 'IN_PROGRESS' } })
        ]);

        return res.status(200).json({
            stats: {
                totalUsers: userCount,
                managers: managerCount,
                operators: operatorCount,
                activeBatches: activeBatchCount
            }
        });
    } catch (error) {
        console.error('Admin Stats Error:', error);
        return res.status(500).json({ error: 'Failed to fetch admin stats' });
    }
};

/**
 * MANAGER: Sections, Approval Queue, and Team
 */
const getManagerDashboard = async (req, res) => {
    try {
        const managerId = req.user.userId;
        const assignedSections = req.user.sections || [];

        console.log(`[DASHBOARD DEBUG] Fetching dashboard for ${req.user.employeeCode} (ID: ${managerId})`);
        console.log(`[DASHBOARD DEBUG] Assigned Sections: ${assignedSections}`);

        // 1. Fetch Operators: Either created by this Manager OR assigned to this Manager's sections
        let team = [];
        try {
            team = await prisma.user.findMany({
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
                select: {
                    id: true,
                    fullName: true,
                    employeeCode: true,
                    verificationStatus: true,
                    sectionAssignments: { select: { stage: true } }
                }
            });
        } catch (e) {
            console.error('[DASHBOARD ERROR] Team Fetch Failed:', e.message);
            throw new Error(`Team Fetch Failed: ${e.message}`);
        }

        const operatorIds = team.map(op => op.id);

        // 2. Fetch Approval Queue (Pending Production Logs from OWNED operators)
        let approvalQueue = [];
        try {
            approvalQueue = await prisma.productionLog.findMany({
                where: {
                    operatorUserId: { in: operatorIds },
                    approvalStatus: 'PENDING',
                    stage: { in: assignedSections }
                },
                include: {
                    batch: { select: { batchNumber: true, briefTypeName: true } },
                    operator: { select: { fullName: true } }
                },
                orderBy: { createdAt: 'desc' }
            });
        } catch (e) {
            console.error('[DASHBOARD ERROR] Approval Queue Fetch Failed:', e.message);
            throw new Error(`Approval Queue Fetch Failed: ${e.message}`);
        }

        // 2b. If Manager has 'CUTTING', fetch PENDING Batches (Batch Start Approval)
        if (assignedSections.includes('CUTTING')) {
            try {
                const pendingBatches = await prisma.batch.findMany({
                    where: {
                        currentStage: 'CUTTING',
                        status: 'PENDING'
                    },
                    orderBy: { createdAt: 'desc' }
                });

                // Map to match Approval Queue structure (generic item)
                const batchItems = pendingBatches.map(b => ({
                    id: b.id, // ID
                    type: 'BATCH', // Flag for frontend
                    batch: { batchNumber: b.batchNumber, briefTypeName: b.briefTypeName },
                    operator: { fullName: 'System / Planning' }, // No operator yet
                    stage: 'CUTTING',
                    quantityIn: b.totalQuantity,
                    createdAt: b.createdAt
                }));

                // Combine queues
                approvalQueue = [...batchItems, ...approvalQueue];

            } catch (e) {
                console.error('[DASHBOARD ERROR] Pending Batches Fetch Failed:', e.message);
            }
        }

        // 3. Fetch Rework Approval Queue
        let reworkQueue = [];
        try {
            // Filter to only stages that exist in ReworkStage enum (CUTTING, STITCHING)
            const validReworkStages = ['CUTTING', 'STITCHING'];
            const reworkQueryStages = assignedSections.filter(s => validReworkStages.includes(s));

            reworkQueue = await prisma.reworkRecord.findMany({
                where: {
                    operatorUserId: { in: operatorIds },
                    approvalStatus: 'PENDING',
                    reworkStage: { in: reworkQueryStages }
                },
                include: {
                    batch: { select: { batchNumber: true } },
                    operator: { select: { fullName: true } }
                }
            });
        } catch (e) {
            console.error('[DASHBOARD ERROR] Rework Queue Fetch Failed:', e.message);
            throw new Error(`Rework Queue Fetch Failed: ${e.message}`);
        }

        // 4. Active batches in their sections
        let activeBatches = [];
        try {
            activeBatches = await prisma.batch.findMany({
                where: {
                    currentStage: { in: assignedSections },
                    status: 'IN_PROGRESS'
                }
            });
        } catch (e) {
            console.error('[DASHBOARD ERROR] Active Batches Fetch Failed:', e.message);
            throw new Error(`Active Batches Fetch Failed: ${e.message}`);
        }

        return res.status(200).json({
            sections: assignedSections,
            team,
            approvalQueue,
            reworkQueue,
            activeBatches
        });
    } catch (error) {
        console.error('Manager Dashboard Error:', error.message);
        return res.status(500).json({
            error: 'Failed to fetch manager dashboard data',
            details: error.message
        });
    }
};

/**
 * OPERATOR: Assigned station work
 */
const getOperatorDashboard = async (req, res) => {
    try {
        const operatorId = req.user.userId;
        const assignedSections = req.user.sections; // Usually one for Operator

        // 1. Fetch batches currently in their assigned section
        const batches = await prisma.batch.findMany({
            where: {
                currentStage: { in: assignedSections },
                status: { in: ['PENDING', 'IN_PROGRESS'] }
            }
        });

        // 2. Personal recent activity
        const recentLogs = await prisma.productionLog.findMany({
            where: { operatorUserId: operatorId },
            include: {
                batch: { select: { batchNumber: true } }
            },
            take: 10,
            orderBy: { createdAt: 'desc' }
        });

        return res.status(200).json({
            section: assignedSections[0], // Operators usually have one primary station
            batches,
            recentLogs
        });
    } catch (error) {
        console.error('Operator Dashboard Error:', error);
        return res.status(500).json({ error: 'Failed to fetch operator dashboard data' });
    }
};

/**
 * CREATE BATCH (ADMIN or MANAGER)
 * Cloth Intake - Planning Action
 * 
 * Rules:
 * - ADMIN can create batches for any section
 * - MANAGER can create batches ONLY if CUTTING is in their assigned sections
 * - OPERATOR must NEVER be allowed
 * - No approval workflow (this is planning, not production work)
 * - Initial values auto-set: currentStage=CUTTING, status=PENDING, quantities=0
 */
const createBatch = async (req, res) => {
    try {
        const userId = req.user.userId;
        const userRole = req.user.role;
        const { batchNumber, briefTypeName, totalQuantity } = req.body;

        // 1. Validate required fields
        if (!batchNumber || !briefTypeName || !totalQuantity) {
            return res.status(400).json({ error: 'batchNumber, briefTypeName, and totalQuantity are required' });
        }

        // 2. Validate quantity is positive
        if (totalQuantity <= 0) {
            return res.status(400).json({ error: 'Total quantity must be greater than 0' });
        }

        // 3. Check for duplicate batch number
        const existingBatch = await prisma.batch.findUnique({
            where: { batchNumber }
        });

        if (existingBatch) {
            return res.status(400).json({ error: 'Batch number already exists' });
        }

        // 4. Section isolation for MANAGER
        // Batches always start at CUTTING stage
        // MANAGER can only create batches if CUTTING is in their assigned sections
        if (userRole === 'MANAGER') {
            const assignedSections = req.user.sections || [];

            if (!assignedSections.includes('CUTTING')) {
                return res.status(403).json({
                    error: 'Access denied: CUTTING stage is not in your assigned sections',
                    yourSections: assignedSections,
                    requiredSection: 'CUTTING'
                });
            }
        }

        // 5. Create batch with initial values
        const batch = await prisma.batch.create({
            data: {
                batchNumber,
                briefTypeName,
                totalQuantity: parseInt(totalQuantity),
                // Initial values (auto-set)
                currentStage: 'CUTTING',
                status: 'PENDING',
                usableQuantity: 0,
                defectiveQuantity: 0,
                scrappedQuantity: 0
            }
        });

        return res.status(201).json({
            message: 'Batch created successfully',
            batch
        });

    } catch (error) {
        console.error('Create batch error:', error);
        return res.status(500).json({ error: 'Failed to create batch' });
    }
};

module.exports = {
    getAdminStats,
    getManagerDashboard,
    getOperatorDashboard,
    createBatch
};
