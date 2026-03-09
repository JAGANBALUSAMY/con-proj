const { getOperatorRankings } = require('../src/controllers/analyticsController');

async function test() {
    const req = { query: {} };
    const res = {
        status: function (code) {
            this.statusCode = code;
            return this;
        },
        json: function (data) {
            this.data = data;
            return this;
        }
    };

    try {
        console.log('--- Testing getOperatorRankings ---');
        await getOperatorRankings(req, res);
        console.log('Status Code:', res.statusCode);
        console.log('Data:', JSON.stringify(res.data, null, 2));
    } catch (error) {
        console.error('❌ Test failed with error:', error);
    }
}

test();
