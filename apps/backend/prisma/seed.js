// apps/backend/prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seeding...');

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
    const stages = ['CUTTING', 'STITCHING', 'QUALITY_CHECK', 'REWORK', 'LABELING', 'FOLDING', 'PACKING'];

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

    // 3. Create Sample Transactional Data (Batches & Logs)
    console.log('📦 Seeding Sample Batches & Logs...');

    // Batch 1: Pending in CUTTING (For Cutting Manager to see as START REQUEST)
    // No log created yet. Manager must START it.

    await prisma.batch.create({
        data: {
            batchNumber: 'BATCH-SEED-001',
            briefTypeName: 'Seed Test Batch 1',
            totalQuantity: 100,
            usableQuantity: 0,
            currentStage: 'CUTTING',
            status: 'PENDING' // Manager sees this in queue
        }
    });
    console.log(`   Created Batch BATCH-SEED-001 (PENDING Approval)`);

    console.log('✅ Staff seeding completed.');
    console.log('🚀 Database ready.');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
