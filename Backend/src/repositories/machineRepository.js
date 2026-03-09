const prisma = require('#infra/database/client');

/**
 * Find all machines
 */
const findAllMachines = async () => {
    return await prisma.machine.findMany({
        orderBy: { machineCode: 'asc' }
    });
};

module.exports = {
    findAllMachines
};
