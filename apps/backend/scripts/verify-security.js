const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const { createProductionLog } = require('../src/controllers/productionController');
const { approveProductionLog } = require('../src/controllers/approvalController');

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
    console.log('--- Starting Security & Negative Verification ---');

    let mgrA, mgrB, opA, batchA, logId;

    try {
        const suffix = Date.now();

        // --- SETUP ---
        // Manager A (Section: CUTTING)
        mgrA = await prisma.user.create({
            data: {
                employeeCode: `mgr_cut_${suffix}`,
                email: `mgr_cut_${suffix}@test.com`,
                password: 'hash',
                fullName: 'Manager Cutting',
                role: 'MANAGER',
                verificationStatus: 'VERIFIED'
            }
        });
        await prisma.sectionAssignment.create({ data: { userId: mgrA.id, stage: 'CUTTING' } });

        // Manager B (Section: STITCHING)
        mgrB = await prisma.user.create({
            data: {
                employeeCode: `mgr_stich_${suffix}`,
                email: `mgr_stich_${suffix}@test.com`,
                password: 'hash',
                fullName: 'Manager Stitching',
                role: 'MANAGER',
                verificationStatus: 'VERIFIED'
            }
        });
        await prisma.sectionAssignment.create({ data: { userId: mgrB.id, stage: 'STITCHING' } });

        // Operator A (Section: CUTTING) - Created by Manager A
        opA = await prisma.user.create({
            data: {
                employeeCode: `op_cut_${suffix}`,
                email: `op_cut_${suffix}@test.com`,
                password: 'hash',
                fullName: 'Operator Cutting',
                role: 'OPERATOR',
                verificationStatus: 'VERIFIED',
                createdByUserId: mgrA.id
            }
        });
        await prisma.sectionAssignment.create({ data: { userId: opA.id, stage: 'CUTTING' } });

        // Batch A (Stage: STITCHING) - Intentionally ahead of Operator A
        batchA = await prisma.batch.create({
            data: {
                batchNumber: `NEG-TEST-${suffix}`,
                briefTypeName: 'Negative Test',
                totalQuantity: 100,
                usableQuantity: 100,
                currentStage: 'STITCHING', // Operator A is CUTTING
                status: 'IN_PROGRESS'
            }
        });


        // --- TEST 1: Operator logs in wrong section ---
        console.log('\n❌ Test 1: Operator logs in wrong section');
        const reqWrongSection = {
            user: { userId: opA.id },
            body: {
                batchId: batchA.id,
                startTime: new Date().toISOString(),
                endTime: new Date().toISOString(),
                quantityIn: 100,
                quantityOut: 100
            }
        };
        const resWrongSection = mockRes();
        await createProductionLog(reqWrongSection, resWrongSection);

        if (resWrongSection.statusCode === 403) {
            console.log('✅ PASSED: Correctly blocked with 403 Forbidden');
        } else {
            throw new Error(`FAIL: Expected 403, got ${resWrongSection.statusCode}`);
        }


        // --- SETUP FOR NEXT TESTS ---
        // Move Batch back to CUTTING so Op A can log
        await prisma.batch.update({ where: { id: batchA.id }, data: { currentStage: 'CUTTING' } });

        // Create a Valid Log
        const reqValid = {
            user: { userId: opA.id },
            body: {
                batchId: batchA.id,
                startTime: new Date().toISOString(),
                endTime: new Date().toISOString(),
                quantityIn: 100,
                quantityOut: 100
            }
        };
        const resValid = mockRes();
        await createProductionLog(reqValid, resValid);
        logId = resValid.data.log.id;
        console.log(`\n(Setup) Valid Log Created: ${logId}`);


        // --- TEST 2: Manager without section approves ---
        console.log('\n❌ Test 2: Manager without section approves');
        // Manager B (STITCHING) tries to approve CUTTING log
        const reqWrongMgr = {
            user: { userId: mgrB.id, sections: ['STITCHING'] }, // Role mocked via auth middleware usually, here direct
            params: { logId: logId.toString() }
        };
        const resWrongMgr = mockRes();
        await approveProductionLog(reqWrongMgr, resWrongMgr);

        if (resWrongMgr.statusCode === 403) {
            console.log('✅ PASSED: Correctly blocked with 403 Forbidden');
            // Verify error message for clarity? 
            // console.log(`   Message: ${resWrongMgr.data.error}`);
        } else {
            throw new Error(`FAIL: Expected 403, got ${resWrongMgr.statusCode}`);
        }


        // --- TEST 4: Approve (Valid) then Approve Again (Double Approval) ---
        console.log('\n❌ Test 4 (Part A): Valid Approval');
        const reqApprove = {
            user: { userId: mgrA.id, sections: ['CUTTING'] },
            params: { logId: logId.toString() }
        };
        const resApprove = mockRes();
        await approveProductionLog(reqApprove, resApprove);

        if (resApprove.statusCode === 200) {
            console.log('✅ Setup: Log Approved successfully');
        } else {
            throw new Error(`Setup Failed: Could not approve log. ${JSON.stringify(resApprove.data)}`);
        }

        console.log('\n❌ Test 4 (Part B): Approve already-approved log');
        const resDoubleApprove = mockRes();
        await approveProductionLog(reqApprove, resDoubleApprove);

        if (resDoubleApprove.statusCode === 400) {
            console.log('✅ PASSED: Correctly blocked with 400 Bad Request');
        } else {
            throw new Error(`FAIL: Expected 400, got ${resDoubleApprove.statusCode}`);
        }


        // --- TEST 3: Duplicate Box Creation Attempt ---
        console.log('\n❌ Test 3: Duplicate Box Creation');
        // Setup: Move batch to PACKING
        await prisma.batch.update({
            where: { id: batchA.id },
            data: { currentStage: 'PACKING', usableQuantity: 100 }
        });

        // 1. Create Packing Log 1
        const reqPack1 = { user: { userId: opA.id }, body: { batchId: batchA.id, startTime: new Date().toISOString(), endTime: new Date().toISOString(), quantityIn: 100, quantityOut: 100 } };
        // Valid log creation needs OpA to have PACKING section? 
        // Yes. Let's add PACKING to OpA and MgrA for this test.
        await prisma.sectionAssignment.createMany({
            data: [{ userId: opA.id, stage: 'PACKING' }, { userId: mgrA.id, stage: 'PACKING' }]
        });
        // We also need to reload current cached user/sections in memory if we were using real req.user, 
        // but here we manually construct req objects.

        const resPack1 = mockRes();
        await createProductionLog(reqPack1, resPack1);
        const logPack1 = resPack1.data.log.id;

        // 2. Approve Packing Log 1 (Creates Box)
        const reqApprovePack1 = { user: { userId: mgrA.id, sections: ['CUTTING', 'PACKING'] }, params: { logId: logPack1.toString() } };
        const resApprovePack1 = mockRes();
        await approveProductionLog(reqApprovePack1, resApprovePack1);

        if (resApprovePack1.statusCode !== 200) throw new Error('Setup Failed: Could not create first box');
        console.log('   (Setup) Box Created.');

        // 3. Create Packing Log 2 (For same batch - verifying duplicate BOX)
        const resPack2 = mockRes();
        await createProductionLog(reqPack1, resPack2);
        const logPack2 = resPack2.data.log.id;

        // 4. Try to Approve Packing Log 2
        console.log('   Attempting to approve second packing log for same batch...');
        const reqApprovePack2 = { user: { userId: mgrA.id, sections: ['CUTTING', 'PACKING'] }, params: { logId: logPack2.toString() } };
        const resApprovePack2 = mockRes();
        await approveProductionLog(reqApprovePack2, resApprovePack2);

        // Expect 500 (Duplicate Key / Transaction Error) or 400 if handled
        if (resApprovePack2.statusCode === 500 || resApprovePack2.statusCode === 400) {
            console.log('✅ PASSED: Correctly blocked duplicate box creation');
        } else {
            throw new Error(`FAIL: Expected 500/400, got ${resApprovePack2.statusCode}`);
        }

        console.log('\n✅ ALL SECURITY CHECKS PASSED!');

    } catch (e) {
        console.error('\n❌ TEST FAILED');
        console.error(e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

runTest();
