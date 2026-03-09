const qualityService = require('#backend/services/qualityService');

/**
 * Record Defect (Operator Quality Check)
 */
const recordDefect = async (req, res) => {
    try {
        const { result, logType } = await qualityService.recordDefect(req.body, req.user.userId);
        return res.status(201).json({
            message: `QC log (${logType}) submitted for approval`,
            log: result
        });
    } catch (error) {
        console.error('Record defect error:', error.message);
        const status = error.message.includes('Access denied') ? 403 : 400;
        return res.status(status).json({ error: error.message, details: error.message });
    }
};

/**
 * Get Quality Summary for Batch
 */
const getBatchQualitySummary = async (req, res) => {
    try {
        const summary = await qualityService.getBatchQualitySummary(req.params.batchId);
        return res.json(summary);
    } catch (error) {
        console.error('Get QC summary error:', error.message);
        const status = error.message.includes('not found') ? 404 : 500;
        return res.status(status).json({ error: error.message, details: error.message });
    }
};

module.exports = {
    recordDefect,
    getBatchQualitySummary
};
