const machineService = require('#backend/services/machineService');

/**
 * Get Machine Status Matrix
 */
const getMachineStatus = async (req, res) => {
    try {
        const enrichedMachines = await machineService.getMachineStatus();
        return res.status(200).json(enrichedMachines);
    } catch (error) {
        console.error('Fetch Machine Status Error:', error);
        return res.status(500).json({ error: 'Failed to fetch machine status' });
    }
};

module.exports = {
    getMachineStatus
};
