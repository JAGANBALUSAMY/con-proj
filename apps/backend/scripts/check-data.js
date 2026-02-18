const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
    const users = await prisma.user.count();
    const batches = await prisma.batch.count();
    const logs = await prisma.productionLog.count();
    const boxes = await prisma.box.count();

    console.log('--- Database Counts ---');
    console.log(`Users: ${users}`);
    console.log(`Batches: ${batches}`);
    console.log(`Logs: ${logs}`);
    console.log(`Boxes: ${boxes}`);

    if (users > 0) {
        const sampleUser = await prisma.user.findFirst();
        console.log('Sample User:', { id: sampleUser.id, role: sampleUser.role, employeeCode: sampleUser.employeeCode, passwordStart: sampleUser.password.substring(0, 10) });
    }
}

checkData()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
