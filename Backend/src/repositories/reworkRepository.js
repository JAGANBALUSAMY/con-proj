const prisma = require('#infra/database/client');

/**
 * Find batch with defects and rework for a specific stage
 */
const findBatchWithDefectsAndRework = async (batchId, reworkStage) => {
    return await prisma.batch.findUnique({
        where: { id: batchId },
        include: {
            defectRecords: {
                where: { reworkStage }
            },
            reworkRecords: {
                where: { reworkStage }
            }
        }
    });
};

/**
 * Create rework record
 */
const createReworkRecord = async (data) => {
    return await prisma.reworkRecord.create({
        data,
        include: {
            batch: { select: { batchNumber: true } },
            operator: { select: { fullName: true } }
        }
    });
};

module.exports = {
    findBatchWithDefectsAndRework,
    createReworkRecord
};
