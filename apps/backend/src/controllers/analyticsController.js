const prisma = require('../utils/prisma');

/**
 * Get Production Efficiency
 * Efficiency = Avg(endTime - startTime) for APPROVED logs
 * Grouped by Stage
 * Excludes logs with endTime <= startTime or null
 */
const getProductionEfficiency = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const managerId = req.user.userId;
        const isManager = req.user.role === 'MANAGER';

        const dateFilter = {};
        if (startDate) dateFilter.gte = new Date(startDate);
        if (endDate) dateFilter.lte = new Date(endDate);

        const where = {
            approvalStatus: 'APPROVED',
            batch: { status: { not: 'CANCELLED' } },
            startTime: dateFilter,
            endTime: { not: null }
        };

        // Section isolation for MANAGERS
        if (isManager) {
            const manager = await prisma.user.findUnique({
                where: { id: managerId },
                include: { sectionAssignments: true }
            });
            const assignedSections = manager.sectionAssignments.map(sa => sa.stage);
            where.stage = { in: assignedSections };
        }

        // Fetch logs with filters
        // "Single Log" Integrity: If duplicates exist, we take the latest by approvedAt
        const rawLogs = await prisma.productionLog.findMany({
            where,
            orderBy: { approvedAt: 'desc' },
            select: {
                batchId: true,
                stage: true,
                startTime: true,
                endTime: true,
                approvedAt: true
            }
        });

        // Unique (Batch, Stage) filter to satisfy "Single Log" rule
        const processedPairs = new Set();
        const logs = rawLogs.filter(log => {
            const pairKey = `${log.batchId}-${log.stage}`;
            if (processedPairs.has(pairKey)) return false;
            processedPairs.add(pairKey);
            return true;
        });

        // Manual aggregation because complex time diffs in Prisma/SQLite are tricky
        const totalsByStage = {};

        logs.forEach(log => {
            const duration = (new Date(log.endTime) - new Date(log.startTime)) / (1000 * 60); // minutes
            if (duration > 0) {
                if (!totalsByStage[log.stage]) {
                    totalsByStage[log.stage] = { totalMinutes: 0, count: 0 };
                }
                totalsByStage[log.stage].totalMinutes += duration;
                totalsByStage[log.stage].count += 1;
            }
        });

        const efficiency = Object.keys(totalsByStage).map(stage => ({
            stage,
            avgDurationMinutes: Math.round(totalsByStage[stage].totalMinutes / totalsByStage[stage].count * 10) / 10,
            logCount: totalsByStage[stage].count
        }));

        return res.json(efficiency);
    } catch (error) {
        console.error('Efficiency Analytics Error:', error);
        return res.status(500).json({ error: 'Failed to fetch efficiency analytics' });
    }
};

/**
 * Get Operator Performance
 * Throughput = Sum(quantityOut) for APPROVED logs
 * Grouped by Operator AND Stage
 */
const getOperatorPerformance = async (req, res) => {
    try {
        const { startDate, endDate, stage } = req.query;
        const managerId = req.user.userId;
        const isManager = req.user.role === 'MANAGER';

        const where = {
            approvalStatus: 'APPROVED',
            batch: { status: { not: 'CANCELLED' } }
        };

        if (startDate || endDate) {
            where.startTime = {};
            if (startDate) where.startTime.gte = new Date(startDate);
            if (endDate) where.startTime.lte = new Date(endDate);
        }

        if (stage) {
            where.stage = stage;
        }

        // Section isolation for MANAGERS
        if (isManager) {
            const manager = await prisma.user.findUnique({
                where: { id: managerId },
                include: { sectionAssignments: true }
            });
            const assignedSections = manager.sectionAssignments.map(sa => sa.stage);
            where.stage = { in: assignedSections };
        }

        const stats = await prisma.productionLog.groupBy({
            by: ['operatorUserId', 'stage'],
            where,
            _sum: {
                quantityIn: true,
                quantityOut: true
            },
            _count: {
                _all: true
            }
        });

        // Hydrate operator names
        const enrichedStats = await Promise.all(stats.map(async (s) => {
            const operator = await prisma.user.findUnique({
                where: { id: s.operatorUserId },
                select: { fullName: true, employeeCode: true }
            });
            return {
                operatorName: operator?.fullName || 'Unknown',
                employeeCode: operator?.employeeCode || 'N/A',
                stage: s.stage,
                totalReceived: s._sum.quantityIn || 0,
                totalProduced: s._sum.quantityOut || 0,
                logCount: s._count._all
            };
        }));

        return res.json(enrichedStats);
    } catch (error) {
        console.error('Operator Performance Error:', error);
        return res.status(500).json({ error: 'Failed to fetch operator performance' });
    }
};

/**
 * Get Defect Stats
 * Count of DefectRecords grouped by Code and Stage
 * Scope: QUALITY_CHECK only (per analytics rules)
 */
const getDefectStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const managerId = req.user.userId;
        const isManager = req.user.role === 'MANAGER';

        const where = {
            stage: 'QUALITY_CHECK',
            batch: { status: { not: 'CANCELLED' } }
        };

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) where.createdAt.lte = new Date(endDate);
        }

        // Section isolation for MANAGERS
        // Even if DefectRecord doesn't have a section, we strictly filter if they only see QUALITY_CHECK
        if (isManager) {
            const manager = await prisma.user.findUnique({
                where: { id: managerId },
                include: { sectionAssignments: true }
            });
            const assignedSections = manager.sectionAssignments.map(sa => sa.stage);
            if (!assignedSections.includes('QUALITY_CHECK')) {
                return res.json([]); // No access to QUALITY_CHECK defects
            }
        }

        const stats = await prisma.defectRecord.groupBy({
            by: ['defectCode'],
            where,
            _sum: {
                quantity: true
            },
            _count: {
                _all: true
            }
        });

        const formattedStats = stats.map(s => ({
            defectCode: s.defectCode,
            totalQuantity: s._sum.quantity || 0,
            occurrenceCount: s._count._all
        }));

        return res.json(formattedStats);
    } catch (error) {
        console.error('Defect Stats Error:', error);
        return res.status(500).json({ error: 'Failed to fetch defect stats' });
    }
};

module.exports = {
    getProductionEfficiency,
    getOperatorPerformance,
    getDefectStats
};
