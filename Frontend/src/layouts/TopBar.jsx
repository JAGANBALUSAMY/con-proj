import React, { useState, useEffect, useRef } from 'react';
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
    Command,
} from 'lucide-react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@frontend/store/AuthContext';
import { useTheme } from '@frontend/store/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

/* Readable breadcrumb labels */
const CRUMB_LABELS = {
    admin: 'Admin', manager: 'Manager', operator: 'Operator',
    production: 'Production', analytics: 'Analytics', reports: 'Reports',
    settings: 'Settings', managers: 'Managers', operators: 'Operators',
    flow: 'Production Flow', batches: 'Batches', quality: 'Quality',
    rework: 'Rework Queue', team: 'Team Fleet', station: 'Work Station',
    history: 'History',
};

const TopBar = () => {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const location = useLocation();
    const navigate = useNavigate();
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [searchFocused, setSearchFocused] = useState(false);
    const searchRef = useRef(null);

    const pathnames = location.pathname.split('/').filter(Boolean);

    /* CMD+K to focus search */
    useEffect(() => {
        const handler = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                searchRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    const handleLogout = () => {
        setShowProfileMenu(false);
        logout();
        navigate('/login');
    };

    return (
        <header
            className="h-14 flex items-center justify-between px-6 shrink-0 z-30"
            style={{
                backgroundColor: 'var(--bs-surface-raised)',
                borderBottom: '1px solid var(--bs-border)',
            }}
        >
            {/* ── Left: Breadcrumbs ── */}
            <nav className="flex items-center gap-1.5 overflow-hidden" aria-label="breadcrumb">
                <Link
                    to="/"
                    className="flex items-center justify-center w-7 h-7 rounded-md transition-colors duration-150 hover:bg-surface"
                    style={{ color: 'var(--bs-text-muted)' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--bs-text-primary)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--bs-text-muted)'}
                >
                    <Home size={14} />
                </Link>
                {pathnames.map((segment, idx) => {
                    const isLast = idx === pathnames.length - 1;
                    const to = '/' + pathnames.slice(0, idx + 1).join('/');
                    const label = CRUMB_LABELS[segment] || segment.replace(/-/g, ' ');
                    return (
                        <React.Fragment key={to}>
                            <ChevronRight size={12} style={{ color: 'var(--bs-border-strong)', flexShrink: 0 }} />
                            <Link
                                to={to}
                                className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md transition-colors duration-150 whitespace-nowrap"
                                style={isLast
                                    ? { color: 'var(--color-brand)', backgroundColor: 'rgb(14 165 233 / 0.08)' }
                                    : { color: 'var(--bs-text-muted)' }
                                }
                            >
                                {label}
                            </Link>
                        </React.Fragment>
                    );
                })}
            </nav>

            {/* ── Center: Search ── */}
            <div
                className="hidden md:flex items-center gap-2 px-3 h-8 rounded-full transition-all duration-150 cursor-text"
                style={{
                    width: searchFocused ? 360 : 280,
                    backgroundColor: 'var(--bs-background)',
                    border: searchFocused
                        ? '1px solid var(--color-brand)'
                        : '1px solid var(--bs-border)',
                    boxShadow: searchFocused ? '0 0 0 3px rgb(14 165 233 / 0.10)' : 'none',
                    transition: 'width 0.2s ease, border-color 0.15s, box-shadow 0.15s',
                }}
                onClick={() => searchRef.current?.focus()}
            >
                <Search size={13} style={{ color: searchFocused ? 'var(--color-brand)' : 'var(--bs-text-muted)', flexShrink: 0 }} />
                <input
                    ref={searchRef}
                    type="text"
                    placeholder="Search batches, machines, users…"
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                    className="flex-1 bg-transparent border-none outline-none text-[12px] font-medium"
                    style={{ color: 'var(--bs-text-primary)' }}
                />
                <kbd
                    className="hidden lg:flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: 'var(--bs-border)', color: 'var(--bs-text-muted)' }}
                >
                    <Command size={9} />K
                </kbd>
            </div>

            {/* ── Right: Actions ── */}
            <div className="flex items-center gap-1">
                {/* Notifications */}
                <button
                    className="relative flex items-center justify-center w-8 h-8 rounded-md transition-colors duration-150"
                    style={{ color: 'var(--bs-text-muted)' }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bs-surface)'; e.currentTarget.style.color = 'var(--bs-text-primary)'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = 'var(--bs-text-muted)'; }}
                    aria-label="Notifications"
                >
                    <Bell size={16} />
                    <span
                        className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: 'var(--color-danger)' }}
                    />
                </button>

                {/* Theme toggle */}
                <button
                    onClick={toggleTheme}
                    className="relative flex items-center justify-center w-8 h-8 rounded-md overflow-hidden transition-colors duration-150"
                    style={{ color: 'var(--bs-text-muted)' }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bs-surface)'; e.currentTarget.style.color = 'var(--bs-text-primary)'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = 'var(--bs-text-muted)'; }}
                    aria-label="Toggle theme"
                >
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                            key={theme}
                            initial={{ rotate: -30, opacity: 0, scale: 0.7 }}
                            animate={{ rotate: 0, opacity: 1, scale: 1 }}
                            exit={{ rotate: 30, opacity: 0, scale: 0.7 }}
                            transition={{ duration: 0.18 }}
                        >
                            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                        </motion.div>
                    </AnimatePresence>
                </button>

                {/* Separator */}
                <div className="w-px h-5 mx-1" style={{ backgroundColor: 'var(--bs-border)' }} />

                {/* Profile */}
                <div className="relative">
                    <button
                        onClick={() => setShowProfileMenu(v => !v)}
                        className="flex items-center gap-2.5 pl-1 pr-2 h-8 rounded-md transition-colors duration-150"
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bs-surface)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
                    >
                        <div
                            className="w-6 h-6 rounded-md flex items-center justify-center"
                            style={{ backgroundColor: 'rgb(14 165 233 / 0.15)', color: 'var(--color-brand)' }}
                        >
                            <User size={13} />
                        </div>
                        <div className="hidden sm:block text-left leading-tight">
                            <p className="text-[11px] font-semibold" style={{ color: 'var(--bs-text-primary)' }}>{user?.fullName}</p>
                            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-brand)' }}>{user?.role}</p>
                        </div>
                    </button>

                    <AnimatePresence>
                        {showProfileMenu && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                                <motion.div
                                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute right-0 mt-2 w-52 z-50 overflow-hidden"
                                    style={{
                                        backgroundColor: 'var(--bs-surface)',
                                        border: '1px solid var(--bs-border)',
                                        borderRadius: '10px',
                                        boxShadow: 'var(--shadow-3)',
                                    }}
                                >
                                    <div
                                        className="px-4 py-3"
                                        style={{ borderBottom: '1px solid var(--bs-border)', backgroundColor: 'var(--bs-surface-raised)' }}
                                    >
                                        <p className="text-[12px] font-semibold" style={{ color: 'var(--bs-text-primary)' }}>{user?.fullName}</p>
                                        <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--bs-text-muted)' }}>{user?.email || user?.employeeCode}</p>
                                    </div>
                                    <div className="p-1.5">
                                        <button
                                            className="w-full flex items-center gap-3 px-3 py-2 text-[12px] font-medium rounded-md transition-colors duration-150"
                                            style={{ color: 'var(--bs-text-secondary)' }}
                                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bs-background)'; e.currentTarget.style.color = 'var(--bs-text-primary)'; }}
                                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = 'var(--bs-text-secondary)'; }}
                                        >
                                            <SettingsIcon size={14} /> Settings
                                        </button>
                                        <div className="h-px my-1.5 mx-2" style={{ backgroundColor: 'var(--bs-border)' }} />
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-3 px-3 py-2 text-[12px] font-medium rounded-md transition-colors duration-150"
                                            style={{ color: 'var(--color-danger)' }}
                                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgb(239 68 68 / 0.06)'}
                                            onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
                                        >
                                            <LogOut size={14} /> Sign out
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
