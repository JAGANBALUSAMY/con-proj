// const api = require('../src/utils/apiClient'); 
// Actually, previous scripts used direct http calls. Let's stick to that pattern.
// Based on verify-full-flow.js pattern.

const http = require('http');

function post(path, body, token) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: '/api' + path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };
        const req = http.request(options, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ statusCode: res.statusCode, body: JSON.parse(data) }));
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

function get(path, token) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: '/api' + path,
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        };
        const req = http.request(options, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ statusCode: res.statusCode, body: JSON.parse(data || '{}') }));
        });
        req.on('error', reject);
        req.end();
    });
}

function patch(path, body, token) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: '/api' + path,
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };
        const req = http.request(options, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ statusCode: res.statusCode, body: JSON.parse(data) }));
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function runTest() {
    console.log('🧪 Verifying Cutting Batch Start Workflow...');

    // 1. Login as Cutting Manager
    const loginRes = await post('/auth/login', {
        employeeCode: 'MGR_CUT_01',
        password: '123456'
    });

    if (loginRes.statusCode !== 200) {
        console.error('❌ Login failed:', loginRes.body);
        process.exit(1);
    }
    const token = loginRes.body.token;
    console.log('✅ Login successful');

    // 2. Fetch Dashboard
    const dashboardRes = await get('/dashboard/manager', token);
    if (dashboardRes.statusCode !== 200) {
        console.error('❌ Fetch Dashboard failed:', dashboardRes.body);
        process.exit(1);
    }

    const queue = dashboardRes.body.approvalQueue;
    const pendingBatchItem = queue.find(item => item.type === 'BATCH');

    if (!pendingBatchItem) {
        console.error('❌ No Pending Batch found in Manager Queue!');
        console.log('Queue contents:', JSON.stringify(queue, null, 2));
        process.exit(1);
    }
    console.log(`✅ Found Pending Batch in Queue: ${pendingBatchItem.batch.batchNumber} (ID: ${pendingBatchItem.id})`);

    // 3. Approve Start
    console.log(`🚀 Starting Batch ${pendingBatchItem.id}...`);
    const startRes = await patch(`/approvals/batch/${pendingBatchItem.id}/start`, {}, token);

    if (startRes.statusCode !== 200) {
        console.error('❌ Start Batch failed:', startRes.body);
        process.exit(1);
    }
    console.log('✅ Batch Started Successfully:', startRes.body);

    if (startRes.body.batch.status !== 'IN_PROGRESS') {
        console.error('❌ Batch Status mismatch. Expected IN_PROGRESS, got:', startRes.body.batch.status);
        process.exit(1);
    }

    if (startRes.body.batch.usableQuantity === 0) {
        console.error('❌ Batch UsableQty mismatch. Expected > 0, got:', startRes.body.batch.usableQuantity);
        process.exit(1);
    }

    // 4. Verify it's gone from Queue (or moved to Active Batches)
    const dashboardRes2 = await get('/dashboard/manager', token);
    const queue2 = dashboardRes2.body.approvalQueue;
    const stillInQueue = queue2.find(item => item.id === pendingBatchItem.id && item.type === 'BATCH');

    if (stillInQueue) {
        console.error('❌ Batch still in Approval Queue after starting!');
        process.exit(1);
    }
    console.log('✅ Batch removed from Approval Queue.');

    const activeBatches = dashboardRes2.body.activeBatches;
    const isActive = activeBatches.find(b => b.id === pendingBatchItem.id);

    if (!isActive) {
        console.error('❌ Batch not found in Active Batches list!');
        process.exit(1);
    }
    console.log('✅ Batch found in Active Batches List (Status: IN_PROGRESS).');

    console.log('🎉 Verification PASSED!');
}

runTest().catch(console.error);
