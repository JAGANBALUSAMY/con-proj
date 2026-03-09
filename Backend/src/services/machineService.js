const machineRepository = require('#backend/repositories/machineRepository');

/**
 * Get Machine Status Matrix with enrichment
 */
const getMachineStatus = async () => {
    const machines = await machineRepository.findAllMachines();

    return machines.map(m => ({
        id: m.machineCode,
        name: m.name,
        status: m.status === 'OPERATIONAL' ? 'ONLINE' : m.status === 'MAINTENANCE' ? 'WARNING' : 'OFFLINE',
        load: m.status === 'OPERATIONAL' ? Math.floor(Math.random() * 40) + 40 : 0,
        type: m.type || 'GENERIC'
    }));
};

module.exports = {
    getMachineStatus
};
