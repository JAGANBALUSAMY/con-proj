// apps/backend/prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting refined database reset and seeding...');

    // 0. Clean Database
    console.log('🧹 Cleaning all existing data...');
    await prisma.defectRecord.deleteMany();
    await prisma.reworkRecord.deleteMany();
    await prisma.productionLog.deleteMany();
    await prisma.sectionTransferRequest.deleteMany();
    await prisma.sectionAssignment.deleteMany();
    await prisma.batch.deleteMany();
    await prisma.machine.deleteMany();
    await prisma.user.deleteMany();

    const hashedPassword = await bcrypt.hash('123456', 10);

    // 1. Create Admin
    console.log('👤 Creating Admin...');
    await prisma.user.create({
        data: {
            employeeCode: 'ADMIN',
            fullName: 'System Administrator',
            password: hashedPassword,
            role: 'ADMIN',
            status: 'ACTIVE',
            verificationStatus: 'VERIFIED',
        }
    });

    // 2. Production Stages and Mappings
    const stageInfo = [
        { stage: 'CUTTING', code: 'CUT' },
        { stage: 'STITCHING', code: 'STI' },
        { stage: 'QUALITY_CHECK', code: 'QC' },
        { stage: 'LABELING', code: 'LAB' },
        { stage: 'FOLDING', code: 'FOL' },
        { stage: 'PACKING', code: 'PAC' }
    ];

    console.log('🏭 Seeding Staff (Strict Sections)...');

    for (const info of stageInfo) {
        const { stage, code } = info;
        console.log(`   Stage: ${stage} (${code})`);

        // Create 1 Manager
        const mgrCode = `MGR_${code}_01`;
        const manager = await prisma.user.create({
            data: {
                employeeCode: mgrCode,
                fullName: `${stage.charAt(0) + stage.slice(1).toLowerCase()} Manager`,
                password: hashedPassword,
                role: 'MANAGER',
                status: 'ACTIVE',
                verificationStatus: 'VERIFIED',
                sectionAssignments: {
                    create: { stage: stage }
                }
            }
        });

        // Create 1 Operator
        const opCode = `OP_${code}_01`;
        await prisma.user.create({
            data: {
                employeeCode: opCode,
                fullName: `${stage.charAt(0) + stage.slice(1).toLowerCase()} Operator`,
                password: hashedPassword,
                role: 'OPERATOR',
                status: 'ACTIVE',
                verificationStatus: 'VERIFIED',
                createdByUserId: manager.id,
                sectionAssignments: {
                    create: { stage: stage }
                }
            }
        });
    }

    // 3. Create Machines
    console.log('⚙️ Creating Machines...');
    await prisma.machine.create({ data: { machineCode: 'CUT-M-01', name: 'Cutting Machine 1', type: 'LASER_CUTTER' } });
    await prisma.machine.create({ data: { machineCode: 'STITCH-M-01', name: 'Stitching Machine 1', type: 'SEWING' } });
    await prisma.machine.create({ data: { machineCode: 'QC-STATION-01', name: 'Quality Hub 1', type: 'INSPECTION' } });

    console.log('✅ Seeding completed successfully.');
    console.log('-----------------------------------');
    console.log('Login Details (All Passwords: 123456):');
    console.log('Format: employeeCode');
    console.log('- Admin: ADMIN');
    for (const info of stageInfo) {
        console.log(`- ${info.stage}: MGR_${info.code}_01 / OP_${info.code}_01`);
    }
    console.log('-----------------------------------');
    console.log('Note: CUTting and STItching users can perform rework for their sections.');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
