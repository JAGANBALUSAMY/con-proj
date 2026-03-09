const authService = require('#backend/services/authService');

/**
 * Login controller
 */
const login = async (req, res) => {
    try {
        const { employeeCode, password } = req.body;

        if (!employeeCode || !password) {
            return res.status(400).json({ error: 'Please provide employee code and password' });
        }

        const result = await authService.authenticate(employeeCode, password);

        return res.status(200).json({
            message: 'Login successful',
            ...result
        });
    } catch (error) {
        console.error('Login error:', error.message);

        // Handle specific error messages from service
        const clientErrors = [
            'Invalid employee code or password',
            'Account is inactive. Contact Administrator.',
            'No production sections assigned. Contact Administrator.'
        ];

        if (clientErrors.includes(error.message) || error.message.includes('Login denied until verified')) {
            const status = error.message.includes('Invalid') ? 401 : 403;
            return res.status(status).json({ error: error.message });
        }

        return res.status(500).json({ error: 'Internal server error during login' });
    }
};

module.exports = {
    login,
};
