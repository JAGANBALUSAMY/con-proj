const { Server } = require('socket.io');

let io;

const getAllowedOrigins = () => (
    (process.env.CORS_ORIGIN || '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
);

const init = (server) => {
    const allowedOrigins = getAllowedOrigins();

    io = new Server(server, {
        cors: {
            origin: allowedOrigins.length ? allowedOrigins : true,
            methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        console.log(`🔌 Client connected: ${socket.id}`);

        socket.on('disconnect', () => {
            console.log(`🔌 Client disconnected: ${socket.id}`);
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

const emitEvent = (event, data) => {
    if (io) {
        io.emit(event, data);
        console.log(`📡 Emitted event: ${event}`);
    }
};

module.exports = {
    init,
    getIO,
    emitEvent
};
