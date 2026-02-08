const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnose() {
    try {
        console.log('--- STARTING DIAGNOSIS ---');

        // 1. Find the user
        const user = await prisma.user.findUnique({
            where: { employeeCode: 'EMP001' },
            include: { sectionAssignments: true }
        });

        if (!user) {
            console.log('❌ Error: User EMP001 not found');
            return;
        }

        const managerId = user.id;
        const assignedSections = user.sectionAssignments.map(sa => sa.stage);

        console.log('✅ Manager ID:', managerId);
        console.log('✅ Assigned Sections:', assignedSections);

        // 2. Fetch Team
        console.log('--- Step 1: Fetching Team ---');
        const team = await prisma.user.findMany({
            where: { createdByUserId: managerId, role: 'OPERATOR' },
            select: { id: true, fullName: true, employeeCode: true, verificationStatus: true }
        });
        console.log('✅ Team size:', team.length);
        const operatorIds = team.map(op => op.id);

        // 3. Fetch Approval Queue
        console.log('--- Step 2: Fetching Approval Queue ---');
        const approvalQueue = await prisma.productionLog.findMany({
            where: {
                operatorUserId: { in: operatorIds },
                approvalStatus: 'PENDING',
                stage: { in: assignedSections }
            },
            include: {
                batch: { select: { batchNumber: true, briefTypeName: true } },
                operator: { select: { fullName: true } }
            }
        });
        console.log('✅ Approval Queue size:', approvalQueue.length);

        // 4. Fetch Rework Queue
        console.log('--- Step 3: Fetching Rework Queue ---');
        const reworkQueue = await prisma.reworkRecord.findMany({
            where: {
                operatorUserId: { in: operatorIds },
                approvalStatus: 'PENDING'
            },
            include: {
                batch: { select: { batchNumber: true } },
                operator: { select: { fullName: true } }
            }
        });
        console.log('✅ Rework Queue size:', reworkQueue.length);

        // 5. Fetch Active Batches
        console.log('--- Step 4: Fetching Active Batches ---');
        const activeBatches = await prisma.batch.findMany({
            where: {
                currentStage: { in: assignedSections },
                status: 'IN_PROGRESS'
            }
        });
        console.log('✅ Active Batches size:', activeBatches.length);

        console.log('--- DIAGNOSIS SUCCESSFUL ---');
    } catch (err) {
        console.error('❌ DIAGNOSIS FAILED');
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

diagnose();
