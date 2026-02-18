const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Relative paths within apps/backend/
const { createReworkLog } = require('../src/controllers/reworkController');
const { approveRework, rejectRework } = require('../src/controllers/approvalController');

// Mock Req/Res/Auth for Controllers
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
    console.log('--- Starting Rework Logic Verification (Backend Context) ---');
    let manager, operator, batch, reworkId;

    try {
        // 1. Setup Data
        const suffix = Date.now();

        console.log(' creating test manager...');
        manager = await prisma.user.create({
            data: {
                employeeCode: `mgr_stitch_${suffix}`,
                email: `mgr_${suffix}@test.com`,
                password: 'hash',
                fullName: 'Test Manager',
                role: 'MANAGER',
                verificationStatus: 'VERIFIED'
            }
        });

        await prisma.sectionAssignment.create({
            data: {
                userId: manager.id,
                stage: 'STITCHING'
            }
        });

        // Refetch manager with sections
        manager = await prisma.user.findUnique({
            where: { id: manager.id },
            include: { sectionAssignments: true }
        });

        console.log(' creating test operator...');
        operator = await prisma.user.create({
            data: {
                employeeCode: `op_rework_${suffix}`,
                email: `op_${suffix}@test.com`,
                password: 'hash',
                fullName: 'Test Operator',
                role: 'OPERATOR',
                verificationStatus: 'VERIFIED',
                createdByUserId: manager.id
            }
        });

        await prisma.sectionAssignment.create({
            data: {
                userId: operator.id,
                stage: 'REWORK'
            }
        });

        console.log(' creating test batch...');
        batch = await prisma.batch.create({
            data: {
                batchNumber: `BATCH-${suffix}`,
                briefTypeName: 'Test Type',
                totalQuantity: 100,
                currentStage: 'REWORK',
                status: 'IN_PROGRESS',
                defectiveQuantity: 10,
                usableQuantity: 50,
                scrappedQuantity: 0
            }
        });

        console.log(`Setup complete. Batch: ${batch.batchNumber}, Defective: ${batch.defectiveQuantity}`);

        // 2. Test Create Rework Log
        console.log('\n--- Test 1: Create Rework Log ---');
        const reqCreate = {
            user: { userId: operator.id, role: 'OPERATOR', sections: ['REWORK'] }, // Mock auth middleware
            body: {
                batchId: batch.id,
                reworkStage: 'STITCHING',
                quantity: 5,
                curedQuantity: 3,
                scrappedQuantity: 2,
                startTime: new Date().toISOString(),
                endTime: new Date().toISOString()
            }
        };
        const resCreate = mockRes();

        // Need to add user object to req for controller usage?
        // createReworkLog uses req.user.userId
        await createReworkLog(reqCreate, resCreate);

        if (resCreate.statusCode !== 201) {
            throw new Error(`Failed to create rework log: ${JSON.stringify(resCreate.data)}`);
        }

        reworkId = resCreate.data.rework.id;
        console.log('Rework Log Created. ID:', reworkId);

        // Verify NO MUTATION
        const batchAfterCreate = await prisma.batch.findUnique({ where: { id: batch.id } });
        console.log(`Batch State after Create: Defective=${batchAfterCreate.defectiveQuantity} (Expected 10)`);

        if (batchAfterCreate.defectiveQuantity !== 10) throw new Error('FAIL: Defective quantity changed before approval!');

        // 3. Test Approval
        console.log('\n--- Test 2: Approve Rework ---');
        const reqApprove = {
            user: { userId: manager.id, role: 'MANAGER', sections: ['STITCHING'] }, // Correct section
            params: { reworkId: reworkId.toString() }
        };
        const resApprove = mockRes();

        await approveRework(reqApprove, resApprove);

        if (resApprove.statusCode !== 200) {
            throw new Error(`Failed to approve rework: ${JSON.stringify(resApprove.data)}`);
        }

        console.log('Approval success.');

        // Verify MUTATION
        const batchAfterApprove = await prisma.batch.findUnique({ where: { id: batch.id } });
        const reworkAfter = await prisma.reworkRecord.findUnique({ where: { id: reworkId } });

        console.log(`Batch State after Approve: 
        Defective=${batchAfterApprove.defectiveQuantity} (Expected 5)
        Usable=${batchAfterApprove.usableQuantity} (Expected 53)
        Scrapped=${batchAfterApprove.scrappedQuantity} (Expected 2)`);

        if (batchAfterApprove.defectiveQuantity !== 5) throw new Error('FAIL: Defective quantity incorrect.');
        if (batchAfterApprove.usableQuantity !== 53) throw new Error('FAIL: Usable quantity incorrect.');
        if (batchAfterApprove.scrappedQuantity !== 2) throw new Error('FAIL: Scrapped quantity incorrect.');
        if (reworkAfter.approvalStatus !== 'APPROVED') throw new Error('FAIL: Status not updated.');

        // 4. Test Rejection (No Mutation)
        console.log('\n--- Test 3: Reject Rework ---');
        // Create another record
        const reqCreate2 = {
            user: { userId: operator.id, role: 'OPERATOR', sections: ['REWORK'] },
            body: {
                batchId: batch.id, reworkStage: 'STITCHING', quantity: 2, curedQuantity: 1, scrappedQuantity: 1,
                startTime: new Date().toISOString(), endTime: new Date().toISOString()
            }
        };
        const resCreate2 = mockRes();
        await createReworkLog(reqCreate2, resCreate2);
        const reworkId2 = resCreate2.data.rework.id;

        // Reject it
        const reqReject = {
            user: { userId: manager.id, role: 'MANAGER', sections: ['STITCHING'] },
            params: { reworkId: reworkId2.toString() },
            body: { reason: 'Test Rejection' }
        };
        const resReject = mockRes();
        await rejectRework(reqReject, resReject);

        if (resReject.statusCode !== 200) throw new Error(`Failed to reject: ${JSON.stringify(resReject.data)}`);

        // Verify NO MUTATION (Should remain same as after Test 2)
        const batchAfterReject = await prisma.batch.findUnique({ where: { id: batch.id } });
        const reworkAfterReject = await prisma.reworkRecord.findUnique({ where: { id: reworkId2 } });

        console.log(`Batch State after Reject: Defective=${batchAfterReject.defectiveQuantity}`);

        if (batchAfterReject.defectiveQuantity !== 5) throw new Error('FAIL: Defective quantity changed on rejection!');
        if (batchAfterReject.usableQuantity !== 53) throw new Error('FAIL: Usable quantity changed on rejection!');
        if (reworkAfterReject.approvalStatus !== 'REJECTED') throw new Error('FAIL: Status not updated to REJECTED.');

        console.log('\n✅ VERIFICATION PASSED!');


    } catch (e) {
        console.error('Test Failed. details in error.log');
        fs.writeFileSync('error.log', e.toString() + '\n' + JSON.stringify(e, null, 2));
        process.exit(1);
    } finally {
        // Cleanup
        if (reworkId) await prisma.reworkRecord.delete({ where: { id: reworkId } }).catch(() => { });
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
