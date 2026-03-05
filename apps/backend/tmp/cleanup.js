const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        // Truncate Batch will cascade to ProductionLog, ReworkRecord, DefectRecord
        await prisma.$executeRaw`TRUNCATE TABLE "Batch" CASCADE;`;
        console.log('Database cleaned: All batches deleted.');
    } catch (error) {
        console.error('Cleanup failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
