import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { Clock, TrendingUp, AlertTriangle, RefreshCw, Calendar, ArrowLeft } from 'lucide-react';
import './AnalyticsDashboard.css';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const AnalyticsDashboard = () => {
    const navigate = useNavigate();
    const [efficiency, setEfficiency] = useState([]);
    const [performance, setPerformance] = useState([]);
    const [defects, setDefects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const params = {};
            if (dateRange.start) params.startDate = dateRange.start;
            if (dateRange.end) params.endDate = dateRange.end;

            const [effRes, perfRes, defRes] = await Promise.all([
                api.get('/analytics/efficiency', { params }),
                api.get('/analytics/performance', { params }),
                api.get('/analytics/defects', { params })
            ]);

            setEfficiency(effRes.data);
            setPerformance(perfRes.data);
            setDefects(defRes.data);
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const handleDateChange = (e) => {
        const { name, value } = e.target;
        setDateRange(prev => ({ ...prev, [name]: value }));
    };

    if (loading && efficiency.length === 0) {
        return <div className="analytics-loading">Loading high-integrity analytics...</div>;
    }

    return (
        <div className="analytics-dashboard">
            <header className="analytics-header">
                <div className="header-left">
                    <button className="back-btn" onClick={() => navigate(-1)}>
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1>Production Analytics</h1>
                        <p className="subtitle">Real-time insights from APPROVED logs only</p>
                    </div>
                </div>
                <div className="analytics-controls">
                    <div className="date-inputs">
                        <Calendar size={18} />
                        <input type="date" name="start" value={dateRange.start} onChange={handleDateChange} />
                        <span>to</span>
                        <input type="date" name="end" value={dateRange.end} onChange={handleDateChange} />
                    </div>
                    <button className="refresh-btn" onClick={fetchAnalytics}>
                        <RefreshCw size={18} /> Refresh
                    </button>
                </div>
            </header>

            <div className="analytics-grid">
                {/* Efficiency Chart */}
                <div className="analytics-card">
                    <div className="card-header">
                        <Clock size={20} className="icon-blue" />
                        <h3>Efficiency by Stage (Avg Min)</h3>
                    </div>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={efficiency}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="stage" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="avgDurationMinutes" name="Avg Minutes" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Performance Chart */}
                <div className="analytics-card">
                    <div className="card-header">
                        <TrendingUp size={20} className="icon-green" />
                        <h3>Top Operator Throughput</h3>
                    </div>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={performance.slice(0, 10)} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" />
                                <YAxis dataKey="operatorName" type="category" width={100} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="totalProduced" name="Units Produced" fill="#10b981" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Defect Chart */}
                <div className="analytics-card">
                    <div className="card-header">
                        <AlertTriangle size={20} className="icon-amber" />
                        <h3>Defect Distribution</h3>
                    </div>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={defects}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="totalQuantity"
                                    nameKey="defectCode"
                                    label={(entry) => `${entry.defectCode}: ${entry.totalQuantity}`}
                                >
                                    {defects.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Summary Table */}
                <div className="analytics-card full-width">
                    <div className="card-header">
                        <h3>Operator Performance Detail</h3>
                    </div>
                    <div className="table-responsive">
                        <table className="analytics-table">
                            <thead>
                                <tr>
                                    <th>Operator</th>
                                    <th>Emp Code</th>
                                    <th>Stage</th>
                                    <th>Total Produced</th>
                                    <th>Log Count</th>
                                </tr>
                            </thead>
                            <tbody>
                                {performance.map((p, i) => (
                                    <tr key={i}>
                                        <td>{p.operatorName}</td>
                                        <td>{p.employeeCode}</td>
                                        <td><span className={`badge badge-${p.stage}`}>{p.stage}</span></td>
                                        <td>{p.totalProduced}</td>
                                        <td>{p.logCount}</td>
                                    </tr>
                                ))}
                                {performance.length === 0 && <tr><td colSpan="5" className="text-center">No performance records found.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
