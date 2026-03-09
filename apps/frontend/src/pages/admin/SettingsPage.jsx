import React from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Settings, ShieldCheck, Lock, Bell } from 'lucide-react';

const SettingsPage = () => {
    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                    <Settings className="text-primary" size={24} />
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">System Configuration</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <section className="card-saas p-6 space-y-6">
                        <div className="flex items-center gap-3 border-b border-border pb-4">
                            <ShieldCheck size={20} className="text-success" />
                            <h3 className="font-bold">Governance & Security</h3>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-sm font-bold">Two-Factor Authentication</p>
                                    <p className="text-[10px] text-slate-500 uppercase font-black">Mandatory for all Admin personnel</p>
                                </div>
                                <div className="w-10 h-6 bg-success/20 rounded-full flex items-center px-1">
                                    <div className="w-4 h-4 bg-success rounded-full ml-auto" />
                                </div>
                            </div>
                            <div className="flex justify-between items-center opacity-50">
                                <div>
                                    <p className="text-sm font-bold">IP Restriction Layer</p>
                                    <p className="text-[10px] text-slate-500 uppercase font-black">Managed via Lock Layer v2</p>
                                </div>
                                <div className="w-10 h-6 bg-slate-200 rounded-full flex items-center px-1">
                                    <div className="w-4 h-4 bg-white rounded-full" />
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="card-saas p-6 space-y-6">
                        <div className="flex items-center gap-3 border-b border-border pb-4">
                            <Bell size={20} className="text-warning" />
                            <h3 className="font-bold">Global Notifications</h3>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-sm font-bold">Defect Spike Alerts</p>
                                    <p className="text-[10px] text-slate-500 uppercase font-black">Notify if &gt; 5% in 1 hour</p>
                                </div>
                                <div className="w-10 h-6 bg-success/20 rounded-full flex items-center px-1">
                                    <div className="w-4 h-4 bg-success rounded-full ml-auto" />
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-sm font-bold">Machine Downtime Alerts</p>
                                    <p className="text-[10px] text-slate-500 uppercase font-black">Real-time floor alerts</p>
                                </div>
                                <div className="w-10 h-6 bg-success/20 rounded-full flex items-center px-1">
                                    <div className="w-4 h-4 bg-success rounded-full ml-auto" />
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                <section className="card-saas p-12 text-center border-2 border-dashed border-border">
                    <Lock size={48} className="mx-auto text-slate-100 mb-4" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Technical system parameters are derived from the production environment variables.</p>
                </section>
            </div>
        </DashboardLayout>
    );
};

export default SettingsPage;
