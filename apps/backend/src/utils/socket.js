const { Server } = require('socket.io');

let io;

const init = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*", // Adjust in production
            methods: ["GET", "POST", "PATCH", "PUT", "DELETE"]
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
