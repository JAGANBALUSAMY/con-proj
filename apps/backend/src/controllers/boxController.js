const prisma = require('../utils/prisma');
const socketUtil = require('../utils/socket');

/**
 * Get all boxes (Shipment Tracker)
 * Filters: status
 */
const getBoxes = async (req, res) => {
    try {
        const { status } = req.query;
        const where = {};

        if (status) {
            where.status = status;
        }

        const boxes = await prisma.box.findMany({
            where,
            include: {
                batch: {
                    select: {
                        batchNumber: true,
                        briefTypeName: true,
                        totalQuantity: true
                    }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });

        return res.json(boxes);
    } catch (error) {
        console.error('Error fetching boxes:', error);
        return res.status(500).json({ error: 'Failed to fetch boxes' });
    }
};

/**
 * Update Box Status (Manager Only)
 * Transitions: PACKED -> SHIPPED -> DELIVERED
 */
const updateBoxStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['SHIPPED', 'DELIVERED'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status. Allowed: SHIPPED, DELIVERED' });
        }

        const box = await prisma.box.findUnique({ where: { id: parseInt(id) } });
        if (!box) return res.status(404).json({ error: 'Box not found' });

        // Logic check: Can't revert status (Optional, but good practice)
        // PACKED -> SHIPPED -> DELIVERED
        if (box.status === 'DELIVERED') {
            return res.status(400).json({ error: 'Cannot update status of a DELIVERED box' });
        }
        if (box.status === 'SHIPPED' && status === 'PACKED') {
            return res.status(400).json({ error: 'Cannot revert SHIPPED to PACKED' });
        }

        const updatedBox = await prisma.box.update({
            where: { id: parseInt(id) },
            data: { status }
        });

        // Real-time update
        socketUtil.emitEvent('box:updated', updatedBox);

        return res.json(updatedBox);

    } catch (error) {
        console.error('Error updating box status:', error);
        return res.status(500).json({ error: 'Failed to update box status' });
    }
};

module.exports = {
    getBoxes,
    updateBoxStatus
};
