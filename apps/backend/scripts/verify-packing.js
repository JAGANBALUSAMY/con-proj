const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Relative paths within apps/backend/
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
        res.data = null; // reset data on status change
        return res;
    };
    res.json = (data) => {
        res.data = data;
        return res;
    };
    return res;
};

async function runTest() {
    console.log('--- Starting Packing Logic Verification ---');
    let manager, operator, batch, logId, boxId;

    try {
        const suffix = Date.now();

        // 1. Setup Data
        console.log(' creating manager...');
        manager = await prisma.user.create({
            data: {
                employeeCode: `mgr_pack_${suffix}`,
                email: `mgr_pack_${suffix}@test.com`,
                password: 'hash',
                fullName: 'Packing Manager',
                role: 'MANAGER',
                verificationStatus: 'VERIFIED'
            }
        });
        await prisma.sectionAssignment.create({
            data: { userId: manager.id, stage: 'PACKING' }
        });
        manager = await prisma.user.findUnique({ where: { id: manager.id }, include: { sectionAssignments: true } });

        console.log(' creating operator...');
        operator = await prisma.user.create({
            data: {
                employeeCode: `op_pack_${suffix}`,
                email: `op_pack_${suffix}@test.com`,
                password: 'hash',
                fullName: 'Packing Operator',
                role: 'OPERATOR',
                verificationStatus: 'VERIFIED',
                createdByUserId: manager.id
            }
        });
        await prisma.sectionAssignment.create({
            data: { userId: operator.id, stage: 'PACKING' }
        });

        console.log(' creating batch in PACKING stage...');
        batch = await prisma.batch.create({
            data: {
                batchNumber: `BATCH-P-${suffix}`,
                briefTypeName: 'Test Brief',
                totalQuantity: 200,
                usableQuantity: 200,
                defectiveQuantity: 0,
                scrappedQuantity: 0,
                currentStage: 'PACKING',
                status: 'IN_PROGRESS'
            }
        });

        // 2. Test Invalid Quantity In (Partial Packing attempt)
        console.log('\n--- Test 1: Invalid Quantity In (Should Fail) ---');
        const reqInvalidIn = {
            user: { userId: operator.id },
            body: {
                batchId: batch.id,
                startTime: new Date().toISOString(),
                endTime: new Date().toISOString(),
                quantityIn: 100 // Should contain all 200
            }
        };
        const resInvalidIn = mockRes();
        await createProductionLog(reqInvalidIn, resInvalidIn);

        if (resInvalidIn.statusCode === 400) {
            console.log('✅ Correctly rejected quantityIn mismatch');
        } else {
            throw new Error(`Failed: Should have rejected quantityIn=100. Got status ${resInvalidIn.statusCode} : ${JSON.stringify(resInvalidIn.data)}`);
        }

        // 3. Test Invalid Quantity Out (Reduction attempt)
        console.log('\n--- Test 2: Quantity Reduction (Should Fail) ---');
        const reqInvalidOut = {
            user: { userId: operator.id },
            body: {
                batchId: batch.id,
                startTime: new Date().toISOString(),
                endTime: new Date().toISOString(),
                quantityIn: 200,
                quantityOut: 199 // Reduction attempt
            }
        };
        const resInvalidOut = mockRes();
        await createProductionLog(reqInvalidOut, resInvalidOut);

        if (resInvalidOut.statusCode === 400) {
            console.log('✅ Correctly rejected quantity reduction');
        } else {
            throw new Error(`Failed: Should have rejected quantityOut=199. Got status ${resInvalidOut.statusCode} : ${JSON.stringify(resInvalidOut.data)}`);
        }

        // 4. Test Valid Packing Log Creation
        console.log('\n--- Test 3: Valid Packing Log Creation ---');
        const reqValid = {
            user: { userId: operator.id },
            body: {
                batchId: batch.id,
                startTime: new Date().toISOString(),
                endTime: new Date().toISOString(),
                quantityIn: 200,
                quantityOut: 200
            }
        };
        const resValid = mockRes();
        await createProductionLog(reqValid, resValid);

        if (resValid.statusCode !== 201) {
            throw new Error(`Failed to create log: ${JSON.stringify(resValid.data)}`);
        }
        logId = resValid.data.log.id;
        console.log('✅ Log created. ID:', logId);

        if (resValid.data.log.approvalStatus !== 'PENDING') {
            throw new Error(`FAIL: Log created with status ${resValid.data.log.approvalStatus}, expected PENDING`);
        }

        // 5. Test Manager Approval & Box Creation
        console.log('\n--- Test 4: Approval & Box Creation (Transactional) ---');
        const reqApprove = {
            user: { userId: manager.id, sections: ['PACKING'] },
            params: { logId: logId.toString() }
        };
        const resApprove = mockRes();
        await approveProductionLog(reqApprove, resApprove);

        if (resApprove.statusCode !== 200) {
            throw new Error(`Failed to approve: ${JSON.stringify(resApprove.data)}`);
        }
        console.log('✅ Log Approved');

        // Check Batch Status
        const batchAfter = await prisma.batch.findUnique({ where: { id: batch.id } });
        console.log(` Batch Status: ${batchAfter.status}`);
        console.log(` Batch Stage: ${batchAfter.currentStage}`);

        if (batchAfter.status !== 'COMPLETED') throw new Error(`FAIL: Batch status is ${batchAfter.status}, expected COMPLETED`);
        if (batchAfter.currentStage !== 'PACKING') throw new Error(`FAIL: Batch stage is ${batchAfter.currentStage}, expected PACKING (no advancements beyond final stage)`);

        // Check Box Creation
        const box = await prisma.box.findUnique({ where: { batchId: batch.id } });
        if (!box) throw new Error('FAIL: Box was not created automatically');
        console.log(`✅ Box Created: ${box.boxCode}, Status: ${box.status}, Qty: ${box.quantity}`);
        if (box.quantity !== 200) throw new Error('FAIL: Box quantity incorrect');
        boxId = box.id;

        // 6. Test Duplicate Box Prevention (Idempotency / strict rule)
        console.log('\n--- Test 5: Duplicate Box Prevention ---');
        // Let's create another valid log (simulating retry or another operator)
        const reqValid2 = {
            user: { userId: operator.id },
            body: {
                batchId: batch.id,
                startTime: new Date().toISOString(),
                endTime: new Date().toISOString(),
                quantityIn: 200,
                quantityOut: 200
            }
        };
        const resValid2 = mockRes();
        await createProductionLog(reqValid2, resValid2); // Create Log #2
        const logId2 = resValid2.data.log.id;

        // Try to approve Log #2
        const reqApprove2 = {
            user: { userId: manager.id, sections: ['PACKING'] },
            params: { logId: logId2.toString() }
        };
        const resApprove2 = mockRes();
        await approveProductionLog(reqApprove2, resApprove2);

        // Expect Failure (500 or 400 depending on how error propagated, but our controller catches error)
        // Actually our controller catches error and returns 500
        if (resApprove2.statusCode === 500 || resApprove2.statusCode === 400) {
            console.log('✅ Correctly prevented duplicate box creation (Approval failed)');
        } else {
            throw new Error(`FAIL: Should have failed to approve second packing log. Got status ${resApprove2.statusCode}`);
        }

        // 7. Test Shipment Status Update
        console.log('\n--- Test 6: Shipment Status Lifecycle ---');
        // Mark SHIPPED
        const reqShip = {
            user: { userId: manager.id, role: 'MANAGER' }, // Auth middleware simulated
            params: { id: boxId.toString() },
            body: { status: 'SHIPPED' }
        };
        const resShip = mockRes();
        await updateBoxStatus(reqShip, resShip);

        if (resShip.statusCode !== 200 || resShip.data.status !== 'SHIPPED') {
            throw new Error(`FAIL: Box update to SHIPPED failed. Got ${resShip.statusCode}`);
        }
        console.log('✅ Box marked SHIPPED');

        // Mark DELIVERED
        const reqDeliver = {
            user: { userId: manager.id, role: 'MANAGER' },
            params: { id: boxId.toString() },
            body: { status: 'DELIVERED' }
        };
        const resDeliver = mockRes();
        await updateBoxStatus(reqDeliver, resDeliver);

        if (resDeliver.statusCode !== 200 || resDeliver.data.status !== 'DELIVERED') {
            throw new Error(`FAIL: Box update to DELIVERED failed. Got ${resDeliver.statusCode}`);
        }
        console.log('✅ Box marked DELIVERED');

        console.log('\n✅ PACKING & EXPORT VERIFICATION PASSED!');

    } catch (e) {
        console.error('Test Failed details in error-packing.log');
        fs.writeFileSync('error-packing.log', e.toString() + '\n' + JSON.stringify(e, null, 2));
        process.exit(1);
    } finally {
        // Cleanup
        if (logId) await prisma.productionLog.delete({ where: { id: logId } }).catch(() => { });
        if (boxId) await prisma.box.delete({ where: { id: boxId } }).catch(() => { });
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
