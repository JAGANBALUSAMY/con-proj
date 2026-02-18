const { approveProductionLog } = require('../src/controllers/approvalController');
const prisma = require('../src/utils/prisma');

async function test() {
    const logId = 8;
    console.log(`Triggering approval for log #${logId}...`);

    const log = await prisma.productionLog.findUnique({
        where: { id: logId },
        include: {
            operator: true,
            batch: true
        }
    });

    if (!log) {
        console.error('Log not found.');
        return;
    }

    // Find the manager who created this operator
    const managerId = log.operator.createdByUserId;
    const manager = await prisma.user.findUnique({
        where: { id: managerId },
        include: { sectionAssignments: true }
    });

    if (!manager) {
        console.error(`Manager #${managerId} not found.`);
        return;
    }

    console.log(`Mocking Manager: ${manager.fullName} (#${manager.id})`);

    const req = {
        params: { logId: logId.toString() },
        user: {
            userId: manager.id,
            sections: manager.sectionAssignments.map(sa => sa.stage)
        }
    };

    const res = {
        status: function (code) {
            this.statusCode = code;
            return this;
        },
        json: function (data) {
            this.data = data;
            console.log(`Response [${this.statusCode}]:`, JSON.stringify(data, null, 2));
        }
    };

    try {
        await approveProductionLog(req, res);
    } catch (e) {
        console.error('Unhandled Controller Error:', e);
    }
}

test().finally(() => prisma.$disconnect());
