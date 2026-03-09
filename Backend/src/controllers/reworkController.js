const reworkService = require('#backend/services/reworkService');

/**
 * Create Rework Log
 */
const createReworkLog = async (req, res) => {
    try {
        const rework = await reworkService.createReworkLog(req.body, req.user.userId);
        return res.status(201).json({
            message: 'Rework log created successfully. Awaiting manager approval.',
            rework
        });
    } catch (error) {
        console.error('Create rework error:', error.message);
        return res.status(500).json({ error: error.message });
    }
};

module.exports = { createReworkLog };
