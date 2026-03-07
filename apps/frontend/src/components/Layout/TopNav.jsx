import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
    Search,
    Bell,
    User as UserIcon,
    Settings,
    ChevronDown,
    Activity,
    LogOut,
    Sun,
    Moon
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import NotificationPanel from '../UI/NotificationPanel';
import { useState } from 'react';

const TopNav = ({ systemStatus = 'healthy', title }) => {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);

    const [notifications] = useState([
        { id: 1, type: 'error', title: 'Critical Delay', message: 'Stitching Line #4 reporting 15% throughput drop.', time: '2m ago' },
        { id: 2, type: 'warning', title: 'Defect Spike', message: 'Quality Check at Cutting stage detected 8 high-variance items.', time: '15m ago' },
        { id: 3, type: 'success', title: 'Goal Achieved', message: 'Batch #8822 successfully cleared all packing requirements.', time: '1h ago' },
    ]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'healthy': return 'bg-success';
            case 'warning': return 'bg-warning';
            case 'error': return 'bg-error';
            default: return 'bg-neutral';
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'healthy': return 'System Healthy';
            case 'warning': return 'High Defects';
            case 'error': return 'Machine Down';
            default: return 'System Status';
        }
    };

    return (
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 sticky top-0 z-30 transition-colors">
            {/* Left: Search */}
            <div className="flex items-center gap-4 w-1/3">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                    <input
                        type="text"
                        placeholder="Global Search (Batches, Users...)"
                        className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 transition-all text-text-primary placeholder:text-text-secondary/50"
                    />
                </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-4 lg:gap-6">
                {/* System Status Indicator */}
                <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-background border border-border">
                    <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className={`w-2 h-2 rounded-full ${getStatusColor(systemStatus)}`}
                    />
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary">
                        {getStatusLabel(systemStatus)}
                    </span>
                </div>

                {/* Notifications */}
                <button
                    onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                    className={`relative text-text-secondary hover:text-primary transition-all p-2 rounded-xl ${isNotificationOpen ? 'bg-primary/10 text-primary' : ''}`}
                >
                    <Bell size={20} />
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-error text-[10px] font-black text-white rounded-full flex items-center justify-center border-2 border-card">
                        {notifications.length}
                    </span>
                </button>

                <NotificationPanel
                    isOpen={isNotificationOpen}
                    onClose={() => setIsNotificationOpen(false)}
                    notifications={notifications}
                />

                {/* Divider */}
                <div className="h-6 w-px bg-border hidden sm:block" />

                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-xl bg-background text-text-secondary hover:text-primary transition-all border border-border"
                    title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                >
                    {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                </button>

                {/* User Profile */}
                <div className="flex items-center gap-3 group cursor-pointer">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-text-primary leading-none">{user?.fullName}</p>
                        <p className="text-[10px] font-black uppercase tracking-tighter text-text-secondary mt-1 opacity-70">{user?.role} • {user?.sections?.[0]}</p>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary overflow-hidden transition-transform group-hover:scale-105 shadow-sm">
                        <UserIcon size={20} />
                    </div>
                </div>

                <button onClick={logout} title="Logout" className="hidden sm:block text-text-secondary hover:text-error transition-colors p-2 rounded-lg hover:bg-error/5">
                    <LogOut size={18} />
                </button>
            </div>
        </header>
    );
};

export default TopNav;
