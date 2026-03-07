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
    Cpu,
    FileText,
    ChevronLeft,
    ChevronRight,
    Workflow
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ collapsed, onToggle }) => {
    const { user } = useAuth();

    const menuItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: `/${user?.role?.toLowerCase()}` },
        { icon: Package, label: 'Batches', path: '/batches' },
        { icon: ShieldCheck, label: 'Quality Control', path: '/quality' },
        { icon: RefreshCcw, label: 'Rework Queue', path: '/rework' },
        { icon: Cpu, label: 'Machines', path: '/machines' },
        { icon: Users, label: 'Operators', path: '/operators' },
        { icon: BarChart3, label: 'Analytics', path: '/analytics' },
        { icon: FileText, label: 'Reports', path: '/reports' },
        { icon: Settings, label: 'Settings', path: '/settings' },
    ];

    return (
        <motion.div
            animate={{ width: collapsed ? '80px' : '260px' }}
            initial={false}
            className="h-screen bg-sidebar text-text-secondary flex flex-col sticky top-0 left-0 transition-all duration-300 z-40 border-r border-border shadow-2xl"
        >
            {/* Logo Section */}
            <div className={`h-16 flex items-center ${collapsed ? 'justify-center' : 'px-6'} border-b border-border overflow-hidden shrink-0`}>
                <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
                    <Factory size={20} className="text-white" />
                </div>
                {!collapsed && (
                    <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="ml-3 font-black text-text-primary text-lg tracking-tight whitespace-nowrap"
                    >
                        BRIEF<span className="text-primary italic">SYNC</span>
                    </motion.span>
                )}
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto no-scrollbar">
                {menuItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `
                          flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative
                          ${isActive
                                ? 'bg-primary text-white shadow-xl shadow-primary/30'
                                : 'hover:bg-background hover:text-text-primary'}
                        `}
                    >
                        <item.icon size={20} className={`${collapsed ? 'mx-auto' : 'shrink-0'}`} />
                        {!collapsed && (
                            <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-sm font-bold tracking-tight whitespace-nowrap"
                            >
                                {item.label}
                            </motion.span>
                        )}

                        {/* Tooltip for collapsed state */}
                        {collapsed && (
                            <div className="absolute left-[calc(100%+12px)] px-3 py-1.5 bg-card text-text-primary text-[10px] font-black rounded-lg opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100 whitespace-nowrap pointer-events-none z-50 shadow-2xl border border-border">
                                {item.label}
                                <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-card border-l border-b border-border rotate-45" />
                            </div>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Footer / Toggle */}
            <div className="p-3 border-t border-border">
                <button
                    onClick={onToggle}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-background hover:bg-card rounded-xl transition-all text-text-secondary hover:text-primary border border-border hover:border-primary/20 shadow-sm"
                    aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {collapsed ? <ChevronRight size={20} /> : (
                        <div className="flex items-center gap-2">
                            <ChevronLeft size={20} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Minimize System</span>
                        </div>
                    )}
                </button>
            </div>
        </motion.div>
    );
};

export default Sidebar;
