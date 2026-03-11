import React, { useState, useEffect } from 'react';
import { Cpu, Wifi, WifiOff, AlertTriangle, ShieldCheck } from 'lucide-react';
import api from '@frontend/services/api';

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

    const statusColor = (s) => s === 'ONLINE' ? 'var(--bs-success)' : s === 'OFFLINE' ? 'var(--bs-text-muted)' : 'var(--bs-warning)';
    const barColor = (load) => load > 90 ? 'var(--bs-danger)' : load > 70 ? 'var(--bs-warning)' : 'var(--bs-brand)';

    if (loading) return (
        <section style={{ backgroundColor: 'var(--bs-surface)', border: '1px solid var(--bs-border)', borderRadius: '10px', padding: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: '52px', borderRadius: '8px' }} />)}
            </div>
        </section>
    );

    return (
        <section style={{ backgroundColor: 'var(--bs-surface)', border: '1px solid var(--bs-border)', borderRadius: '10px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h3 style={{ fontWeight: 700, color: 'var(--bs-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Cpu size={18} style={{ color: 'var(--bs-brand)' }} /> Machine Matrix
                </h3>
                <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--bs-success)', backgroundColor: 'rgba(34,197,94,0.1)', padding: '2px 10px', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Live
                </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {machines.map((m) => (
                    <div key={m.id} style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'var(--bs-background)', border: '1px solid var(--bs-border)', transition: 'border-color 0.15s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {m.status === 'ONLINE' ? <Wifi size={13} style={{ color: 'var(--bs-success)' }} /> : m.status === 'OFFLINE' ? <WifiOff size={13} style={{ color: 'var(--bs-text-muted)' }} /> : <AlertTriangle size={13} style={{ color: 'var(--bs-warning)' }} />}
                                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--bs-text-primary)' }}>{m.name}</span>
                                <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--bs-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.type}</span>
                            </div>
                            <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: statusColor(m.status) }}>{m.status}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ flex: 1, height: '5px', backgroundColor: 'var(--bs-border)', borderRadius: '99px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${m.load}%`, backgroundColor: barColor(m.load), borderRadius: '99px', transition: 'width 0.5s ease' }} />
                            </div>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--bs-text-muted)', width: '30px' }}>{m.load}%</span>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default MachineStatusPanel;
