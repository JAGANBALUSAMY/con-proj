const { verifyToken } = require('../utils/jwt');

const protect = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Not authorized, no token' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);

        // Attach user info to request
        req.user = decoded;
        next();
    } catch (error) {
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
