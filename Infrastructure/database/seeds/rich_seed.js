const path = require('path');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const RICH_SEED_LOCK_KEY = 92837465;
const TOTAL_BATCHES = Number(process.env.RICH_SEED_BATCH_COUNT ?? 200);
const MIN_ACTIVE_BATCHES = Number(process.env.RICH_SEED_MIN_ACTIVE ?? 8);

// Ensure DATABASE_URL is loaded when script is run from workspace root.
dotenv.config({ path: path.resolve(__dirname, '../../../Backend/.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const prisma = new PrismaClient();
let seedLockAcquired = false;

const acquireSeedLock = async () => {
    const result = await prisma.$queryRaw`SELECT pg_try_advisory_lock(${RICH_SEED_LOCK_KEY}) AS locked`;
    const locked = result?.[0]?.locked;

    if (!locked) {
        console.warn('⚠️ Advisory lock unavailable. Continuing without lock; ensure no other seed is running.');
        return false;
    }

    return true;
};

const releaseSeedLock = async () => {
    try {
        await prisma.$queryRaw`SELECT pg_advisory_unlock(${RICH_SEED_LOCK_KEY})`;
    } catch (_) {
        // Ignore unlock errors during shutdown.
    }
};

const buildDailyMetrics = ({ reportDate, unitsProcessed, defectRate, batchCount }) => ({
    executive_summary: `Factory throughput remained stable on ${reportDate.toLocaleDateString()} with controlled quality leakage and manageable queue pressure in STITCHING.`,
    summary: 'Stable output with moderate stitching bottleneck risk.',
    kpis: {
        total_batches: batchCount,
        units_processed: unitsProcessed,
        defect_rate: defectRate,
        top_operator: 'OP_STI_03'
    },
    stage_efficiency: [
        { stage: 'CUTTING', avg_time: 23 },
        { stage: 'STITCHING', avg_time: 40 },
        { stage: 'QUALITY_CHECK', avg_time: 21 },
        { stage: 'LABELING', avg_time: 15 },
        { stage: 'FOLDING', avg_time: 14 },
        { stage: 'PACKING', avg_time: 13 }
    ],
    defect_distribution: [
        { defect: 'STITCH_FRAY', count: 12 + Math.floor(Math.random() * 8) },
        { defect: 'FABRIC_TEAR', count: 7 + Math.floor(Math.random() * 6) },
        { defect: 'COLOR_BLEED', count: 4 + Math.floor(Math.random() * 4) },
        { defect: 'SIZE_MISMATCH', count: 3 + Math.floor(Math.random() * 3) }
    ],
    operator_performance: [
        { operator: 'OP_STI_03', units: 540 },
        { operator: 'OP_CUT_01', units: 500 },
        { operator: 'OP_QUA_02', units: 470 }
    ],
    throughput_trend: [
        { label: 'D-6', value: 3400 },
        { label: 'D-5', value: 3520 },
        { label: 'D-4', value: 3480 },
        { label: 'D-3', value: 3600 },
        { label: 'D-2', value: 3690 },
        { label: 'D-1', value: 3820 },
        { label: 'Today', value: unitsProcessed }
    ],
    bottleneck_heatmap: [
        { stage: 'CUTTING', delay_factor: 0.21 },
        { stage: 'STITCHING', delay_factor: 0.7 },
        { stage: 'QUALITY_CHECK', delay_factor: 0.34 },
        { stage: 'LABELING', delay_factor: 0.2 },
        { stage: 'FOLDING', delay_factor: 0.18 },
        { stage: 'PACKING', delay_factor: 0.2 }
    ],
    operator_efficiency: [
        { name: 'OP_STI_03', score: 95 },
        { name: 'OP_CUT_01', score: 92 },
        { name: 'OP_QUA_02', score: 89 }
    ],
    defect_root_causes: [
        { cause: 'Machine calibration drift', percentage: 40 },
        { cause: 'Operator handling variance', percentage: 29 },
        { cause: 'Material inconsistency', percentage: 18 },
        { cause: 'Line handoff delay', percentage: 13 }
    ],
    operational_analysis: 'Throughput across all sections is consistent. Queue buildup remains concentrated in STITCHING during high-load windows.',
    risk_assessment: 'Moderate risk of spillover from STITCHING to QUALITY_CHECK if machine balancing is not adjusted.',
    recommendations: 'Reassign two operators to STITCHING during peak hours and run preventive checks on STI-M-01/STI-M-02.'
});

async function main() {
    console.log('🚀 Starting Rich Production Data Seeding...');

    seedLockAcquired = await acquireSeedLock();
    if (seedLockAcquired) {
        console.log('🔒 Seed lock acquired');
    }

    console.log('🧹 Cleaning existing production data...');
    await prisma.$executeRawUnsafe(`
        TRUNCATE TABLE
            "DefectRecord",
            "ReworkRecord",
            "ProductionLog",
            "SectionTransferRequest",
            "SectionAssignment",
            "Box",
            "Batch",
            "Machine",
            "DailyReport",
            "AIReport",
            "User"
        RESTART IDENTITY CASCADE;
    `);
    console.log('   ✅ Database cleanup completed');

    const hashedPassword = await bcrypt.hash('123456', 10);

    console.log('👤 Creating/Updating Admin...');
    await prisma.user.upsert({
        where: { employeeCode: 'ADMIN' },
        update: {
            fullName: 'System Administrator',
            password: hashedPassword,
            role: 'ADMIN',
            status: 'ACTIVE',
            verificationStatus: 'VERIFIED'
        },
        create: {
            employeeCode: 'ADMIN',
            fullName: 'System Administrator',
            password: hashedPassword,
            role: 'ADMIN',
            status: 'ACTIVE',
            verificationStatus: 'VERIFIED'
        }
    });

    const stages = ['CUTTING', 'STITCHING', 'QUALITY_CHECK', 'LABELING', 'FOLDING', 'PACKING'];
    const managers = [];
    const operators = [];
    const machines = [];

    const firstNames = ['James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda', 'David', 'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];

    const getRandomName = () => `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;

    console.log('👨‍💼 Creating Managers...');
    for (const stage of stages) {
        for (let i = 1; i <= 2; i++) {
            const mCode = `MGR_${stage.substring(0, 3)}_${i.toString().padStart(2, '0')}`;
            const manager = await prisma.user.upsert({
                where: { employeeCode: mCode },
                update: {
                    fullName: `${getRandomName()} (${stage} Mgr)`,
                    role: 'MANAGER',
                    status: 'ACTIVE',
                    verificationStatus: 'VERIFIED'
                },
                create: {
                    employeeCode: mCode,
                    fullName: `${getRandomName()} (${stage} Mgr)`,
                    password: hashedPassword,
                    role: 'MANAGER',
                    status: 'ACTIVE',
                    verificationStatus: 'VERIFIED',
                    sectionAssignments: { create: { stage } }
                }
            });
            managers.push(manager);
        }
    }

    console.log('👷 Creating Operators...');
    for (const stage of stages) {
        const stageManager = managers.find((m) => m.employeeCode.startsWith(`MGR_${stage.substring(0, 3)}`));

        for (let i = 1; i <= 5; i++) {
            const opCode = `OP_${stage.substring(0, 3)}_${i.toString().padStart(2, '0')}`;
            const operator = await prisma.user.upsert({
                where: { employeeCode: opCode },
                update: {
                    fullName: getRandomName(),
                    role: 'OPERATOR',
                    status: 'ACTIVE',
                    verificationStatus: 'VERIFIED',
                    createdByUserId: stageManager ? stageManager.id : null
                },
                create: {
                    employeeCode: opCode,
                    fullName: getRandomName(),
                    password: hashedPassword,
                    role: 'OPERATOR',
                    status: 'ACTIVE',
                    verificationStatus: 'VERIFIED',
                    createdByUserId: stageManager ? stageManager.id : null,
                    sectionAssignments: { create: { stage } }
                }
            });
            operators.push({ ...operator, stage });
        }
    }

    console.log('🤖 Creating Machines...');
    for (const stage of stages) {
        for (let i = 1; i <= 3; i++) {
            const machine = await prisma.machine.create({
                data: {
                    machineCode: `${stage.substring(0, 3)}-M-${i.toString().padStart(2, '0')}`,
                    name: `${stage} Machine ${i}`,
                    type: stage === 'STITCHING' ? 'SEWING' : stage === 'CUTTING' ? 'LASER' : 'GENERAL',
                    status: 'OPERATIONAL'
                }
            });
            machines.push({ ...machine, stage });
        }
    }

    console.log(`📦 Generating Batches and Logs (90-day window): ${TOTAL_BATCHES} batches`);
    if (TOTAL_BATCHES === 0) {
        console.warn('⚠️ RICH_SEED_BATCH_COUNT=0: no batches/logs will be created, so Active Production and log-driven analytics will appear empty.');
    }

    const now = new Date();
    const batchTypes = ['Standard Polo', 'Executive Shirt', 'Summer T-Shirt', 'Denim Jacket', 'Cotton Trousers'];
    const forcedActiveBatchCount = Math.min(TOTAL_BATCHES, MIN_ACTIVE_BATCHES);

    for (let i = 1; i <= TOTAL_BATCHES; i++) {
        const shouldForceActive = i <= forcedActiveBatchCount;
        const daysAgo = shouldForceActive ? Math.floor(Math.random() * 2) : Math.floor(Math.random() * 90);
        const batchDate = new Date(now);
        batchDate.setDate(now.getDate() - daysAgo);
        if (shouldForceActive) {
            batchDate.setHours(now.getHours() - Math.floor(Math.random() * 6), Math.floor(Math.random() * 60), 0, 0);
        }

        const totalQty = 50 + Math.floor(Math.random() * 450);
        const type = batchTypes[Math.floor(Math.random() * batchTypes.length)];

        const batch = await prisma.batch.create({
            data: {
                batchNumber: `B${batchDate.getFullYear()}${String(batchDate.getMonth() + 1).padStart(2, '0')}${String(batchDate.getDate()).padStart(2, '0')}-${String(i).padStart(3, '0')}`,
                briefTypeName: type,
                totalQuantity: totalQty,
                usableQuantity: 0,
                currentStage: 'CUTTING',
                status: shouldForceActive || daysAgo < 2 ? 'IN_PROGRESS' : 'COMPLETED',
                createdAt: batchDate
            }
        });

        let currentTime = new Date(batchDate);
        let currentQty = totalQty;
        const stagesCompleted = shouldForceActive || daysAgo < 2 ? 1 + Math.floor(Math.random() * 4) : 6;

        for (let sIdx = 0; sIdx < stagesCompleted; sIdx++) {
            const stage = stages[sIdx];
            const stageOperators = operators.filter((o) => o.stage === stage);
            const stageMachines = machines.filter((m) => m.stage === stage);

            const operator = stageOperators[Math.floor(Math.random() * stageOperators.length)];
            const machine = stageMachines.length > 0 ? stageMachines[Math.floor(Math.random() * stageMachines.length)] : null;

            const durationHrs = 1 + Math.random() * 4;
            const startTime = new Date(currentTime);
            const endTime = new Date(startTime);
            endTime.setHours(endTime.getHours() + durationHrs);

            let yieldLoss = 0;
            if (stage === 'QUALITY_CHECK') {
                yieldLoss = Math.floor(currentQty * (Math.random() * 0.05));
            }

            const qtyOut = currentQty - yieldLoss;
            const approvingManager = managers.find((m) => m.employeeCode.includes(stage.substring(0, 3)));

            await prisma.productionLog.create({
                data: {
                    batchId: batch.id,
                    stage,
                    operatorUserId: operator.id,
                    recordedByUserId: operator.id,
                    machineId: machine ? machine.id : null,
                    startTime,
                    endTime,
                    quantityIn: currentQty,
                    quantityOut: qtyOut,
                    approvalStatus: 'APPROVED',
                    approvedByUserId: approvingManager ? approvingManager.id : null,
                    approvedAt: endTime,
                    createdAt: startTime
                }
            });

            if (stage === 'QUALITY_CHECK' && yieldLoss > 0) {
                const defectCodes = ['STITCH_FRAY', 'FABRIC_TEAR', 'COLOR_BLEED', 'SIZE_MISMATCH', 'BUTTON_MISSING'];
                await prisma.defectRecord.create({
                    data: {
                        batchId: batch.id,
                        stage: 'QUALITY_CHECK',
                        defectCode: defectCodes[Math.floor(Math.random() * defectCodes.length)],
                        quantity: yieldLoss,
                        severity: yieldLoss > 10 ? 'MAJOR' : 'MINOR',
                        detectedByUserId: operator.id,
                        createdAt: endTime
                    }
                });
            }

            await prisma.batch.update({
                where: { id: batch.id },
                data: {
                    currentStage: stage,
                    usableQuantity: sIdx === 5 ? qtyOut : 0,
                    defectiveQuantity: { increment: yieldLoss }
                }
            });

            currentQty = qtyOut;
            currentTime = new Date(endTime);
            currentTime.setMinutes(currentTime.getMinutes() + 15);
        }

        if (i % 25 === 0 || i === TOTAL_BATCHES) {
            console.log(`   ⏳ Progress: ${i}/${TOTAL_BATCHES} batches generated`);
        }
    }

    console.log('🧠 Generating Daily AI Reports (7-day window)...');
    for (let day = 6; day >= 0; day--) {
        const reportDate = new Date(now);
        reportDate.setDate(now.getDate() - day);
        reportDate.setUTCHours(0, 0, 0, 0);

        const unitsProcessed = 3000 + Math.floor(Math.random() * 1300);
        const defectRate = Number((1.6 + Math.random() * 1.8).toFixed(2));
        const batchCount = Math.max(1, Math.floor(Math.max(TOTAL_BATCHES, 1) / 7));
        const metrics = buildDailyMetrics({ reportDate, unitsProcessed, defectRate, batchCount });

        await prisma.dailyReport.upsert({
            where: { reportDate },
            update: {
                summary: `Executive synthesis for ${reportDate.toISOString().split('T')[0]}`,
                metrics,
                generatedAt: new Date()
            },
            create: {
                reportDate,
                summary: `Executive synthesis for ${reportDate.toISOString().split('T')[0]}`,
                metrics
            }
        });
    }

    console.log('✅ Rich Seeding completed successfully!');
    console.log(`Created: ${managers.length} Managers, ${operators.length} Operators, ${TOTAL_BATCHES} Batches`);
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        if (seedLockAcquired) {
            await releaseSeedLock();
        }
        await prisma.$disconnect();
    });
