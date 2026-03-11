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
    await prisma.aIReport.deleteMany();
    await prisma.dailyReport.deleteMany();
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

    // 4. Create Historical Mock Data for the last 7 days
    console.log('🤖 Generating 7-Day Production History (Logs + AI)...');
    const stages = ['CUTTING', 'STITCHING', 'QUALITY_CHECK', 'LABELING', 'PACKING'];
    const operators = await prisma.user.findMany({ where: { role: 'OPERATOR' }, include: { sectionAssignments: true } });
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

    for (let i = 6; i >= 0; i--) {
        const reportDate = new Date();
        reportDate.setDate(reportDate.getDate() - i);
        reportDate.setUTCHours(0, 0, 0, 0);

        console.log(`   Seeding data for ${reportDate.toISOString().split('T')[0]}...`);

        // Create 5-8 batches per day
        const dailyBatchCount = 5 + Math.floor(Math.random() * 4);
        for (let b = 0; b < dailyBatchCount; b++) {
            const batch = await prisma.batch.create({
                data: {
                    batchNumber: `B-${reportDate.toISOString().split('T')[0]}-${b}`,
                    briefTypeName: ['TSHIRT-01', 'JEANS-02', 'HOODIE-03'][Math.floor(Math.random() * 3)],
                    totalQuantity: 100 + Math.floor(Math.random() * 100),
                    status: 'COMPLETED',
                    createdAt: reportDate,
                    updatedAt: reportDate
                }
            });

            // Create logs for each stage for this batch
            let currentTime = new Date(reportDate);
            currentTime.setUTCHours(9 + b, 0, 0, 0); // Stagger start times

            for (const stage of stages) {
                const durationMinutes = [15, 45, 10, 8, 5][stages.indexOf(stage)] + Math.floor(Math.random() * 10);
                const startTime = new Date(currentTime);
                const endTime = new Date(startTime.getTime() + durationMinutes * 60000);
                const operator = operators.find(op => op.sectionAssignments[0].stage === stage);

                await prisma.productionLog.create({
                    data: {
                        batchId: batch.id,
                        operatorUserId: operator?.id || operators[0].id,
                        recordedByUserId: admin.id,
                        stage,
                        quantityIn: batch.totalQuantity,
                        quantityOut: stage === 'QUALITY_CHECK' ? batch.totalQuantity - Math.floor(Math.random() * 5) : batch.totalQuantity,
                        startTime,
                        endTime,
                        approvalStatus: 'APPROVED',
                        approvedAt: endTime
                    }
                });

                // If Quality Check, add some defects
                if (stage === 'QUALITY_CHECK') {
                    const defectCount = 1 + Math.floor(Math.random() * 3);
                    for (let d = 0; d < defectCount; d++) {
                        await prisma.defectRecord.create({
                            data: {
                                batchId: batch.id,
                                defectCode: ['STITCH_GAP', 'FABRIC_BURN', 'SIZE_MISMATCH', 'COLOR_BLEED'][Math.floor(Math.random() * 4)],
                                quantity: 1 + Math.floor(Math.random() * 2),
                                stage: 'QUALITY_CHECK',
                                severity: 'MINOR',
                                detectedByUserId: operator?.id || operators[0].id,
                                createdAt: endTime
                            }
                        });
                    }
                }

                currentTime = new Date(endTime.getTime() + 5 * 60000); // 5 min interval
            }
        }

        // Create AI Report based on the day's volume
        const dailyVolume = dailyBatchCount * 150;
        const dailyDefects = 1.8 + (Math.random() * 1.5);

        await prisma.dailyReport.create({
            data: {
                reportDate,
                summary: `High-fidelity production summary for ${reportDate.toDateString()}.`,
                metrics: {
                    executive_summary: `The operations on ${reportDate.toLocaleDateString()} processed approximately ${dailyVolume} units.`,
                    operational_analysis: "Sectional efficiency mapping shows peak performance in CUTTING and STITCHING.",
                    risk_assessment: "Minor bottlenecking observed in QC due to batch density.",
                    recommendations: "Optimize operator allocation during mid-day peaks.",
                    kpis: {
                        total_batches: dailyBatchCount,
                        units_processed: dailyVolume,
                        defect_rate: dailyDefects,
                        top_operator: "Jane Smith"
                    },
                    throughput_trend: Array.from({ length: 7 }, (_, idx) => ({
                        label: `D-${7-idx}`,
                        value: 500 + Math.floor(Math.random() * 200)
                    })),
                    bottleneck_heatmap: stages.map(s => ({ stage: s, delay_factor: Math.random() })),
                    operator_efficiency: [{ name: 'Jane Smith', score: 95 }, { name: 'John Doe', score: 88 }],
                    defect_root_causes: [{ cause: 'Machine', percentage: 45 }, { cause: 'Human', percentage: 55 }]
                }
            }
        });
    }

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
