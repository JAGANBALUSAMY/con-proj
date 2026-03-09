const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('--- Database Connection Check ---');
        await prisma.$connect();
        console.log('✅ Connected to database successfully.');

        console.log('\n--- Model Counts ---');
        const userCount = await prisma.user.count();
        const batchCount = await prisma.batch.count();
        const machineCount = await prisma.machine.count();
        const prodLogCount = await prisma.productionLog.count();

        console.log(`Users: ${userCount}`);
        console.log(`Batches: ${batchCount}`);
        console.log(`Machines: ${machineCount}`);
        console.log(`Production Logs: ${prodLogCount}`);

        if (machineCount === 0) {
            console.log('\n⚠️ No machines found in database. This will cause issues for the Machine Matrix.');
        }

        console.log('\n--- Recent Logs ---');
        const recentLogs = await prisma.productionLog.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' }
        });
        console.log(JSON.stringify(recentLogs, null, 2));

    } catch (error) {
        console.error('❌ Database error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
