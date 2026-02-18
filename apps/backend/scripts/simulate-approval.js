const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const logId = 8;
    console.log(`Simulating approval for log #${logId}...`);

    try {
        const log = await prisma.productionLog.findUnique({
            where: { id: logId },
            include: { operator: true, batch: true }
        });

        if (!log) throw new Error('Log not found');

        console.log(`Current Log Stage: ${log.stage}`);
        console.log(`Current Batch Stage: ${log.batch.currentStage}`);

        const result = await prisma.$transaction(async (tx) => {
            console.log('Inside transaction...');

            const currentLog = await tx.productionLog.findUnique({
                where: { id: log.id },
                select: { approvalStatus: true }
            });
            console.log('Refetched Log Status:', currentLog.approvalStatus);

            const currentBatch = await tx.batch.findUnique({
                where: { id: log.batchId }
            });
            console.log('Refetched Batch Stage:', currentBatch.currentStage);

            const existingApproved = await tx.productionLog.findFirst({
                where: {
                    batchId: log.batchId,
                    stage: log.stage,
                    approvalStatus: 'APPROVED'
                }
            });
            if (existingApproved) {
                console.log('⚠️ Stage already approved');
            }

            const stages = ['CUTTING', 'STITCHING', 'QUALITY_CHECK', 'REWORK', 'LABELING', 'FOLDING', 'PACKING'];
            const currentIndex = stages.indexOf(currentBatch.currentStage);

            console.log('Current Index:', currentIndex);

            if (currentBatch.currentStage === 'PACKING') {
                console.log('Handling Packing logic...');
            } else {
                const nextStage = stages[currentIndex + 1];
                console.log('Next Stage:', nextStage);
            }

            console.log('Simulation complete. No errors would be thrown in logic blocks.');
            return { status: 'OK' };
        });

        console.log('Transaction Result:', result);
    } catch (e) {
        console.error('❌ SIMULATION FAILED:', e.message);
        console.error(e.stack);
    }
}

main().finally(() => prisma.$disconnect());
