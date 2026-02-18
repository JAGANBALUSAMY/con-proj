const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const logId = 8;
    console.log(`Verifying fix for log #${logId}...`);

    try {
        const log = await prisma.productionLog.findUnique({
            where: { id: logId },
            include: { batch: true }
        });

        const currentBatch = log.batch;
        console.log(`Initial: Usable=${currentBatch.usableQuantity}, Total=${currentBatch.totalQuantity}, Scrap=${currentBatch.scrappedQuantity}`);

        // CALCULATE DISCREPANCY
        const loss = currentBatch.totalQuantity - log.quantityOut;
        console.log(`Log QuantityOut: ${log.quantityOut}, Calculated Loss: ${loss}`);

        const newUsable = log.quantityOut;
        const newScrapped = currentBatch.scrappedQuantity + loss;
        const newDefective = currentBatch.defectiveQuantity;

        console.log(`Final Sum Check: ${newUsable} (usable) + ${newScrapped} (scrap) + ${newDefective} (def) = ${newUsable + newScrapped + newDefective}`);

        if (newUsable + newScrapped + newDefective === currentBatch.totalQuantity) {
            console.log('✅ FIX WORKS: Quantities will be consistent.');
        } else {
            console.log('❌ FIX FAILS.');
        }

    } catch (e) {
        console.error(e);
    }
}

main().finally(() => prisma.$disconnect());
