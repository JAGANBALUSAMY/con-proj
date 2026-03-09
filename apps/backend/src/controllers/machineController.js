const prisma = require('../utils/prisma');

/**
 * Get Machine Status Matrix
 * Fetches status and load metrics for all machines
 */
const getMachineStatus = async (req, res) => {
    try {
        const machines = await prisma.machine.findMany({
            orderBy: { machineCode: 'asc' }
        });

        // Mock load data for now as it's not in the schema
        // In a real system, this would come from a real-time monitoring service or aggregate logs
        const enrichedMachines = machines.map(m => ({
            id: m.machineCode,
            name: m.name,
            status: m.status === 'OPERATIONAL' ? 'ONLINE' : m.status === 'MAINTENANCE' ? 'WARNING' : 'OFFLINE',
            load: m.status === 'OPERATIONAL' ? Math.floor(Math.random() * 40) + 40 : 0, // Random load 40-80% for demo
            type: m.type || 'GENERIC'
        }));

        return res.status(200).json(enrichedMachines);
    } catch (error) {
        console.error('Fetch Machine Status Error:', error);
        return res.status(500).json({ error: 'Failed to fetch machine status' });
    }
};

module.exports = {
    getMachineStatus
};
