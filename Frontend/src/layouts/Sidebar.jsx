import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Factory,
    Package,
    ShieldCheck,
    RefreshCcw,
    Settings,
    BarChart3,
    Users,
    FileText,
    PanelLeftClose,
    PanelLeftOpen,
    Workflow,
    Activity,
    Clock,
    User,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@frontend/store/AuthContext';

/* ---- Role-based navigation definition ---- */
const ROLE_NAV = {
    ADMIN: {
        sections: [
            {
                label: 'Overview',
                items: [
                    { icon: LayoutDashboard, label: 'Dashboard',          path: '/admin' },
                    { icon: Factory,         label: 'Production',          path: '/admin/production' },
                    { icon: BarChart3,       label: 'Analytics',           path: '/analytics' },
                ],
            },
            {
                label: 'Management',
                items: [
                    { icon: ShieldCheck, label: 'Managers',  path: '/admin/managers' },
                    { icon: Users,       label: 'Operators', path: '/admin/operators' },
                    { icon: FileText,    label: 'Reports',   path: '/admin/reports' },
                ],
            },
            {
                label: 'System',
                items: [
                    { icon: Settings, label: 'Settings', path: '/admin/settings' },
                ],
            },
        ],
    },
    MANAGER: {
        sections: [
            {
                label: 'Operations',
                items: [
                    { icon: LayoutDashboard, label: 'Dashboard',       path: '/manager' },
                    { icon: Workflow,        label: 'Production Flow', path: '/manager/flow' },
                    { icon: Package,         label: 'Batches',         path: '/manager/batches' },
                ],
            },
            {
                label: 'Quality',
                items: [
                    { icon: ShieldCheck,  label: 'Quality Control', path: '/manager/quality' },
                    { icon: RefreshCcw,   label: 'Rework Queue',    path: '/manager/rework' },
                ],
            },
            {
                label: 'Team',
                items: [
                    { icon: Users,    label: 'Team Fleet', path: '/manager/team' },
                    { icon: BarChart3, label: 'Analytics', path: '/analytics' },
                ],
            },
        ],
    },
    OPERATOR: {
        sections: [
            {
                label: 'My Work',
                items: [
                    { icon: LayoutDashboard, label: 'Performance', path: '/operator' },
                    { icon: Activity,        label: 'Work Station', path: '/operator/station' },
                    { icon: Clock,           label: 'History',      path: '/operator/history' },
                ],
            },
        ],
    },
};

const ROLE_COLORS = {
    ADMIN:    { bg: 'bg-sky-500/15',    text: 'text-sky-400' },
    MANAGER:  { bg: 'bg-orange-500/15', text: 'text-orange-400' },
    OPERATOR: { bg: 'bg-emerald-500/15',text: 'text-emerald-400' },
};

const Sidebar = ({ collapsed, onToggle }) => {
    const { user } = useAuth();
    const roleNav = ROLE_NAV[user?.role];
    const roleColor = ROLE_COLORS[user?.role] || ROLE_COLORS.OPERATOR;

    return (
        <motion.aside
            animate={{ width: collapsed ? 68 : 260 }}
            initial={false}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className="h-screen flex flex-col sticky top-0 left-0 z-40 shrink-0 overflow-hidden border-r"
            style={{
                backgroundColor: 'var(--bs-sidebar-bg)',
                borderColor: 'var(--bs-sidebar-border)',
            }}
        >
            {/* ── Logo ── */}
            <div
                className="h-16 flex items-center shrink-0 overflow-hidden"
                style={{ borderBottom: '1px solid var(--bs-sidebar-border)' }}
            >
                <div className={`flex items-center gap-3 ${collapsed ? 'justify-center w-full' : 'px-5'}`}>
                    <div className="w-8 h-8 rounded-[10px] bg-brand flex items-center justify-center shrink-0 shadow-brand">
                        <Factory size={16} className="text-white" />
                    </div>
                    <AnimatePresence>
                        {!collapsed && (
                            <motion.span
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -8 }}
                                transition={{ duration: 0.18 }}
                                className="font-dm text-[15px] font-extrabold tracking-tight whitespace-nowrap text-white"
                            >
                                BRIEF<span className="text-brand italic">SYNC</span>
                            </motion.span>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* ── Navigation ── */}
            <nav className="flex-1 overflow-y-auto no-scrollbar py-4 px-2 space-y-5">
                {roleNav?.sections.map((section) => (
                    <div key={section.label}>
                        {/* Section label — hidden when collapsed */}
                        <AnimatePresence>
                            {!collapsed && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="section-label px-3 mb-1.5"
                                    style={{ color: 'var(--bs-sidebar-text)' }}
                                >
                                    {section.label}
                                </motion.div>
                            )}
                        </AnimatePresence>
                        {collapsed && <div className="h-px mx-2 mb-2" style={{ backgroundColor: 'var(--bs-sidebar-border)' }} />}

                        <div className="space-y-0.5">
                            {section.items.map((item) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    end={item.path.split('/').length <= 2}
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 h-10 px-3 relative group transition-all duration-150 ${
                                            isActive
                                                ? 'text-white'
                                                : 'hover:text-white'
                                        }`
                                    }
                                    style={({ isActive }) => ({
                                        backgroundColor: isActive ? 'var(--bs-sidebar-active)' : 'transparent',
                                        borderRadius: '8px',
                                        color: isActive ? '#ffffff' : 'var(--bs-sidebar-text)',
                                        boxShadow: isActive ? '0 4px 14px -2px rgb(14 165 233 / 0.35)' : 'none',
                                    })}
                                    onMouseEnter={(e) => {
                                        if (!e.currentTarget.classList.contains('active')) {
                                            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
                                            e.currentTarget.style.color = '#ffffff';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!e.currentTarget.getAttribute('aria-current')) {
                                            e.currentTarget.style.backgroundColor = '';
                                            e.currentTarget.style.color = 'var(--bs-sidebar-text)';
                                        }
                                    }}
                                >
                                    {({ isActive }) => (
                                        <>
                                            {/* Active left accent bar */}
                                            <span
                                                className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full bg-accent opacity-0"
                                                style={{ opacity: isActive ? 1 : 0 }}
                                                aria-hidden
                                            />

                                            <item.icon size={17} className="shrink-0" />

                                            <AnimatePresence>
                                                {!collapsed && (
                                                    <motion.span
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        exit={{ opacity: 0 }}
                                                        transition={{ duration: 0.15 }}
                                                        className="text-[13px] font-medium whitespace-nowrap tracking-[-0.01em]"
                                                    >
                                                        {item.label}
                                                    </motion.span>
                                                )}
                                            </AnimatePresence>

                                            {/* Collapsed tooltip */}
                                            {collapsed && (
                                                <div
                                                    className="absolute left-[calc(100%+10px)] px-3 py-1.5 text-[11px] font-semibold rounded-md opacity-0 group-hover:opacity-100 pointer-events-none z-50 whitespace-nowrap transition-opacity duration-150"
                                                    style={{
                                                        backgroundColor: 'var(--bs-surface)',
                                                        color: 'var(--bs-text-primary)',
                                                        border: '1px solid var(--bs-border)',
                                                        boxShadow: 'var(--shadow-3)',
                                                    }}
                                                >
                                                    {item.label}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </NavLink>
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            {/* ── User profile ── */}
            <div
                className="shrink-0 p-3"
                style={{ borderTop: '1px solid var(--bs-sidebar-border)' }}
            >
                <AnimatePresence>
                    {!collapsed ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center gap-3 px-2 py-2 rounded-[10px]"
                            style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
                        >
                            <div className="w-8 h-8 rounded-[8px] bg-brand/20 flex items-center justify-center shrink-0">
                                <User size={15} className="text-brand" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[12px] font-semibold text-white truncate leading-tight">{user?.fullName || 'User'}</p>
                                <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0 rounded ${roleColor.bg} ${roleColor.text} mt-0.5`}>
                                    {user?.role}
                                </span>
                            </div>
                        </motion.div>
                    ) : (
                        <div className="flex justify-center">
                            <div className="w-8 h-8 rounded-[8px] bg-brand/20 flex items-center justify-center">
                                <User size={15} className="text-brand" />
                            </div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Collapse toggle */}
                <button
                    onClick={onToggle}
                    className="mt-2 w-full flex items-center justify-center h-8 rounded-[8px] transition-colors duration-150 text-[var(--bs-sidebar-text)] hover:text-white"
                    style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'}
                    aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {collapsed
                        ? <ChevronRight size={15} />
                        : <div className="flex items-center gap-2">
                            <ChevronLeft size={15} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Collapse</span>
                          </div>
                    }
                </button>
            </div>
        </motion.aside>
    );
};

export default Sidebar;
