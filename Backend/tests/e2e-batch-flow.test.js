const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const { app } = require('../src/app');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

let managerToken;
let cuttingOperatorToken;
let stitchingOperatorToken;
let qcOperatorToken;
let cuttingReworkOperatorToken;
let stitchingReworkOperatorToken;

let batchId;
let managerId;
let testMachine;

const TOTAL = 100;
const TEST_PASSWORD = 'test_password_123';

describe("FULL PRODUCTION FLOW E2E TEST", () => {
    let globalTime = new Date('2024-01-01T08:00:00Z');

    const nextTimeWindow = (durationMinutes = 60) => {
        const start = new Date(globalTime);
        globalTime.setMinutes(globalTime.getMinutes() + durationMinutes);
        const end = new Date(globalTime);
        globalTime.setMinutes(globalTime.getMinutes() + 5); // 5 min gap
        return { start, end };
    };

    beforeAll(async () => {
        const timestamp = Date.now();
        const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);

        // 1. Create Isolated Manager
        const mgr = await prisma.user.create({
            data: {
                employeeCode: `MGR_E2E_${timestamp}`,
                fullName: `Test Manager`,
                password: hashedPassword,
                role: 'MANAGER',
                status: 'ACTIVE',
                verificationStatus: 'VERIFIED',
                sectionAssignments: {
                    create: [
                        { stage: 'CUTTING' }, { stage: 'STITCHING' }, { stage: 'QUALITY_CHECK' },
                        { stage: 'REWORK' }, { stage: 'LABELING' }, { stage: 'FOLDING' }, { stage: 'PACKING' }
                    ]
                }
            }
        });
        managerId = mgr.id;

        const createOperator = async (code, stages = []) => {
            const opCode = `${code}_E2E_${timestamp}_${Math.floor(Math.random() * 1000)}`;
            return await prisma.user.create({
                data: {
                    employeeCode: opCode,
                    fullName: `Test Operator ${code}`,
                    password: hashedPassword,
                    role: 'OPERATOR',
                    status: 'ACTIVE',
                    verificationStatus: 'VERIFIED',
                    createdByUserId: mgr.id,
                    sectionAssignments: {
                        create: stages.map(s => ({ stage: s }))
                    }
                }
            });
        };

        const cutOp = await createOperator('CUT', ['CUTTING']);
        const stitchOp = await createOperator('STI', ['STITCHING']);
        const qcOp = await createOperator('QC', ['QUALITY_CHECK']);
        const reOpCut = await createOperator('REW_CUT', ['REWORK', 'CUTTING']);
        const reOpSti = await createOperator('REW_STI', ['REWORK', 'STITCHING']);

        const login = async (userCode) => {
            const res = await request(app)
                .post("/api/auth/login")
                .send({ employeeCode: userCode, password: TEST_PASSWORD });
            return res.body.token;
        };

        managerToken = await login(mgr.employeeCode);
        cuttingOperatorToken = await login(cutOp.employeeCode);
        stitchingOperatorToken = await login(stitchOp.employeeCode);
        qcOperatorToken = await login(qcOp.employeeCode);
        cuttingReworkOperatorToken = await login(reOpCut.employeeCode);
        stitchingReworkOperatorToken = await login(reOpSti.employeeCode);

        // Create a test machine for contention tests
        testMachine = await prisma.machine.create({
            data: {
                name: `E2E-MACHINE-${timestamp}`,
                machineCode: `MC_E2E_${timestamp}`,
                status: 'OPERATIONAL'
            }
        });
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    test("1️⃣ Create Batch", async () => {
        const res = await request(app)
            .post("/api/dashboard/batches")
            .set("Authorization", `Bearer ${managerToken}`)
            .send({
                batchNumber: `E2E-API-${Date.now()}`,
                briefTypeName: "T-Shirt",
                totalQuantity: TOTAL
            });

        expect(res.statusCode).toBe(201);
        batchId = res.body.batch.id;
    });

    test("2️⃣ Reject Unauthorized Log", async () => {
        const { start, end } = nextTimeWindow(30);
        const res = await request(app)
            .post("/api/production/log")
            .set("Authorization", `Bearer ${qcOperatorToken}`) // QC trying to log CUTTING
            .send({
                batchId,
                quantityIn: TOTAL,
                quantityOut: TOTAL,
                startTime: start,
                endTime: end
            });

        expect(res.statusCode).toBe(403);
    });

    test("3️⃣ CUTTING Stage", async () => {
        const { start, end } = nextTimeWindow(120);
        const log = await request(app)
            .post("/api/production/log")
            .set("Authorization", `Bearer ${cuttingOperatorToken}`)
            .send({
                batchId,
                quantityIn: TOTAL,
                quantityOut: TOTAL,
                startTime: start,
                endTime: end
            });

        expect(log.statusCode).toBe(201);

        const approve = await request(app)
            .patch(`/api/approvals/production/${log.body.log.id}/approve`)
            .set("Authorization", `Bearer ${managerToken}`);

        expect(approve.statusCode).toBe(200);

        // 4️⃣ Prevent Double Approval
        const doubleApprove = await request(app)
            .patch(`/api/approvals/production/${log.body.log.id}/approve`)
            .set("Authorization", `Bearer ${managerToken}`);
        expect(doubleApprove.statusCode).toBe(400);
    });

    test("5️⃣ Reject Invalid Quantity", async () => {
        const { start, end } = nextTimeWindow(30);
        const res = await request(app)
            .post("/api/production/log")
            .set("Authorization", `Bearer ${stitchingOperatorToken}`)
            .send({
                batchId,
                quantityIn: TOTAL,
                quantityOut: TOTAL + 10, // Invalid: Out > In
                startTime: start,
                endTime: end
            });

        expect(res.statusCode).toBe(400);
    });

    test("6️⃣ STITCHING Stage", async () => {
        const { start, end } = nextTimeWindow(180);
        const log = await request(app)
            .post("/api/production/log")
            .set("Authorization", `Bearer ${stitchingOperatorToken}`)
            .send({
                batchId,
                quantityIn: TOTAL,
                quantityOut: TOTAL,
                startTime: start,
                endTime: end
            });

        expect(log.statusCode).toBe(201);

        const approve = await request(app)
            .patch(`/api/approvals/production/${log.body.log.id}/approve`)
            .set("Authorization", `Bearer ${managerToken}`);

        expect(approve.statusCode).toBe(200);
    });

    test("7️⃣ QUALITY CHECK with defects", async () => {
        const { start, end } = nextTimeWindow(60);
        const qc = await request(app)
            .post("/api/quality/record-defect")
            .set("Authorization", `Bearer ${qcOperatorToken}`)
            .send({
                batchId,
                quantityIn: 100,
                defectiveQuantity: 10,
                defects: [
                    { defectCode: "CUT_MISS", quantity: 4, reworkStage: "CUTTING", severity: "MINOR" },
                    { defectCode: "LOOSE_STITCH", quantity: 6, reworkStage: "STITCHING", severity: "MINOR" }
                ],
                startTime: start,
                endTime: end
            });

        expect(qc.statusCode).toBe(201);

        const approve = await request(app)
            .patch(`/api/approvals/production/${qc.body.log.id}/approve`)
            .set("Authorization", `Bearer ${managerToken}`);

        expect(approve.statusCode).toBe(200);

        // 8️⃣ QC Hold Rule Enforced
        const batch = await prisma.batch.findUnique({ where: { id: batchId } });
        expect(batch.currentStage).toBe("QUALITY_CHECK");
    });

    test("9️⃣ CUTTING Rework", async () => {
        const { start, end } = nextTimeWindow(60);
        const res = await request(app)
            .post("/api/rework/create")
            .set("Authorization", `Bearer ${cuttingReworkOperatorToken}`)
            .send({
                batchId,
                reworkStage: "CUTTING",
                quantity: 4,
                curedQuantity: 3,
                scrappedQuantity: 1,
                startTime: start,
                endTime: end
            });

        expect(res.statusCode).toBe(201);

        const approve = await request(app)
            .patch(`/api/approvals/rework/${res.body.rework.id}/approve`)
            .set("Authorization", `Bearer ${managerToken}`);

        expect(approve.statusCode).toBe(200);
    });

    test("🔟 STITCHING Rework", async () => {
        const { start, end } = nextTimeWindow(60);
        const res = await request(app)
            .post("/api/rework/create")
            .set("Authorization", `Bearer ${stitchingReworkOperatorToken}`)
            .send({
                batchId,
                reworkStage: "STITCHING",
                quantity: 6,
                curedQuantity: 5,
                scrappedQuantity: 1,
                startTime: start,
                endTime: end
            });

        expect(res.statusCode).toBe(201);

        const approve = await request(app)
            .patch(`/api/approvals/rework/${res.body.rework.id}/approve`)
            .set("Authorization", `Bearer ${managerToken}`);

        expect(approve.statusCode).toBe(200);
    });

    test("1️⃣1️⃣ Re-QC for cured units", async () => {
        const { start, end } = nextTimeWindow(30);
        const qc = await request(app)
            .post("/api/quality/record-defect")
            .set("Authorization", `Bearer ${qcOperatorToken}`)
            .send({
                batchId,
                quantityIn: 8,
                defectiveQuantity: 0,
                defects: [],
                startTime: start,
                endTime: end
            });

        expect(qc.statusCode).toBe(201);

        const approve = await request(app)
            .patch(`/api/approvals/production/${qc.body.log.id}/approve`)
            .set("Authorization", `Bearer ${managerToken}`);

        expect(approve.statusCode).toBe(200);
    });

    test("1️⃣2️⃣ Final Stage Flow", async () => {
        const stages = ["LABELING", "FOLDING", "PACKING"];

        for (const stage of stages) {
            const timestamp = Date.now() + Math.random();
            const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);

            const op = await prisma.user.create({
                data: {
                    employeeCode: `OP_FIXED_${stage}_${timestamp}`,
                    fullName: `Test Op ${stage}`,
                    password: hashedPassword,
                    role: 'OPERATOR',
                    status: 'ACTIVE',
                    verificationStatus: 'VERIFIED',
                    createdByUserId: managerId,
                    sectionAssignments: { create: [{ stage: stage }] }
                }
            });

            const loginRes = await request(app).post("/api/auth/login").send({ employeeCode: op.employeeCode, password: TEST_PASSWORD });
            const opToken = loginRes.body.token;

            const { start, end } = nextTimeWindow(45);

            const log = await request(app)
                .post("/api/production/log")
                .set("Authorization", `Bearer ${opToken}`)
                .send({
                    batchId,
                    quantityIn: 98,
                    quantityOut: 98,
                    startTime: start,
                    endTime: end
                });

            expect(log.statusCode).toBe(201);

            const approve = await request(app)
                .patch(`/api/approvals/production/${log.body.log.id}/approve`)
                .set("Authorization", `Bearer ${managerToken}`);

            expect(approve.statusCode).toBe(200);
        }
    });

    test("1️⃣3️⃣ Completed Batch Lock", async () => {
        const { start, end } = nextTimeWindow(30);
        const res = await request(app)
            .post("/api/production/log")
            .set("Authorization", `Bearer ${cuttingOperatorToken}`)
            .send({
                batchId,
                quantityIn: 98,
                quantityOut: 98,
                startTime: start,
                endTime: end
            });

        expect([400, 403]).toContain(res.statusCode); // 400 from controller or 403 from middleware
    });

    /* ================================
       CHAOS / CONCURRENCY TESTS
    ================================= */

    test("ΓÜáConcurrent Approvals Race Condition", async () => {
        const { start, end } = nextTimeWindow(30);
        const batchRes = await request(app)
            .post("/api/dashboard/batches")
            .set("Authorization", `Bearer ${managerToken}`)
            .send({ batchNumber: `CHAOS-APP-${Date.now()}`, briefTypeName: "Shirt", totalQuantity: 100 });

        const chaosBatchId = batchRes.body.batch.id;

        const log = await request(app)
            .post("/api/production/log")
            .set("Authorization", `Bearer ${cuttingOperatorToken}`)
            .send({
                batchId: chaosBatchId,
                quantityIn: 100,
                quantityOut: 100,
                startTime: start,
                endTime: end
            });

        const id = log.body.log.id;

        // Try to approve twice simultaneously
        const results = await Promise.all([
            request(app).patch(`/api/approvals/production/${id}/approve`).set("Authorization", `Bearer ${managerToken}`),
            request(app).patch(`/api/approvals/production/${id}/approve`).set("Authorization", `Bearer ${managerToken}`)
        ]);

        const success = results.filter(r => r.statusCode === 200);
        expect(success.length).toBe(1);
    });

    test("ΓÜáOperator Overlap Detection", async () => {
        const batchRes = await request(app)
            .post("/api/dashboard/batches")
            .set("Authorization", `Bearer ${managerToken}`)
            .send({ batchNumber: `CHAOS-TIME-${Date.now()}`, briefTypeName: "Shirt", totalQuantity: 100 });

        const chaosBatchId = batchRes.body.batch.id;

        const start = new Date(globalTime);
        const end = new Date(start.getTime() + 60 * 60 * 1000);

        // First log
        await request(app)
            .post("/api/production/log")
            .set("Authorization", `Bearer ${cuttingOperatorToken}`)
            .send({
                batchId: chaosBatchId,
                quantityIn: 50,
                quantityOut: 50,
                startTime: start,
                endTime: end
            });

        // Overlapping log (must fail even without Promise.all to ensure core logic works)
        const res = await request(app)
            .post("/api/production/log")
            .set("Authorization", `Bearer ${cuttingOperatorToken}`)
            .send({
                batchId: chaosBatchId,
                quantityIn: 50,
                quantityOut: 50,
                startTime: new Date(start.getTime() + 10 * 60 * 1000),
                endTime: new Date(end.getTime() - 10 * 60 * 1000)
            });

        expect(res.statusCode).toBe(400);
        expect(res.body.error).toContain("Operator overlap");
    });

    test("ΓÜáMachine Contention", async () => {
        const batchRes = await request(app)
            .post("/api/dashboard/batches")
            .set("Authorization", `Bearer ${managerToken}`)
            .send({ batchNumber: `CHAOS-MACH-${Date.now()}`, briefTypeName: "Shirt", totalQuantity: 100 });

        const chaosBatchId = batchRes.body.batch.id;

        // We need a second operator in the SAME section (CUTTING)
        const timestamp = Date.now();
        const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);
        const op2 = await prisma.user.create({
            data: {
                employeeCode: `CUT2_CHAOS_${timestamp}`,
                fullName: `Chaos Operator 2`,
                password: hashedPassword,
                role: 'OPERATOR',
                status: 'ACTIVE',
                verificationStatus: 'VERIFIED',
                createdByUserId: managerId,
                sectionAssignments: { create: [{ stage: 'CUTTING' }] }
            }
        });
        const loginRes = await request(app).post("/api/auth/login").send({ employeeCode: op2.employeeCode, password: TEST_PASSWORD });
        const cutting2Token = loginRes.body.token;

        const start = new Date(globalTime);
        start.setHours(start.getHours() + 10);
        const end = new Date(start.getTime() + 60 * 60 * 1000);

        // Op 1 uses machine
        await request(app)
            .post("/api/production/log")
            .set("Authorization", `Bearer ${cuttingOperatorToken}`)
            .send({
                batchId: chaosBatchId,
                machineId: testMachine.id,
                quantityIn: 50,
                quantityOut: 50,
                startTime: start,
                endTime: end
            });

        // Op 2 tries to use same machine at same time
        const res = await request(app)
            .post("/api/production/log")
            .set("Authorization", `Bearer ${cutting2Token}`)
            .send({
                batchId: chaosBatchId,
                machineId: testMachine.id,
                quantityIn: 50,
                quantityOut: 50,
                startTime: start,
                endTime: end
            });

        expect(res.statusCode).toBe(400);
        expect(res.body.error).toContain("Machine contention");
    });

    test("ΓÜáPending Rework Limit Protection", async () => {
        const res = await request(app)
            .post("/api/rework/create")
            .set("Authorization", `Bearer ${cuttingReworkOperatorToken}`)
            .send({
                batchId,
                reworkStage: "CUTTING",
                quantity: 999,
                curedQuantity: 500,
                scrappedQuantity: 499,
                startTime: new Date(),
                endTime: new Date()
            });

        expect(res.statusCode).toBe(400);
    });
});
