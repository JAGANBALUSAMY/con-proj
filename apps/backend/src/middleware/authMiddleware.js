const prisma = require('../utils/prisma');
const { verifyToken } = require('../utils/jwt');

const protect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Not authorized, no token' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);

        // Active Account Enforcement: JWT alone is NOT sufficient
        // We must check the database for the current status
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { status: true }
        });

        if (!user || user.status !== 'ACTIVE') {
            return res.status(403).json({ error: 'Account is inactive or disabled. Please contact your manager.' });
        }

        // Attach user info to request
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Auth check error:', error);
        return res.status(401).json({ error: 'Not authorized, token failed' });
    }
};

const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Permission denied: insufficient role' });
        }
        next();
    };
};

const restrictToSection = (...allowedSections) => {
    return (req, res, next) => {
        // Governance Bypass: ADMIN can read across all sections
        if (req.user.role === 'ADMIN') return next();

        const userSections = req.user.sections || [];

        // Check if user is assigned to the specific section required by the route
        const hasAccess = allowedSections.some(section => userSections.includes(section));

        if (!hasAccess) {
            return res.status(403).json({
                error: 'Access Denied: You are not assigned to this production section',
                required: allowedSections,
                assigned: userSections
            });
        }

        next();
    };
};

module.exports = {
    protect,
    restrictTo,
    restrictToSection,
};
