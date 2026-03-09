import React, { useState } from 'react';
import {
    Search,
    Bell,
    Moon,
    Sun,
    User,
    ChevronRight,
    Home,
    LogOut,
    Settings as SettingsIcon,
    BellOff
} from 'lucide-react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

const TopBar = () => {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const location = useLocation();
    const navigate = useNavigate();
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    const pathnames = location.pathname.split('/').filter((x) => x);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 sticky top-0 z-30 shadow-sm">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-text-secondary overflow-hidden">
                <Link to="/" className="p-1.5 hover:bg-background rounded-lg hover:text-primary transition-all">
                    <Home size={16} />
                </Link>
                {pathnames.map((value, index) => {
                    const last = index === pathnames.length - 1;
                    const to = `/${pathnames.slice(0, index + 1).join('/')}`;

                    return (
                        <React.Fragment key={to}>
                            <ChevronRight size={14} className="shrink-0 opacity-40" />
                            <Link
                                to={to}
                                className={`text-[10px] font-black uppercase tracking-widest whitespace-nowrap px-2 py-0.5 rounded-md transition-all ${last
                                        ? 'text-primary bg-primary/5'
                                        : 'hover:bg-background hover:text-text-primary'
                                    }`}
                            >
                                {value.replace(/-/g, ' ')}
                            </Link>
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
                {/* Global Search */}
                <div className="hidden md:flex items-center gap-2 bg-background border border-border px-3 py-1.5 rounded-xl group focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                    <Search size={14} className="text-slate-400 group-focus-within:text-primary" />
                    <input
                        type="text"
                        placeholder="Search fleet, batches or users..."
                        className="bg-transparent border-none outline-none text-[10px] font-bold uppercase tracking-widest w-48 placeholder:text-slate-400"
                    />
                </div>

                <div className="w-px h-6 bg-border mx-2 hidden md:block" />

                {/* Notifications Trigger */}
                <button className="relative p-2 rounded-xl hover:bg-background transition-all text-text-secondary hover:text-primary border border-transparent hover:border-border group">
                    <Bell size={18} />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full border-2 border-card ring-2 ring-error/20 group-hover:animate-ping" />
                </button>

                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-xl hover:bg-background transition-all text-text-secondary hover:text-primary border border-transparent hover:border-border"
                >
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>

                {/* Profile Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                        className={`flex items-center gap-3 pl-2 transition-all ${showProfileMenu ? 'opacity-80' : ''}`}
                    >
                        <div className="text-right hidden sm:block">
                            <p className="text-[10px] font-black text-text-primary uppercase tracking-tight">{user?.fullName}</p>
                            <p className="text-[9px] font-bold text-primary tracking-widest uppercase">{user?.role}</p>
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm hover:bg-primary/20 transition-all overflow-hidden">
                            <User size={18} />
                        </div>
                    </button>

                    <AnimatePresence>
                        {showProfileMenu && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute right-0 mt-3 w-56 bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden"
                                >
                                    <div className="p-4 border-b border-border bg-background/50">
                                        <p className="text-xs font-black uppercase text-text-primary">{user?.fullName}</p>
                                        <p className="text-[10px] text-slate-500 font-bold tracking-widest mt-0.5 uppercase">{user?.email}</p>
                                    </div>
                                    <div className="p-2">
                                        <button className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-text-secondary hover:bg-background hover:text-primary rounded-xl transition-all">
                                            <SettingsIcon size={14} /> System Settings
                                        </button>
                                        <button className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-text-secondary hover:bg-background hover:text-primary rounded-xl transition-all">
                                            <BellOff size={14} /> Mute Alerts
                                        </button>
                                        <div className="h-px bg-border my-2 mx-2" />
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-error hover:bg-error/5 rounded-xl transition-all"
                                        >
                                            <LogOut size={14} /> End Session
                                        </button>
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </header>
    );
};

export default TopBar;
