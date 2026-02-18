const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function main() {
    const logId = 8;
    const result = { logId, timestamp: new Date().toISOString() };

    try {
        const log = await prisma.productionLog.findUnique({
            where: { id: logId },
            include: { batch: true }
        });

        if (!log) {
            result.error = 'Log not found';
        } else {
            result.log = log;
            result.batch = log.batch;

            const { usableQuantity, defectiveQuantity, scrappedQuantity, totalQuantity } = log.batch;
            result.quantityCheck = {
                usableQuantity,
                defectiveQuantity,
                scrappedQuantity,
                totalQuantity,
                sum: usableQuantity + defectiveQuantity + scrappedQuantity,
                isConsistent: (usableQuantity + defectiveQuantity + scrappedQuantity) === totalQuantity
            };
        }
    } catch (e) {
        result.error = e.message;
        result.stack = e.stack;
    }

    fs.writeFileSync('diagnostic_result.json', JSON.stringify(result, null, 2), 'utf8');
    console.log('Diagnostic result written to diagnostic_result.json');
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
