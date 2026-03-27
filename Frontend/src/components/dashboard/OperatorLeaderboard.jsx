import React, { useState, useEffect } from 'react';
import { Trophy, Award, TrendingUp, User } from 'lucide-react';
import api from '@frontend/services/api';

const OperatorLeaderboard = () => {
    const [rankings, setRankings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRankings = async () => {
            try {
                const response = await api.get('/analytics/operator-rankings');
                setRankings(response.data);
            } catch (error) {
                console.error('Failed to fetch rankings:', error);
                // Fallback for demo
                setRankings([
                    { id: 1, name: 'John Doe', efficiency: 98.4, units: 1420, role: 'Stitching' },
                    { id: 2, name: 'Sarah Smith', efficiency: 96.2, units: 1380, role: 'Cutting' },
                    { id: 3, name: 'Michael Chen', efficiency: 95.8, units: 1310, role: 'QC' },
                    { id: 4, name: 'Anna Bel', efficiency: 94.1, units: 1290, role: 'Packing' },
                ]);
            } finally {
                setLoading(false);
            }
        };
        fetchRankings();
    }, []);

    const rankBg = (i) => i === 0 ? 'rgba(234,179,8,0.15)' : i === 1 ? 'rgba(148,163,184,0.15)' : i === 2 ? 'rgba(217,119,6,0.12)' : 'var(--bs-background)';
    const rankColor = (i) => i === 0 ? 'var(--bs-warning)' : i === 1 ? '#94a3b8' : i === 2 ? '#d97706' : 'var(--bs-text-muted)';

    if (loading) return (
        <section style={{ backgroundColor: 'var(--bs-surface)', border: '1px solid var(--bs-border)', borderRadius: '10px', padding: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: '56px', borderRadius: '8px' }} />)}
            </div>
        </section>
    );

    return (
        <section style={{ backgroundColor: 'var(--bs-surface)', border: '1px solid var(--bs-border)', borderRadius: '10px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h3 style={{ fontWeight: 700, color: 'var(--bs-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Trophy size={18} style={{ color: 'var(--bs-warning)' }} /> Performance Leaderboard
                </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {rankings.map((op, index) => (
                    <div key={op.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '8px', backgroundColor: 'var(--bs-background)', border: '1px solid var(--bs-border)' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '11px', backgroundColor: rankBg(index), color: rankColor(index), flexShrink: 0 }}>
                            #{index + 1}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--bs-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{op.name}</div>
                            <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--bs-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{op.role}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', color: 'var(--bs-brand)', fontWeight: 700, fontSize: '13px' }}>
                                <TrendingUp size={11} />{op.efficiency}%
                            </div>
                            <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--bs-text-muted)', textTransform: 'uppercase' }}>{op.units} units</div>
                        </div>
                    </div>
                ))}
            </div>

            <button style={{ width: '100%', marginTop: '16px', padding: '10px', borderRadius: '8px', border: '1px solid var(--bs-border)', backgroundColor: 'transparent', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--bs-text-muted)', cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bs-background)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
                View Full Workforce Data
            </button>
        </section>
    );
};

export default OperatorLeaderboard;
