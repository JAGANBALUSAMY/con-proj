const prisma = require('#infra/database/client');
const crypto = require('crypto');
const axios = require('axios');

/**
 * Generate a deterministic hash for filters to be used as a cache key.
 */
const generateFilterHash = (filters) => {
    // Sort keys alphabetically to ensure deterministic stringification
    const sortedFilters = Object.keys(filters)
        .sort()
        .reduce((acc, key) => {
            acc[key] = filters[key];
            return acc;
        }, {});

    const filterString = JSON.stringify(sortedFilters);
    return crypto.createHash('sha256').update(filterString).digest('hex');
};

/**
 * Fetch and aggregate analytics data for the AI prompt.
 * Restricts payload to key metrics and Top 5 entities.
 */
const getAggregatedSummary = async (filters) => {
    const { startDate, endDate, stage, operatorId } = filters;

    const where = {
        approvalStatus: 'APPROVED',
        batch: { status: { not: 'CANCELLED' } }
    };

    if (startDate || endDate) {
        where.startTime = {};
        if (startDate) where.startTime.gte = new Date(startDate);
        if (endDate) where.startTime.lte = new Date(endDate);
    }

    if (stage) where.stage = stage;
    if (operatorId) where.operatorUserId = parseInt(operatorId);

    // 1. Batch Summary
    const totalBatches = await prisma.batch.count({
        where: {
            productionLogs: {
                some: where
            }
        }
    });

    const completedBatches = await prisma.batch.count({
        where: {
            status: 'COMPLETED',
            productionLogs: {
                some: where
            }
        }
    });

    // 2. Efficiency Summary (Avg Duration per Stage)
    const logs = await prisma.productionLog.findMany({
        where,
        select: { stage: true, startTime: true, endTime: true }
    });

    const stageMetrics = {};
    logs.forEach(log => {
        if (log.endTime) {
            const duration = (new Date(log.endTime) - new Date(log.startTime)) / (1000 * 60);
            if (duration > 0) {
                if (!stageMetrics[log.stage]) stageMetrics[log.stage] = { total: 0, count: 0 };
                stageMetrics[log.stage].total += duration;
                stageMetrics[log.stage].count += 1;
            }
        }
    });

    const avgStageTimes = Object.keys(stageMetrics).reduce((acc, stage) => {
        acc[stage] = Math.round(stageMetrics[stage].total / stageMetrics[stage].count);
        return acc;
    }, {});

    // 3. Defect Summary (Top 5)
    const defectWhere = {
        batch: { status: { not: 'CANCELLED' } }
    };
    if (startDate || endDate) {
        defectWhere.createdAt = {};
        if (startDate) defectWhere.createdAt.gte = new Date(startDate);
        if (endDate) defectWhere.createdAt.lte = new Date(endDate);
    }
    if (stage) defectWhere.stage = stage;

    const defectStats = await prisma.defectRecord.groupBy({
        by: ['defectCode'],
        where: defectWhere,
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5
    });

    const defectSummaryTop5 = defectStats.map(d => ({
        code: d.defectCode,
        quantity: d._sum.quantity || 0
    }));

    // 4. Operator Performance (Top 5)
    const operatorStats = await prisma.productionLog.groupBy({
        by: ['operatorUserId'],
        where,
        _sum: { quantityOut: true },
        orderBy: { _sum: { quantityOut: 'desc' } },
        take: 5
    });

    const topOperatorsTop5 = await Promise.all(operatorStats.map(async (s) => {
        const user = await prisma.user.findUnique({
            where: { id: s.operatorUserId },
            select: { fullName: true }
        });
        return {
            name: user?.fullName || 'Unknown',
            produced: s._sum.quantityOut || 0
        };
    }));

    return {
        totalBatches,
        completedBatches,
        avgStageTimes,
        defectSummaryTop5,
        topOperatorsTop5
    };
};

const analyst = require('con-proj-ai/inference/analyst');

/**
 * Generate AI Report using local AI orchestration.
 */
const generateAIReport = async (req, res) => {
    try {
        const { dateRange, stage, operatorId, isRegenerate } = req.body;
        const filters = {
            startDate: dateRange?.start,
            endDate: dateRange?.end,
            stage,
            operatorId
        };

        const filterHash = generateFilterHash(filters);

        // Check cache unless regeneration is requested
        if (!isRegenerate) {
            const cachedReport = await prisma.aIReport.findUnique({
                where: { filterHash }
            });

            if (cachedReport) {
                // Parse if it's a JSON string
                let reportData = cachedReport.reportText;
                try {
                    reportData = JSON.parse(cachedReport.reportText);
                } catch (e) {
                    // Fallback to raw text if parsing fails (legacy reports)
                }
                return res.json({ report: reportData, cached: true });
            }
        }

        // Fetch aggregated data
        const summary = await getAggregatedSummary(filters);

        // Analyze using orchestrated analyst
        const result = await analyst.getAnalysis(summary, {
            model: process.env.AI_MODEL || 'llama3',
            fallbackOnFailure: process.env.AI_FALLBACK_ON_FAILURE !== 'false'
        });

        // Save to cache (update if exists during regenerate)
        const report = await prisma.aIReport.upsert({
            where: { filterHash },
            update: {
                reportText: JSON.stringify(result.data),
                generatedAt: new Date(),
                generatedBy: req.user.userId
            },
            create: {
                filterHash,
                filters: filters,
                reportText: JSON.stringify(result.data),
                generatedBy: req.user.userId
            }
        });

        return res.json({
            report: result.data, // Send the object directly
            cached: false,
            method: result.method
        });

    } catch (error) {
        console.error('AI Report Error:', error);
        return res.status(500).json({ error: 'Failed to generate production report.' });
    }
};

module.exports = {
    generateAIReport
};
