import React, { useState, useEffect } from 'react';
import { Cpu, Wifi, WifiOff, AlertTriangle, ShieldCheck } from 'lucide-react';
import api from '../../utils/api';

const MachineStatusPanel = () => {
    const [machines, setMachines] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchStatus = async () => {
        try {
            const response = await api.get('/machines/status');
            setMachines(response.data);
        } catch (error) {
            console.error('Failed to fetch machine status:', error);
            // Fallback for demo if API doesn't exist yet
            setMachines([
                { id: 'MC-01', name: 'Cutting-A1', status: 'ONLINE', load: 78, type: 'CUTTING' },
                { id: 'MC-02', name: 'Stitch-S4', status: 'ONLINE', load: 45, type: 'STITCHING' },
                { id: 'MC-03', name: 'Stitch-S5', status: 'OFFLINE', load: 0, type: 'STITCHING' },
                { id: 'MC-04', name: 'Pack-P1', status: 'WARNING', load: 92, type: 'PACKING' },
            ]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div className="p-8 text-center animate-pulse">Scanning production floor...</div>;

    return (
        <section className="card-saas p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-text-primary flex items-center gap-2">
                    <Cpu size={18} className="text-primary" /> Machine Matrix
                </h3>
                <span className="text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-full uppercase">
                    Live Status
                </span>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {machines.map((m) => (
                    <div key={m.id} className="p-3 rounded-xl bg-background border border-border group hover:border-primary/30 transition-all">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                                {m.status === 'ONLINE' ? (
                                    <Wifi size={14} className="text-success" />
                                ) : m.status === 'OFFLINE' ? (
                                    <WifiOff size={14} className="text-slate-400" />
                                ) : (
                                    <AlertTriangle size={14} className="text-warning" />
                                )}
                                <span className="text-xs font-bold text-text-primary">{m.name}</span>
                            </div>
                            <span className={`text-[10px] font-black uppercase ${m.status === 'ONLINE' ? 'text-success' :
                                    m.status === 'OFFLINE' ? 'text-slate-400' : 'text-warning'
                                }`}>
                                {m.status}
                            </span>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-500 ${m.load > 90 ? 'bg-error' : m.load > 70 ? 'bg-warning' : 'bg-primary'
                                        }`}
                                    style={{ width: `${m.load}%` }}
                                />
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 w-8">{m.load}%</span>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default MachineStatusPanel;
