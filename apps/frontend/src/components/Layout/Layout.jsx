import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User as UserIcon } from 'lucide-react';
import './Layout.css';

const Layout = ({ children, title }) => {
    const { user, logout } = useAuth();

    return (
        <div className="layout">
            <header className="header">
                <div className="header-left">
                    <h1>{title}</h1>
                </div>
                <div className="header-right">
                    <div className="user-info">
                        <UserIcon size={18} />
                        <span>{user?.fullName} ({user?.employeeCode})</span>
                    </div>
                    <button onClick={logout} className="logout-btn">
                        <LogOut size={18} />
                        <span>Logout</span>
                    </button>
                </div>
            </header>
            <main className="content">
                {children}
            </main>
        </div>
    );
};

export default Layout;
