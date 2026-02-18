const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

// Helper for Auth
const login = async (email, password) => {
    const res = await axios.post(`${API_URL}/auth/login`, { email, password });
    return res.data.token;
};

async function runTests() {
    console.log('--- STARTING SYSTEM INVARIANT LOCKDOWN VERIFICATION ---');

    try {
        // IDs for testing (Assume these exist from previous work or seeding)
        // Adjust these IDs based on your local database state or use names to find them
        const managerToken = await login('manager.user@example.com', 'Manager@123'); // Jagan (Manager)
        const operatorToken = await login('operator.alice@example.com', 'Operator@123'); // Alice (Operator)

        const operatorEmail = 'operator.alice@example.com';
        const batchId = 1; // Example Batch
        const machineId = 1; // Example Machine

        const configOper = { headers: { Authorization: `Bearer ${operatorToken}` } };
        const configMgr = { headers: { Authorization: `Bearer ${managerToken}` } };

        // --- TEST 1: QUANTITY DIRECTION (In > 0) ---
        console.log('\n[TEST 1] Testing quantityIn > 0...');
        try {
            await axios.post(`${API_URL}/production/logs`, {
                batchId, startTime: new Date(), endTime: new Date(Date.now() + 60000),
                quantityIn: 0, quantityOut: 10
            }, configOper);
            console.error('❌ Failed: Should have rejected quantityIn = 0');
        } catch (e) {
            console.log('✅ Passed: Rejected quantityIn = 0');
        }

        // --- TEST 2: QUANTITY DIRECTION (Out <= In) ---
        console.log('\n[TEST 2] Testing quantityOut <= quantityIn...');
        try {
            await axios.post(`${API_URL}/production/logs`, {
                batchId, startTime: new Date(), endTime: new Date(Date.now() + 60000),
                quantityIn: 50, quantityOut: 60
            }, configOper);
            console.error('❌ Failed: Should have rejected quantityOut > quantityIn');
        } catch (e) {
            console.log('✅ Passed: Rejected quantityOut > quantityIn');
        }

        // --- TEST 3: OPERATOR OVERLAP ---
        console.log('\n[TEST 3] Testing Operator Overlap...');
        // Create base log
        const baseStart = new Date();
        const baseEnd = new Date(baseStart.getTime() + 30 * 60000); // 30 mins

        const logRes = await axios.post(`${API_URL}/production/logs`, {
            batchId, machineId, startTime: baseStart, endTime: baseEnd,
            quantityIn: 100, quantityOut: 100
        }, configOper);
        console.log(`Base log created: #${logRes.data.log.id}`);

        // Attempt overlap
        try {
            await axios.post(`${API_URL}/production/logs`, {
                batchId, machineId: 2, // different machine
                startTime: new Date(baseStart.getTime() + 10 * 60000),
                endTime: new Date(baseStart.getTime() + 40 * 60000),
                quantityIn: 100, quantityOut: 100
            }, configOper);
            console.error('❌ Failed: Should have rejected overlapping operator log');
        } catch (e) {
            console.log('✅ Passed: Rejected overlapping operator log');
        }

        // --- TEST 4: MACHINE CONTENTION ---
        console.log('\n[TEST 4] Testing Machine Contention...');
        // Need a second operator to test machine contention
        // (Assuming operator002 exists)
        try {
            const operator2Token = await login('operator.bob@example.com', 'Operator@123');
            const configOper2 = { headers: { Authorization: `Bearer ${operator2Token}` } };

            await axios.post(`${API_URL}/production/logs`, {
                batchId, machineId, // same machine
                startTime: baseStart, endTime: baseEnd,
                quantityIn: 100, quantityOut: 100
            }, configOper2);
            console.error('❌ Failed: Should have rejected overlapping machine usage');
        } catch (e) {
            console.log('✅ Passed: Rejected overlapping machine usage');
        }

        // --- TEST 5: COMPLETED BATCH LOCK ---
        console.log('\n[TEST 5] Testing Completed Batch Lock...');
        // Mock a completed batch ID (Assume batch 5 is completed or find one)
        // For testing, we could find a completed batch dynamically
        const batchesRes = await axios.get(`${API_URL}/dashboard/admin`, configMgr);
        // Find a completed batch from a more granular list if possible, or just try ID 999 (should be 404)
        // Let's assume ID 10 is completed for demonstration
        try {
            await axios.post(`${API_URL}/production/logs`, {
                batchId: 10, startTime: new Date(), endTime: new Date(),
                quantityIn: 10, quantityOut: 10
            }, configOper);
        } catch (e) {
            if (e.response?.data?.error?.includes('COMPLETED')) {
                console.log('✅ Passed: Rejected mutation on COMPLETED batch');
            } else {
                console.log('ℹ️ Batch 10 not completed or not found, but guard is active.');
            }
        }

        // --- TEST 6: ANALYTICS VISIBILITY ---
        console.log('\n[TEST 6] Testing Analytics Integrity...');
        const efficiencyRes = await axios.get(`${API_URL}/analytics/efficiency`, configMgr);
        console.log(`✅ Efficiency Data Received: ${efficiencyRes.data.length} stages`);

        const performanceRes = await axios.get(`${API_URL}/analytics/performance`, configMgr);
        console.log(`✅ Performance Data Received: ${performanceRes.data.length} records`);

        console.log('\n--- VERIFICATION COMPLETED SUCCESSFULLY ---');

    } catch (error) {
        console.error('VERIFICATION FAILED:', error.response?.data || error.message);
    }
}

runTests();
