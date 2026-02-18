const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Relative paths within apps/backend/
const { createProductionLog } = require('../src/controllers/productionController');
const { approveProductionLog } = require('../src/controllers/approvalController');

// Mock Req/Res
const mockRes = () => {
    const res = {};
    res.statusCode = 200;
    res.data = null;
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        res.data = data;
        return res;
    };
    return res;
};

async function runTest() {
    console.log('--- Starting Labeling Logic Verification ---');
    let manager, operator, batch, logId;

    try {
        const suffix = Date.now();

        // 1. Setup Data
        console.log(' creating manager...');
        manager = await prisma.user.create({
            data: {
                employeeCode: `mgr_label_${suffix}`,
                email: `mgr_label_${suffix}@test.com`,
                password: 'hash',
                fullName: 'Label Manager',
                role: 'MANAGER',
                verificationStatus: 'VERIFIED'
            }
        });
        await prisma.sectionAssignment.create({
            data: { userId: manager.id, stage: 'LABELING' }
        });
        manager = await prisma.user.findUnique({ where: { id: manager.id }, include: { sectionAssignments: true } });

        console.log(' creating operator...');
        operator = await prisma.user.create({
            data: {
                employeeCode: `op_label_${suffix}`,
                email: `op_label_${suffix}@test.com`,
                password: 'hash',
                fullName: 'Label Operator',
                role: 'OPERATOR',
                verificationStatus: 'VERIFIED',
                createdByUserId: manager.id
            }
        });
        await prisma.sectionAssignment.create({
            data: { userId: operator.id, stage: 'LABELING' }
        });

        console.log(' creating batch in LABELING stage...');
        batch = await prisma.batch.create({
            data: {
                batchNumber: `BATCH-L-${suffix}`,
                briefTypeName: 'Test Type',
                totalQuantity: 100,
                usableQuantity: 90,
                defectiveQuantity: 5,
                scrappedQuantity: 5,
                currentStage: 'LABELING', // Starting directly in LABELING
                status: 'IN_PROGRESS'
            }
        });

        // 2. Test Invalid Quantity In
        console.log('\n--- Test 1: Invalid Quantity In (Should Fail) ---');
        const reqInvalidIn = {
            user: { userId: operator.id },
            body: {
                batchId: batch.id,
                startTime: new Date().toISOString(),
                endTime: new Date().toISOString(),
                quantityIn: 50 // Should be 90
            }
        };
        const resInvalidIn = mockRes();
        await createProductionLog(reqInvalidIn, resInvalidIn);

        if (resInvalidIn.statusCode === 400) {
            console.log('✅ Correctly rejected invalid quantityIn');
        } else {
            throw new Error(`Failed: Should have rejected quantityIn=50. Got status ${resInvalidIn.statusCode}`);
        }

        // 3. Test Invalid Quantity Out change
        console.log('\n--- Test 2: Quantity Change (Should Fail) ---');
        const reqInvalidOut = {
            user: { userId: operator.id },
            body: {
                batchId: batch.id,
                startTime: new Date().toISOString(),
                endTime: new Date().toISOString(),
                quantityIn: 90,
                quantityOut: 89 // Should be 90
            }
        };
        const resInvalidOut = mockRes();
        await createProductionLog(reqInvalidOut, resInvalidOut);

        if (resInvalidOut.statusCode === 400) {
            console.log('✅ Correctly rejected quantity change');
        } else {
            throw new Error(`Failed: Should have rejected quantity change. Got status ${resInvalidOut.statusCode}`);
        }

        // 4. Test Valid Creation
        console.log('\n--- Test 3: Valid Creation ---');
        const reqValid = {
            user: { userId: operator.id },
            body: {
                batchId: batch.id,
                startTime: new Date().toISOString(),
                endTime: new Date().toISOString(),
                quantityIn: 90,
                quantityOut: 90
            }
        };
        const resValid = mockRes();
        await createProductionLog(reqValid, resValid);

        if (resValid.statusCode !== 201) {
            throw new Error(`Failed to create log: ${JSON.stringify(resValid.data)}`);
        }
        logId = resValid.data.log.id;
        console.log('✅ Log created. ID:', logId);

        // 5. Test Approval and Transition
        console.log('\n--- Test 4: Approval & Transition ---');
        const reqApprove = {
            user: { userId: manager.id, sections: ['LABELING'] },
            params: { logId: logId.toString() }
        };
        const resApprove = mockRes();
        await approveProductionLog(reqApprove, resApprove);

        if (resApprove.statusCode !== 200) {
            throw new Error(`Failed to approve: ${JSON.stringify(resApprove.data)}`);
        }

        const batchAfter = await prisma.batch.findUnique({ where: { id: batch.id } });
        console.log(`Batch Stage after Approval: ${batchAfter.currentStage}`);

        if (batchAfter.currentStage !== 'FOLDING') {
            throw new Error(`FAIL: Expected FOLDING, got ${batchAfter.currentStage}`);
        }
        console.log('✅ Batch moved to FOLDING');

        console.log('\n✅ LABELING VERIFICATION PASSED!');

    } catch (e) {
        console.error('Test Failed details in error-labeling.log');
        fs.writeFileSync('error-labeling.log', e.toString() + '\n' + JSON.stringify(e, null, 2));
        process.exit(1);
    } finally {
        // Cleanup
        if (logId) await prisma.productionLog.delete({ where: { id: logId } }).catch(() => { });
        if (batch) await prisma.batch.delete({ where: { id: batch.id } }).catch(() => { });
        if (operator) {
            await prisma.sectionAssignment.deleteMany({ where: { userId: operator.id } }).catch(() => { });
            await prisma.user.delete({ where: { id: operator.id } }).catch(() => { });
        }
        if (manager) {
            await prisma.sectionAssignment.deleteMany({ where: { userId: manager.id } }).catch(() => { });
            await prisma.user.delete({ where: { id: manager.id } }).catch(() => { });
        }
        await prisma.$disconnect();
    }
}

runTest();
