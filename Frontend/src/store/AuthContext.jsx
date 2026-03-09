import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        console.log('AuthContext: Initializing...');
        // Check for stored token on mount
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');

        if (storedUser && token) {
            try {
                const parsedUser = JSON.parse(storedUser);
                console.log('AuthContext: Restoring user from storage', parsedUser);

                // VALIDATE ROLE against high-level project constraints
                const validRoles = ['ADMIN', 'MANAGER', 'OPERATOR'];
                if (validRoles.includes(parsedUser.role)) {
                    setUser(parsedUser);
                } else {
                    console.warn(`AuthContext: Stale or invalid role found: ${parsedUser.role}. Clearing storage.`);
                    localStorage.removeItem('user');
                    localStorage.removeItem('token');
                }
            } catch (err) {
                console.error('AuthContext: Failed to parse stored user', err);
                localStorage.removeItem('user');
                localStorage.removeItem('token');
            }
        }
        setLoading(false);
    }, []);

    const login = (userData, token) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
