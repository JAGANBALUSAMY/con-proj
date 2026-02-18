const express = require('express');
const http = require('http');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const socketUtil = require('./utils/socket');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const approvalRoutes = require('./routes/approvalRoutes');
const productionRoutes = require('./routes/productionRoutes');
const sectionTransferRoutes = require('./routes/sectionTransferRoutes');
const qualityRoutes = require('./routes/qualityRoutes');
const reworkRoutes = require('./routes/reworkRoutes');
const boxRoutes = require('./routes/boxRoutes');

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
socketUtil.init(server);

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/section-transfers', sectionTransferRoutes);
app.use('/api/quality', qualityRoutes);
app.use('/api/rework', reworkRoutes);
app.use('/api/boxes', boxRoutes);

// Root test route
app.get('/', (req, res) => {
    res.json({ message: 'Factory Production System API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong on the server' });
});

const PORT = process.env.PORT || 5000;

if (require.main === module) {
    server.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT} (with WebSockets)`);
    });
}

module.exports = { app, server };
