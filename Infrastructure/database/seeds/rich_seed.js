const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Starting Rich Production Data Seeding...');

    // 0. Clean Database
    console.log('🧹 Cleaning existing production data...');
    const cleanup = async (modelName) => {
        try {
            if (prisma[modelName]) {
                await prisma[modelName].deleteMany();
                console.log(`   ✅ ${modelName} cleaned`);
            } else {
                console.log(`   ⚠️ ${modelName} model not found in Prisma client`);
            }
        } catch (err) {
            console.log(`   ❌ Failed to clean ${modelName}: ${err.message}`);
        }
    };

    const modelsToClean = [
        'defectRecord', 'reworkRecord', 'productionLog',
        'sectionTransferRequest', 'sectionAssignment', 'box',
        'batch', 'machine', 'dailyReport', 'user'
    ];

    for (const model of modelsToClean) {
        await cleanup(model);
    }

    const hashedPassword = await bcrypt.hash('123456', 10);

    // 1. Create Admin
    console.log('👤 Creating/Updating Admin...');
    await prisma.user.upsert({
        where: { employeeCode: 'ADMIN' },
        update: { fullName: 'System Administrator', password: hashedPassword, role: 'ADMIN', status: 'ACTIVE', verificationStatus: 'VERIFIED' },
        create: {
            employeeCode: 'ADMIN',
            fullName: 'System Administrator',
            password: hashedPassword,
            role: 'ADMIN',
            status: 'ACTIVE',
            verificationStatus: 'VERIFIED',
        }
    });

    // 2. Setup Stages and Lists
    const stages = ['CUTTING', 'STITCHING', 'QUALITY_CHECK', 'LABELING', 'FOLDING', 'PACKING'];
    const managers = [];
    const operators = [];
    const machines = [];

    const firstNames = ['James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda', 'David', 'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];

    const getRandomName = () => `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;

    // 3. Create Managers (2 per stage)
    console.log('👨‍💼 Creating Managers...');
    for (const stage of stages) {
        for (let i = 1; i <= 2; i++) {
            const mCode = `MGR_${stage.substring(0, 3)}_${i.toString().padStart(2, '0')}`;
            const m = await prisma.user.upsert({
                where: { employeeCode: mCode },
                update: { fullName: `${getRandomName()} (${stage} Mgr)`, role: 'MANAGER', status: 'ACTIVE', verificationStatus: 'VERIFIED' },
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
            managers.push(m);
        }
    }

    // 4. Create Operators (5 per stage)
    console.log('👷 Creating Operators...');
    for (const stage of stages) {
        const stageManager = managers.find(m => m.employeeCode.startsWith(`MGR_${stage.substring(0, 3)}`));
        for (let i = 1; i <= 5; i++) {
            const opCode = `OP_${stage.substring(0, 3)}_${i.toString().padStart(2, '0')}`;
            const op = await prisma.user.upsert({
                where: { employeeCode: opCode },
                update: { fullName: getRandomName(), role: 'OPERATOR', status: 'ACTIVE', verificationStatus: 'VERIFIED', createdByUserId: stageManager ? stageManager.id : null },
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
            operators.push({ ...op, stage });
        }
    }

    // 5. Create Machines (3 per stage)
    console.log('🤖 Creating Machines...');
    for (const stage of stages) {
        for (let i = 1; i <= 3; i++) {
            const mac = await prisma.machine.create({
                data: {
                    machineCode: `${stage.substring(0, 3)}-M-${i.toString().padStart(2, '0')}`,
                    name: `${stage} Machine ${i}`,
                    type: stage === 'STITCHING' ? 'SEWING' : stage === 'CUTTING' ? 'LASER' : 'GENERAL',
                    status: 'OPERATIONAL'
                }
            });
            machines.push({ ...mac, stage });
        }
    }

    // 6. Create Batches and Logs over 90 Days
    console.log('📦 Generating Batches and Logs (90-day window)...');
    const now = new Date();
    const batchTypes = ['Standard Polo', 'Executive Shirt', 'Summer T-Shirt', 'Denim Jacket', 'Cotton Trousers'];

    for (let i = 1; i <= 200; i++) {
        // Random date within last 90 days
        const daysAgo = Math.floor(Math.random() * 90);
        const batchDate = new Date(now);
        batchDate.setDate(now.getDate() - daysAgo);

        const totalQty = 50 + Math.floor(Math.random() * 450);
        const type = batchTypes[Math.floor(Math.random() * batchTypes.length)];

        const batch = await prisma.batch.create({
            data: {
                batchNumber: `B${batchDate.getFullYear()}${(batchDate.getMonth() + 1).toString().padStart(2, '0')}${batchDate.getDate().toString().padStart(2, '0')}-${i.toString().padStart(3, '0')}`,
                briefTypeName: type,
                totalQuantity: totalQty,
                usableQuantity: 0,
                currentStage: 'CUTTING',
                status: daysAgo < 2 ? 'IN_PROGRESS' : 'COMPLETED',
                createdAt: batchDate
            }
        });

        // Generate logs for this batch
        let currentTime = new Date(batchDate);
        let currentQty = totalQty;

        // Determine how many stages this batch completed
        const stagesCompleted = daysAgo < 2 ? 1 + Math.floor(Math.random() * 4) : 6;

        for (let sIdx = 0; sIdx < stagesCompleted; sIdx++) {
            const stage = stages[sIdx];
            const stageOperators = operators.filter(o => o.stage === stage);
            const stageMachines = machines.filter(m => m.stage === stage);

            const operator = stageOperators[Math.floor(Math.random() * stageOperators.length)];
            const machine = stageMachines.length > 0 ? stageMachines[Math.floor(Math.random() * stageMachines.length)] : null;

            const durationHrs = 1 + Math.random() * 4;
            const startTime = new Date(currentTime);
            const endTime = new Date(startTime);
            endTime.setHours(endTime.getHours() + durationHrs);

            // Random yield loss
            let yieldLoss = 0;
            if (stage === 'QUALITY_CHECK') {
                yieldLoss = Math.floor(currentQty * (Math.random() * 0.05)); // 0-5% defects
            }

            const qtyOut = currentQty - yieldLoss;

            await prisma.productionLog.create({
                data: {
                    batchId: batch.id,
                    stage: stage,
                    operatorUserId: operator.id,
                    recordedByUserId: operator.id,
                    machineId: machine ? machine.id : null,
                    startTime: startTime,
                    endTime: endTime,
                    quantityIn: currentQty,
                    quantityOut: qtyOut,
                    approvalStatus: 'APPROVED',
                    approvedByUserId: managers.find(m => m.employeeCode.includes(stage.substring(0, 3)))?.id,
                    approvedAt: endTime,
                    createdAt: startTime
                }
            });

            // Create Defect Records in QC stage
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

            // Update batch state
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
            currentTime.setMinutes(currentTime.getMinutes() + 15); // Gap between stages
        }
    }

    console.log('✅ Rich Seeding completed successfully!');
    console.log(`Created: ${managers.length} Managers, ${operators.length} Operators, 200 Batches`);
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
