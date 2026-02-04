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
        if (req.user.role === 'ADMIN') return next();

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Permission denied: insufficient role' });
        }
        next();
    };
};

/**
 * Restrict access to specific production sections (stages).
 * ADMIN bypasses all section restrictions.
 */
const restrictToSection = (...allowedSections) => {
    return (req, res, next) => {
        // 1. Admin Bypass
        if (req.user.role === 'ADMIN') return next();

        const userSections = req.user.sections || [];

        // 2. Check if user is assigned to the specific section required by the route
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
