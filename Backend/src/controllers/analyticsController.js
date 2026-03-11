const analyticsService = require('#backend/services/analyticsService');

/**
 * Get Production Efficiency
 */
const getProductionEfficiency = async (req, res) => {
    try {
        const efficiency = await analyticsService.getProductionEfficiency(req.query, req.user);
        return res.json(efficiency);
    } catch (error) {
        console.error('Efficiency Analytics Error:', error);
        return res.status(500).json({ error: 'Failed to fetch efficiency analytics' });
    }
};

/**
 * Get Operator Performance
 */
const getOperatorPerformance = async (req, res) => {
    try {
        const stats = await analyticsService.getOperatorPerformance(req.query, req.user);
        return res.json(stats);
    } catch (error) {
        console.error('Operator Performance Error:', error);
        return res.status(500).json({ error: 'Failed to fetch operator performance' });
    }
};

/**
 * Get Defect Stats
 */
const getDefectStats = async (req, res) => {
    try {
        const stats = await analyticsService.getDefectStats(req.query, req.user);
        return res.json(stats);
    } catch (error) {
        console.error('Defect Stats Error:', error);
        return res.status(500).json({ error: 'Failed to fetch defect stats' });
    }
};

/**
 * Get Operator Performance Rankings
 */
const getOperatorRankings = async (req, res) => {
    try {
        const rankings = await analyticsService.getOperatorRankings();
        return res.status(200).json(rankings);
    } catch (error) {
        console.error('Operator Rankings Error:', error);
        return res.status(500).json({ error: 'Failed to fetch operator rankings' });
    }
};

/**
 * Get Daily Summary for n8n automation
 */
const getDailySummary = async (req, res) => {
    try {
        const { date } = req.query;
        const summary = await analyticsService.getDailySummary(date);
        return res.json(summary);
    } catch (error) {
        console.error('Daily Summary Error:', error);
        return res.status(500).json({ error: 'Failed to fetch daily summary' });
    }
};

module.exports = {
    getProductionEfficiency,
    getOperatorPerformance,
    getDefectStats,
    getOperatorRankings,
    getDailySummary
};
