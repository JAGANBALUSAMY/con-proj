const prisma = require('#infra/database/client');
const crypto = require('crypto');
const mockAnalyst = require('#ai/inference/mockAnalyst');

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

const buildSummarySkeleton = () => ({
    totalBatches: 0,
    completedBatches: 0,
    avgStageTimes: {},
    defectSummaryTop5: [],
    topOperatorsTop5: []
});

const normalizeReportPayload = (payload, summaryForFallback) => {
    if (payload && typeof payload === 'object') return payload;

    const fallback = mockAnalyst.analyzeProduction(summaryForFallback || buildSummarySkeleton());
    if (typeof payload === 'string' && payload.trim()) {
        return {
            ...fallback,
            executive_summary: payload.slice(0, 600)
        };
    }
    return fallback;
};

const persistDailyReport = async (reportData) => {
    const reportDate = new Date();
    reportDate.setUTCHours(0, 0, 0, 0);
    const reportSummary = reportData?.executive_summary || reportData?.summary || 'Production Report Summary';

    await prisma.dailyReport.upsert({
        where: { reportDate },
        update: {
            summary: reportSummary,
            metrics: reportData,
            generatedAt: new Date()
        },
        create: {
            reportDate,
            summary: reportSummary,
            metrics: reportData
        }
    });
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
                let reportData;
                try {
                    reportData = JSON.parse(cachedReport.reportText);
                } catch (e) {
                    reportData = normalizeReportPayload(cachedReport.reportText, buildSummarySkeleton());
                }
                return res.json({ report: reportData, cached: true });
            }
        }

        // Fetch aggregated data
        const summary = await getAggregatedSummary(filters);

        // Analyze using orchestrated analyst
        let result;
        try {
            result = await analyst.getAnalysis(summary, {
                model: process.env.AI_MODEL || 'llama3',
                fallbackOnFailure: process.env.AI_FALLBACK_ON_FAILURE !== 'false'
            });
        } catch (analysisError) {
            console.warn('AI analysis failed. Serving system fallback report:', analysisError.message);
            result = {
                data: normalizeReportPayload(null, summary),
                method: 'SYSTEM_FALLBACK_ERROR'
            };
        }

        const finalReport = normalizeReportPayload(result.data, summary);

        // Save to cache (update if exists during regenerate)
        try {
            await prisma.aIReport.upsert({
                where: { filterHash },
                update: {
                    reportText: JSON.stringify(finalReport),
                    generatedAt: new Date(),
                    generatedBy: req.user.userId
                },
                create: {
                    filterHash,
                    filters: filters,
                    reportText: JSON.stringify(finalReport),
                    generatedBy: req.user.userId
                }
            });
        } catch (cacheErr) {
            console.warn('AI report cache save skipped:', cacheErr.message);
        }

        try {
            await persistDailyReport(finalReport);
        } catch (dailyErr) {
            console.warn('Daily report sync skipped:', dailyErr.message);
        }

        return res.json({
            report: finalReport,
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
