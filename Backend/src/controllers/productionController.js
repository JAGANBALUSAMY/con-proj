const productionService = require('#backend/services/productionService');

/**
 * Create Production Log
 */
const createProductionLog = async (req, res) => {
    try {
        const log = await productionService.createProductionLog(req.body, req.user.userId);
        return res.status(201).json({
            message: 'Production log created successfully. Awaiting manager approval.',
            log
        });
    } catch (error) {
        console.error('Create production log error:', error.message);

        // Map error messages to status codes
        const forbiddenErrors = ['Only operators', 'must be VERIFIED', 'Access denied'];
        const status = forbiddenErrors.some(e => error.message.includes(e)) ? 403 : 400;

        return res.status(status).json({
            error: error.message,
            details: error.message
        });
    }
};

module.exports = {
    createProductionLog
};
