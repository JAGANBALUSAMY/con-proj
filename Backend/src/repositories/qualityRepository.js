const prisma = require('#infra/database/client');

/**
 * Find batch with defects and rework
 */
const findBatchWithRelations = async (id) => {
    return await prisma.batch.findUnique({
        where: { id },
        include: {
            defectRecords: true,
            reworkRecords: true
        }
    });
};

/**
 * Create multiple defect records and a quality log in transaction
 */
const recordDefectsInTransaction = async (defects, qualityLogData) => {
    return await prisma.$transaction(async (tx) => {
        if (defects.length > 0) {
            await tx.defectRecord.createMany({
                data: defects
            });
        }

        return await tx.productionLog.create({
            data: qualityLogData,
            include: {
                batch: { select: { batchNumber: true, briefTypeName: true } },
                operator: { select: { fullName: true } }
            }
        });
    });
};

module.exports = {
    findBatchWithRelations,
    recordDefectsInTransaction
};
