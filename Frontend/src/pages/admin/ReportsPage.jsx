import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@frontend/layouts/DashboardLayout';
import TableView from '@frontend/components/tables/TableView';
import { useTable } from '@frontend/components/tables/useTable';
import api from '@frontend/services/api';
import { FileText, Download, Sparkles, RefreshCw, AlertCircle, Brain, Clock, Users, Database, ChevronDown } from 'lucide-react';
import { exportToCSV } from '@frontend/services/exportUtils';
import Badge from '@frontend/components/ui/Badge';
import { SkeletonLoader } from '@frontend/components/UI/StateFeedback';

const ReportsPage = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    // AI Section States
    const [aiReport, setAiReport] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState(null);
    const [isCached, setIsCached] = useState(false);
    const [filters, setFilters] = useState({
        dateRange: { start: '', end: '' },
        stage: '',
        operatorId: ''
    });
    const [availableStages] = useState(['CUTTING', 'STITCHING', 'QUALITY_CHECK', 'LABELING', 'PACKING']);
    const [operators, setOperators] = useState([]);

    const fetchReportData = async () => {
        setLoading(true);
        try {
            const response = await api.get('/dashboard/admin');
            const history = response.data.stats.batchHistory || [];
            setData(history);

            // Also fetch operators for AI filters
            const opsRes = await api.get('/users?role=OPERATOR');
            setOperators(opsRes.data || []);
        } catch (error) {
            console.error('Failed to fetch reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateAIReport = async (isRegenerateEntries = false) => {
        setAiLoading(true);
        setAiError(null);
        try {
            const response = await api.post('/ai/report', {
                ...filters,
                isRegenerate: isRegenerateEntries
            });
            setAiReport(response.data.report);
            setIsCached(response.data.cached);
        } catch (error) {
            console.error('AI Report Generation Failed:', error);
            setAiError(error.response?.data?.error || 'Local AI service unavailable. Please ensure Ollama is running.');
        } finally {
            setAiLoading(false);
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        if (name.startsWith('date.')) {
            const dateKey = name.split('.')[1];
            setFilters(prev => ({ ...prev, dateRange: { ...prev.dateRange, [dateKey]: value } }));
        } else {
            setFilters(prev => ({ ...prev, [name]: value }));
        }
    };

    useEffect(() => {
        fetchReportData();
    }, []);

    const columns = [
        { key: 'batchNumber', label: 'Batch ID', render: (val) => <span className="font-bold">{val}</span> },
        { key: 'briefTypeName', label: 'Configuration' },
        { key: 'currentStage', label: 'Last Phase', render: (val) => <Badge status={val} /> },
        { key: 'totalQuantity', label: 'Quantity' },
        { key: 'updatedAt', label: 'Completed Date', render: (val) => new Date(val).toLocaleDateString() }
    ];

    const {
        data: paginatedData,
        sortConfig,
        requestSort,
        searchTerm,
        setSearchTerm
    } = useTable(data, {
        searchKeys: ['batchNumber', 'briefTypeName']
    });

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <FileText className="text-primary" size={24} />
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Production Reports</h2>
                    </div>
                    <button
                        onClick={() => exportToCSV(data, columns, `production_audit_${new Date().toISOString().split('T')[0]}`)}
                        className="btn-saas bg-primary text-white flex items-center gap-2 px-6 py-2.5 shadow-lg shadow-primary/20"
                    >
                        <Download size={16} />
                        Export Audit Log
                    </button>
                </div>

                <section className="card-saas p-6">
                    <TableView
                        data={paginatedData}
                        columns={columns}
                        sortConfig={sortConfig}
                        requestSort={requestSort}
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        loading={loading}
                        emptyMessage="No audit records available."
                    />
                </section>

                {/* AI Production Report Generator Section */}
                <section className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Brain className="text-primary" size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">AI Production Report Generator</h3>
                                <p className="text-xs text-slate-500 font-medium">Generate industrial intelligence reports using local LLM</p>
                            </div>
                        </div>
                        {aiReport && (
                            <button
                                onClick={() => generateAIReport(true)}
                                disabled={aiLoading}
                                className="flex items-center gap-2 text-xs font-bold text-primary hover:text-primary-dark transition-colors disabled:opacity-50"
                            >
                                <RefreshCw size={14} className={aiLoading ? 'animate-spin' : ''} />
                                REGENERATE REPORT
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Clock size={12} /> Date Range
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="date"
                                    name="date.start"
                                    value={filters.dateRange.start}
                                    onChange={handleFilterChange}
                                    className="flex-1 bg-white dark:bg-card-dark border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-medium outline-none focus:ring-1 focus:ring-primary/50"
                                />
                                <span className="text-slate-300 text-xs">to</span>
                                <input
                                    type="date"
                                    name="date.end"
                                    value={filters.dateRange.end}
                                    onChange={handleFilterChange}
                                    className="flex-1 bg-white dark:bg-card-dark border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-medium outline-none focus:ring-1 focus:ring-primary/50"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Database size={12} /> Stage Filter
                            </label>
                            <select
                                name="stage"
                                value={filters.stage}
                                onChange={handleFilterChange}
                                className="w-full bg-white dark:bg-card-dark border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-medium outline-none focus:ring-1 focus:ring-primary/50 appearance-none"
                            >
                                <option value="">All Production Stages</option>
                                {availableStages.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Users size={12} /> Operator
                            </label>
                            <select
                                name="operatorId"
                                value={filters.operatorId}
                                onChange={handleFilterChange}
                                className="w-full bg-white dark:bg-card-dark border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-medium outline-none focus:ring-1 focus:ring-primary/50 appearance-none"
                            >
                                <option value="">All Operators</option>
                                {operators.map(op => <option key={op.id} value={op.id}>{op.fullName} ({op.employeeCode})</option>)}
                            </select>
                        </div>

                        <div className="flex items-end">
                            <button
                                onClick={() => generateAIReport(false)}
                                disabled={aiLoading}
                                className="w-full btn-saas bg-slate-900 dark:bg-white dark:text-slate-900 text-white flex items-center justify-center gap-2 py-2.5 shadow-xl shadow-slate-200 dark:shadow-none transition-all hover:scale-[1.02] disabled:opacity-70 disabled:scale-100"
                            >
                                {aiLoading ? (
                                    <>
                                        <RefreshCw size={16} className="animate-spin" />
                                        Computing...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={16} />
                                        Generate AI Report
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* AI Output Display */}
                    {aiLoading ? (
                        <div className="card-saas p-8 border-dashed border-primary/30 bg-primary/5">
                            <div className="flex flex-col items-center justify-center gap-4 py-8">
                                <div className="relative">
                                    <Brain size={48} className="text-primary animate-pulse" />
                                    <Sparkles size={16} className="absolute -top-1 -right-1 text-amber-500 animate-bounce" />
                                </div>
                                <div className="text-center">
                                    <h4 className="font-bold text-slate-900 dark:text-white">Local AI Processing</h4>
                                    <p className="text-xs text-slate-500">Analyzing manufacturing patterns and efficiency metrics...</p>
                                </div>
                                <div className="w-full max-w-xs h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mt-2">
                                    <div className="h-full bg-primary animate-[loading_2s_ease-in-out_infinite]" style={{ width: '40%' }}></div>
                                </div>
                            </div>
                        </div>
                    ) : aiError ? (
                        <div className="card-saas p-6 border-red-100 bg-red-50/50 dark:bg-red-900/10 dark:border-red-900/20">
                            <div className="flex items-start gap-4">
                                <AlertCircle className="text-red-500 shrink-0" size={20} />
                                <div>
                                    <h4 className="font-bold text-red-900 dark:text-red-400 text-sm">Service Interruption</h4>
                                    <p className="text-xs text-red-600 dark:text-red-500/70 mt-1">{aiError}</p>
                                    <button
                                        onClick={() => generateAIReport(false)}
                                        className="mt-3 text-[10px] font-bold text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-3 py-1 rounded-full hover:bg-red-200 transition-colors"
                                    >
                                        RETRY CONNECTION
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : aiReport ? (
                        <div className="card-saas p-8 bg-gradient-to-br from-white to-slate-50/50 dark:from-card-dark dark:to-slate-900/50 border-primary/20 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4">
                                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${isCached ? 'bg-slate-100 text-slate-500' : 'bg-primary/10 text-primary animate-pulse'}`}>
                                    {isCached ? <Clock size={10} /> : <Sparkles size={10} />}
                                    {isCached ? 'Cached Result' : 'Local AI Live'}
                                </div>
                            </div>

                            <div className="space-y-4 relative z-10">
                                <div className="flex items-center gap-2">
                                    <div className="w-1 h-6 bg-primary rounded-full" />
                                    <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-tight text-sm">Production Intelligence Synthesis</h4>
                                </div>

                                <div className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed font-medium whitespace-pre-wrap">
                                    {aiReport}
                                </div>

                                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Analysis Scope</span>
                                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">{filters.stage || 'All Stages'} • {filters.dateRange.start ? `${filters.dateRange.start} to ${filters.dateRange.end}` : 'Full History'}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                        <div className="w-2 h-2 rounded-full bg-success"></div>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Read-Only Verified</span>
                                    </div>
                                </div>
                            </div>

                            {/* Decorative background brain icon */}
                            <Brain size={120} className="absolute -bottom-8 -right-8 text-primary/5 -rotate-12 pointer-events-none" />
                        </div>
                    ) : (
                        <div className="card-saas p-12 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center mb-4">
                                <Sparkles size={32} className="text-slate-300" />
                            </div>
                            <h4 className="font-bold text-slate-700 dark:text-slate-400">Ready for Analysis</h4>
                            <p className="text-xs text-slate-400 max-w-xs mt-2">Configure filters above and click generate to synthesize internal production intelligence.</p>
                        </div>
                    )}
                </section>
            </div>
        </DashboardLayout>
    );
};

export default ReportsPage;
