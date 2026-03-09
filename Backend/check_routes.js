const routes = [
    'authRoutes', 'userRoutes', 'dashboardRoutes', 'approvalRoutes',
    'productionRoutes', 'sectionTransferRoutes', 'qualityRoutes',
    'reworkRoutes', 'analyticsRoutes', 'machineRoutes', 'aiRoutes'
];

routes.forEach(routeName => {
    try {
        const r = require(`./src/routes/${routeName}`);
        if (typeof r !== 'function' && (typeof r !== 'object' || typeof r.handle !== 'function')) {
            // Express routers are functions (with extra props)
            if (typeof r === 'undefined') {
                console.error(`ERROR: ${routeName} is undefined!`);
            } else {
                console.log(`${routeName} export type: ${typeof r}`);
            }
        } else {
            console.log(`${routeName}: OK`);
        }
    } catch (e) {
        console.error(`ERROR loading ${routeName}:`, e.message);
    }
});
