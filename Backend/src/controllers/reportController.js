const prisma = require('#infra/database/client');
const socketUtil = require('#backend/utils/socket');
const { z } = require('zod');
const mockAnalyst = require('#ai/inference/mockAnalyst');

/**
 * Strict JSON Schema for AI Reports
 */
const ReportSchema = z.object({
    executive_summary: z.string().optional(),
    kpis: z.object({
        total_batches: z.number(),
        units_processed: z.number(),
        defect_rate: z.number(),
        top_operator: z.string()
    }),
    stage_efficiency: z.array(
        z.object({
            stage: z.string(),
            avg_time: z.number()
        })
    ),
    defect_distribution: z.array(
        z.object({
            defect: z.string(),
            count: z.number()
        })
    ),
    operator_performance: z.array(
        z.object({
            operator: z.string(),
            units: z.number()
        })
    ),
    throughput_trend: z.array(
        z.object({
            label: z.string(),
            value: z.number()
        })
    ).optional(),
    bottleneck_heatmap: z.array(
        z.object({
            stage: z.string(),
            delay_factor: z.number()
        })
    ).optional(),
    operator_efficiency: z.array(
        z.object({
            name: z.string(),
            score: z.number()
        })
    ).optional(),
    defect_root_causes: z.array(
        z.object({
            cause: z.string(),
            percentage: z.number()
        })
    ).optional(),
    operational_analysis: z.string().optional(),
    risk_assessment: z.string().optional(),
    recommendations: z.string().optional(),
    // Backward compatibility
    summary: z.string().optional(),
    insight: z.string().optional()
});

/**
 * Normalizes a date to midnight UTC
 */
const normalizeToUTCDate = (dateInput) => {
    const date = new Date(dateInput || new Date());
    date.setUTCHours(0, 0, 0, 0);
    return date;
};

/**
 * Upsert a daily report (Idempotent with Validation)
 */
const upsertDailyReport = async (req, res) => {
    try {
        let { metrics, reportDate } = req.body;

        if (!metrics) {
            return res.status(400).json({ error: 'Metrics data is required' });
        }

        // Handle stringified metrics if they come from n8n that way
        if (typeof metrics === 'string') {
            try {
                metrics = JSON.parse(metrics);
            } catch (pErr) {
                return res.status(400).json({ error: 'Invalid JSON in metrics' });
            }
        }

        // 1. Validate Schema
        let validatedData;
        try {
            validatedData = ReportSchema.parse(metrics);
        } catch (schemaError) {
            console.warn('AI Output schema mismatch, triggering mock fallback:', schemaError.errors);
            // Fallback to mock for data integrity
            validatedData = mockAnalyst.analyzeProduction(metrics._raw_summary || metrics);
        }

        const normalizedDate = normalizeToUTCDate(reportDate);
        const reportSummary = validatedData.executive_summary || validatedData.summary || 'Production Report Summary';

        const report = await prisma.dailyReport.upsert({
            where: { reportDate: normalizedDate },
            update: {
                summary: reportSummary,
                metrics: validatedData,
                generatedAt: new Date()
            },
            create: {
                reportDate: normalizedDate,
                summary: reportSummary,
                metrics: validatedData
            }
        });

        // Notify dashboard via WebSocket
        socketUtil.emit('daily_report_generated', report);

        return res.status(201).json(report);
    } catch (error) {
        console.error('Daily Report Upsert Error:', error);
        return res.status(500).json({ error: 'Failed to save daily report' });
    }
};

/**
 * Get latest daily report
 */
const getLatestReport = async (req, res) => {
    try {
        const report = await prisma.dailyReport.findFirst({
            orderBy: { reportDate: 'desc' }
        });

        if (!report) {
            return res.status(404).json({ message: 'No reports generated yet' });
        }

        return res.json(report);
    } catch (error) {
        console.error('Fetch Latest Report Error:', {
            message: error.message,
            code: error.code,
            meta: error.meta,
            stack: error.stack?.split('\n').slice(0, 4).join('\n')
        });
        return res.status(500).json({ error: 'Failed to fetch the latest report', detail: error.message });
    }
};

/**
 * Get report for specific date (Normalized)
 */
const getReportByDate = async (req, res) => {
    try {
        const { date } = req.params;
        const normalizedDate = normalizeToUTCDate(date);

        const report = await prisma.dailyReport.findUnique({
            where: { reportDate: normalizedDate }
        });

        if (!report) {
            return res.status(404).json({ message: 'No report found for this date' });
        }

        return res.json(report);
    } catch (error) {
        console.error('Fetch Report By Date Error:', error);
        return res.status(500).json({ error: 'Failed to fetch report' });
    }
};

/**
 * Get recent daily reports (Last 7 days)
 */
const getRecentReports = async (req, res) => {
    try {
        const reports = await prisma.dailyReport.findMany({
            orderBy: { reportDate: 'desc' },
            take: 7
        });

        // Inverse to show chronological order on charts
        return res.json(reports.reverse());
    } catch (error) {
        console.error('Fetch Recent Reports Error:', error);
        return res.status(500).json({ error: 'Failed to fetch recent reports' });
    }
};

module.exports = {
    upsertDailyReport,
    getLatestReport,
    getReportByDate,
    getRecentReports
};
