import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        // Corrected port to 5005 based on backend configuration
        const newSocket = io('http://localhost:5005', {
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            timeout: 5000
        });

        newSocket.on('connect', () => {
            console.log('🔌 WebSocket Connected (Port 5005)');
            setConnected(true);
        });

        newSocket.on('disconnect', (reason) => {
            console.log('🔌 WebSocket Disconnected:', reason);
            setConnected(false);
        });

        newSocket.on('connect_error', (error) => {
            console.error('🔌 WebSocket Error:', error.message);
            setConnected(false);
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, []);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};
