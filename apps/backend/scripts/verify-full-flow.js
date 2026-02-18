const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const { createBatch } = require('../src/controllers/dashboardController');
const { createProductionLog } = require('../src/controllers/productionController');
const { approveProductionLog } = require('../src/controllers/approvalController');
const { updateBoxStatus } = require('../src/controllers/boxController');

// Mock Req/Res
const mockRes = () => {
    const res = {};
    res.statusCode = 200;
    res.data = null;
    res.status = (code) => {
        res.statusCode = code;
        res.data = null;
        return res;
    };
    res.json = (data) => {
        res.data = data;
        return res;
    };
    return res;
};

async function runTest() {
    console.log('--- Starting Full Batch-to-Shipping Verification ---');

    // Trackers
    const managers = {};
    const operators = {};
    let batchId, boxId;
    const stages = ['CUTTING', 'STITCHING', 'QUALITY_CHECK', 'REWORK', 'LABELING', 'FOLDING', 'PACKING'];

    try {
        const suffix = Date.now();

        // 1. Setup Logic: Create Manager & Operator for EACH stage
        // We need this because of strict section isolation
        console.log('Creating users for all stages...');

        for (const stage of stages) {
            // Manager
            const mgr = await prisma.user.create({
                data: {
                    employeeCode: `mgr_${stage}_${suffix}`,
                    email: `mgr_${stage}_${suffix}@test.com`,
                    password: 'hash',
                    fullName: `Manager ${stage}`,
                    role: 'MANAGER',
                    verificationStatus: 'VERIFIED'
                }
            });
            await prisma.sectionAssignment.create({ data: { userId: mgr.id, stage } });
            managers[stage] = { ...mgr, sections: [stage] }; // Mock req.user structure

            // Operator
            const op = await prisma.user.create({
                data: {
                    employeeCode: `op_${stage}_${suffix}`,
                    email: `op_${stage}_${suffix}@test.com`,
                    password: 'hash',
                    fullName: `Operator ${stage}`,
                    role: 'OPERATOR',
                    verificationStatus: 'VERIFIED',
                    createdByUserId: mgr.id
                }
            });
            await prisma.sectionAssignment.create({ data: { userId: op.id, stage } });
            operators[stage] = { ...op, userId: op.id };
        }
        console.log('✅ Users created.');

        // 2. Create Batch (As CUTTING Manager)
        console.log('\n--- Step 1: Create Batch ---');
        const reqBatch = {
            user: { userId: managers['CUTTING'].id, role: 'MANAGER', sections: ['CUTTING'] },
            body: {
                batchNumber: `FULL-FLOW-${suffix}`,
                briefTypeName: 'Full Test',
                totalQuantity: 100
            }
        };
        const resBatch = mockRes();
        await createBatch(reqBatch, resBatch);

        if (resBatch.statusCode !== 201) throw new Error(`Batch creation failed: ${JSON.stringify(resBatch.data)}`);
        batchId = resBatch.data.batch.id;
        console.log(`✅ Batch Created: ${resBatch.data.batch.batchNumber} (Qty: ${resBatch.data.batch.totalQuantity})`);

        // Check initial state
        const b0 = await prisma.batch.findUnique({ where: { id: batchId } });
        console.log(`   Initial State: Stage=${b0.currentStage}, Status=${b0.status}, Usable=${b0.usableQuantity}`);
        if (b0.usableQuantity !== 0) throw new Error('Initial usableQuantity should be 0');


        // 3. Loop through stages
        let currentQty = 100; // Expected flow quantity

        for (const stage of stages) {
            console.log(`\n--- Processing Stage: ${stage} ---`);
            const op = operators[stage];
            const mgr = managers[stage];

            // A. Create Log
            const reqLog = {
                user: { userId: op.id },
                body: {
                    batchId,
                    startTime: new Date().toISOString(),
                    endTime: new Date().toISOString(),
                    quantityIn: stage === 'CUTTING' ? undefined : currentQty, // Cutting in is raw
                    quantityOut: currentQty,
                    notes: `Processed ${stage}`
                }
            };

            // Special handling for CUTTING input (usually undefined/raw, but controller generic validation requires In/Out?)
            // Controller lines 145: quantityIn: quantityIn ? parseInt : null.
            // So for Cutting, we might pass quantityIn logic?
            // productionController check: "Labeling must process exact usable". Cutting has no such check.
            // Let's pass quantityIn=100 for consistency, assuming 100 units worth of material.
            reqLog.body.quantityIn = currentQty;

            const resLog = mockRes();
            await createProductionLog(reqLog, resLog);

            if (resLog.statusCode !== 201) throw new Error(`Log creation failed at ${stage}: ${JSON.stringify(resLog.data)}`);
            const logId = resLog.data.log.id;
            console.log(`   Log Created (ID: ${logId})`);

            // B. Approve Log
            // Need to reload user for approval to match req.user structure if not fully mocked above
            // managers[stage] has { id, role, sections: [stage] }. Should be enough.
            const reqApprove = {
                user: { userId: mgr.id, sections: [stage] },
                params: { logId: logId.toString() }
            };
            const resApprove = mockRes();
            await approveProductionLog(reqApprove, resApprove);

            if (resApprove.statusCode !== 200) throw new Error(`Approval failed at ${stage}: ${JSON.stringify(resApprove.data)}`);
            console.log(`   Log Approved.`);

            // C. Verify State After Approval
            const b = await prisma.batch.findUnique({ where: { id: batchId } });
            console.log(`   Batch State: Stage=${b.currentStage}, Status=${b.status}, Usable=${b.usableQuantity}`);

            if (stage === 'CUTTING') {
                if (b.usableQuantity !== 100) throw new Error(`FAIL: CUTTING approval did not update usableQuantity. Got ${b.usableQuantity}`);
                if (b.status !== 'IN_PROGRESS') throw new Error(`FAIL: Batch status not IN_PROGRESS`);
            } else if (stage === 'PACKING') {
                if (b.status !== 'COMPLETED') throw new Error(`FAIL: Batch status not COMPLETED`);
                if (b.currentStage !== 'PACKING') throw new Error(`FAIL: Batch stage moved for Packing (Should stay PACKING)`);
            } else {
                // Intermediate stages
                // Verify stage advanced
                const nextStageIdx = stages.indexOf(stage) + 1;
                const expectedStage = stages[nextStageIdx];
                if (b.currentStage !== expectedStage) throw new Error(`FAIL: Stage did not advance. Got ${b.currentStage}, expected ${expectedStage}`);
            }
        }

        // 4. Verify Export
        console.log('\n--- Step 4: Verify Export ---');
        const box = await prisma.box.findUnique({ where: { batchId } });
        if (!box) throw new Error('FAIL: Box not created');
        console.log(`✅ Box Found: ${box.boxCode}`);
        boxId = box.id;

        // Mark Shipped
        const reqShip = {
            user: { userId: managers['PACKING'].id, role: 'MANAGER' },
            params: { id: boxId.toString() },
            body: { status: 'SHIPPED' }
        };
        const resShip = mockRes();
        await updateBoxStatus(reqShip, resShip);
        if (resShip.statusCode !== 200) throw new Error('FAIL: update to SHIPPED');
        console.log(`✅ Status updated to SHIPPED`);

        // Mark Delivered
        const reqDeliver = {
            user: { userId: managers['PACKING'].id, role: 'MANAGER' },
            params: { id: boxId.toString() },
            body: { status: 'DELIVERED' }
        };
        const resDeliver = mockRes();
        await updateBoxStatus(reqDeliver, resDeliver);
        if (resDeliver.statusCode !== 200) throw new Error('FAIL: update to DELIVERED');
        console.log(`✅ Status updated to DELIVERED`);

        console.log('\n✅ FULL END-TO-END VERIFICATION PASSED!');

    } catch (e) {
        console.error('Test Failed:', e.message);
        console.error(e);
        process.exit(1);
    } finally {
        // Cleanup
        // ... (Simplified cleanup, or just leave it for dev DB reset)
        await prisma.$disconnect();
    }
}

runTest();
