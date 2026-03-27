import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        let isUnmounting = false;

        const socketUrl =
            import.meta.env.VITE_SOCKET_URL ||
            (import.meta.env.DEV ? 'http://localhost:5005' : window.location.origin);

        const newSocket = io(socketUrl, {
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            timeout: 10000,
            // Polling-first avoids noisy websocket upgrade failures during local dev startup.
            transports: ['polling', 'websocket']
        });

        newSocket.on('connect', () => {
            console.log('🔌 WebSocket Connected');
        });

        newSocket.on('disconnect', (reason) => {
            console.log('🔌 WebSocket Disconnected:', reason);
        });

        newSocket.on('connect_error', (error) => {
            // React StrictMode mounts/unmounts twice in dev; ignore expected transient errors.
            if (import.meta.env.DEV && (isUnmounting || error?.message === 'websocket error')) {
                return;
            }
            console.error('🔌 WebSocket Error:', error.message);
        });

        setSocket(newSocket);

        return () => {
            isUnmounting = true;
            newSocket.disconnect();
        };
    }, []);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};
