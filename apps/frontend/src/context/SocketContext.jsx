import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        // Connect to backend server
        // In a real app, this URL should come from an environment variable
        const newSocket = io('http://localhost:5000', {
            autoConnect: true
        });

        newSocket.on('connect', () => {
            console.log('🔌 Connected to WebSocket server');
        });

        newSocket.on('connect_error', (error) => {
            console.error('🔌 Socket connection error:', error);
        });

        setSocket(newSocket);

        return () => {
            console.log('🔌 Disconnecting from WebSocket server');
            newSocket.disconnect();
        };
    }, []);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};
