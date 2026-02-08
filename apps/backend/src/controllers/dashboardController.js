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

        // 1. Fetch Operators created by this Manager
        let team = [];
        try {
            team = await prisma.user.findMany({
                where: { createdByUserId: managerId, role: 'OPERATOR' },
                select: { id: true, fullName: true, employeeCode: true, verificationStatus: true }
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

        // 3. Fetch Rework Approval Queue
        let reworkQueue = [];
        try {
            reworkQueue = await prisma.reworkRecord.findMany({
                where: {
                    operatorUserId: { in: operatorIds },
                    approvalStatus: 'PENDING'
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

module.exports = {
    getAdminStats,
    getManagerDashboard,
    getOperatorDashboard
};
