const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearDatabase() {
    console.log('🗑️  Clearing database...');

    try {
        // 1. Child tables (Logs, Rework, Boxes, Assignments, Defects, Transfers)
        await prisma.defectRecord.deleteMany({});
        console.log(' - Cleared Defect Records');

        await prisma.sectionTransferRequest.deleteMany({});
        console.log(' - Cleared Section Transfer Requests');

        await prisma.box.deleteMany({});
        console.log(' - Cleared Boxes');

        await prisma.productionLog.deleteMany({});
        console.log(' - Cleared Production Logs');

        await prisma.reworkRecord.deleteMany({});
        console.log(' - Cleared Rework Records');

        await prisma.sectionAssignment.deleteMany({});
        console.log(' - Cleared Section Assignments');

        // 2. Batches (Parent of logs/boxes)
        await prisma.batch.deleteMany({});
        console.log(' - Cleared Batches');

        // 3. Machines
        await prisma.machine.deleteMany({});
        console.log(' - Cleared Machines');

        // 4. Users (Parent of logs/assignments)
        // Keep Admin? Usually yes, but "delete ALL" might mean all.
        // Let's keep the hardcoded seed admin if we want, or just wipe all.
        // User asked to "delete all values", so we wipe all.
        // Seed script will restore them.
        await prisma.user.deleteMany({});
        console.log(' - Cleared Users');

        console.log('✅ Database successfully cleared.');
    } catch (error) {
        console.error('❌ Failed to clear database:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

clearDatabase();
