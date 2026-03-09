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

    if (loading) return <div className="p-8 text-center animate-pulse">Calculating performance...</div>;

    return (
        <section className="card-saas p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-text-primary flex items-center gap-2">
                    <Trophy size={18} className="text-warning" /> Performance Leaderboard
                </h3>
            </div>

            <div className="space-y-4">
                {rankings.map((op, index) => (
                    <div key={op.id} className="flex items-center gap-4 p-3 rounded-xl bg-background border border-border">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${index === 0 ? 'bg-warning/20 text-warning' :
                            index === 1 ? 'bg-slate-200 text-slate-500' :
                                index === 2 ? 'bg-amber-100 text-amber-700' : 'bg-slate-50 text-slate-400'
                            }`}>
                            #{index + 1}
                        </div>

                        <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-text-primary truncate">{op.name}</h4>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{op.role}</p>
                        </div>

                        <div className="text-right">
                            <div className="flex items-center justify-end gap-1 text-primary font-bold text-sm">
                                <TrendingUp size={12} />
                                {op.efficiency}%
                            </div>
                            <p className="text-[9px] font-black text-slate-300 uppercase">{op.units} units</p>
                        </div>
                    </div>
                ))}
            </div>

            <button className="w-full mt-6 py-2.5 rounded-xl border-2 border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all">
                View Full Workforce Data
            </button>
        </section>
    );
};

export default OperatorLeaderboard;
