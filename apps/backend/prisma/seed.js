// apps/backend/prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seeding...');

    // 0. Clean Database (Reverse order of dependencies)
    console.log('🧹 Cleaning existing data...');
    await prisma.defectRecord.deleteMany();
    await prisma.productionLog.deleteMany();
    await prisma.reworkRecord.deleteMany();
    await prisma.box.deleteMany();
    await prisma.sectionAssignment.deleteMany();
    await prisma.batch.deleteMany();
    // Keep users but update them if needed via upsert, or delete if we want total reset
    // For now, let's just delete the transactional data.
    // If we want total reset, we'd delete the users too (except admin maybe).
    // Let's delete ALL to be safe as requested "deleted values in the DB".
    await prisma.user.deleteMany({ where: { role: { not: 'ADMIN' } } });

    // 1. Initial Admin User
    const adminCode = 'ADMIN001';
    const adminPassword = 'AdminPassword123!'; // IMPORTANT: CHANGE THIS AFTER LOGIN
    // RESTORE HASHING: Passwords must be hashed for bcrypt.compare to work
    const hashedPassword = await bcrypt.hash('123456', 10);

    const admin = await prisma.user.upsert({
        where: { employeeCode: adminCode },
        update: { password: hashedPassword },
        create: {
            employeeCode: adminCode,
            fullName: 'System Administrator',
            password: hashedPassword,
            role: 'ADMIN',
            status: 'ACTIVE',
            verificationStatus: 'VERIFIED',
        },
    });

    // 2. Production Stages
    const stages = ['CUTTING', 'STITCHING', 'QUALITY_CHECK', 'LABELING', 'FOLDING', 'PACKING'];

    console.log('🏭 Seeding Production Staff...');

    // We need to keep track of created users to assign logs later
    const createdUsers = {};

    for (const stage of stages) {
        console.log(`   Processing Stage: ${stage}`);
        const stageCode = stage.substring(0, 3).toUpperCase(); // CUT, STI...

        // Create 2 Managers per stage
        for (let i = 1; i <= 2; i++) {
            const mgrCode = `MGR_${stageCode}_0${i}`;
            const mgrEmail = `mgr_${stage}_0${i}@factory.com`.toLowerCase();

            const manager = await prisma.user.upsert({
                where: { employeeCode: mgrCode },
                update: { password: hashedPassword },
                create: {
                    employeeCode: mgrCode,
                    email: mgrEmail,
                    fullName: `Manager ${stage} ${i}`,
                    password: hashedPassword,
                    role: 'MANAGER',
                    status: 'ACTIVE',
                    verificationStatus: 'VERIFIED',
                },
            });

            // Store for reference
            if (!createdUsers[stage]) createdUsers[stage] = { managers: [], operators: [] };
            createdUsers[stage].managers.push(manager);

            // Assign Section (Idempotent)
            const existingAssignment = await prisma.sectionAssignment.findFirst({
                where: { userId: manager.id, stage: stage }
            });

            if (!existingAssignment) {
                await prisma.sectionAssignment.create({
                    data: { userId: manager.id, stage: stage }
                });
            }

            // Create 1 Operator per Manager (Total 2 per stage)
            const opCode = `OP_${stageCode}_0${i}`;
            const opEmail = `op_${stage}_0${i}@factory.com`.toLowerCase();

            const operator = await prisma.user.upsert({
                where: { employeeCode: opCode },
                update: { password: hashedPassword },
                create: {
                    employeeCode: opCode,
                    email: opEmail,
                    fullName: `Operator ${stage} ${i}`,
                    password: hashedPassword,
                    role: 'OPERATOR',
                    status: 'ACTIVE',
                    verificationStatus: 'VERIFIED',
                    createdByUserId: manager.id // Link to creating manager
                },
            });
            createdUsers[stage].operators.push(operator);

            // Assign Operator to Stage
            const existingOpAssignment = await prisma.sectionAssignment.findFirst({
                where: { userId: operator.id, stage: stage }
            });

            if (!existingOpAssignment) {
                await prisma.sectionAssignment.create({
                    data: { userId: operator.id, stage: stage }
                });
            }
        }
    }

    console.log('✅ Staff seeding completed.');
    console.log('🚀 Database ready (Users only).');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
