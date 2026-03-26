import React, { useState, useEffect, useMemo, useRef } from 'react';
import DashboardLayout from '@frontend/layouts/DashboardLayout';
import TableView from '@frontend/components/tables/TableView';
import { useTable } from '@frontend/components/tables/useTable';
import api from '@frontend/services/api';
import { 
    FileText, Download, Sparkles, RefreshCw, AlertCircle, Brain, 
    Clock, Users, Database, ChevronDown, BarChart2, Activity,
    PieChart as PieIcon, TrendingUp as TrendIcon, TrendingDown, Flame, Zap 
} from 'lucide-react';
import { exportToCSV } from '@frontend/services/exportUtils';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
    ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area, 
    ComposedChart, Line 
} from 'recharts';
import { generateProductionReportPDF } from '@frontend/utils/exportProductionReport';
import Badge from '@frontend/components/ui/Badge';
import { SkeletonLoader } from '@frontend/components/UI/StateFeedback';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1'];

const ReportsPage = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    // AI Section States
    const [aiReport, setAiReport] = useState(null); // This held the "generated" report
    const [latestReport, setLatestReport] = useState(null); // This will hold the auto-fetched latest report
    const [latestAiLoading, setLatestAiLoading] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState(null);
    const [isCached, setIsCached] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [filters, setFilters] = useState({
        dateRange: { start: '', end: '' },
        stage: '',
        operatorId: ''
    });

    // Chart Refs for potential export later
    const efficiencyRef = useRef(null);
    const defectsRef = useRef(null);
    const trendRef = useRef(null);
    const throughputRef = useRef(null);
    const bottleneckRef = useRef(null);
    const efficiencyRankingRef = useRef(null);
    const rootCauseRef = useRef(null);

    const parsedReport = useMemo(() => {
        if (!aiReport) return null;
        try {
            // Check if it's already an object or a JSON string
            const data = typeof aiReport === 'string' ? JSON.parse(aiReport) : aiReport;
            return data;
        } catch (e) {
            return null; // Legacy text report
        }
    }, [aiReport]);

    const [availableStages] = useState(['CUTTING', 'STITCHING', 'QUALITY_CHECK', 'LABELING', 'PACKING']);
    const [operators, setOperators] = useState([]);

    const fetchLatestReport = async () => {
        setLatestAiLoading(true);
        try {
            const response = await api.get('/reports/daily/latest');
            setLatestReport(response.data);
        } catch (error) {
            console.error('Failed to fetch latest report:', error);
        } finally {
            setLatestAiLoading(false);
        }
    };

    const fetchReportData = async () => {
        setLoading(true);
        try {
            const response = await api.get('/dashboard/admin');
            const history = response.data.stats.batchHistory || [];
            setData(history);

            // Also fetch operators for AI filters
            const opsRes = await api.get('/users?role=OPERATOR');
            setOperators(opsRes.data.users || []);
            
            // Fetch initial intelligence
            fetchLatestReport();
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

    const handleExportPDF = async (targetReport, e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        const reportToExport = targetReport || parsedReport;
        console.log("PDF Export Clicked. report status:", !!reportToExport);
        
        if (!reportToExport) {
            window.alert('Diagnostic: No report data available to export.');
            return;
        }

        setIsExporting(true);
        window.alert('Industrial Intelligence Engine: Preparing PDF Export...');
        
        try {
            console.log("Calling generateProductionReportPDF...");
            await generateProductionReportPDF(reportToExport, {
                efficiency: efficiencyRef,
                defects: defectsRef,
                trend: trendRef,
                throughput: throughputRef,
                bottleneck: bottleneckRef,
                efficiencyRanking: efficiencyRankingRef,
                rootCause: rootCauseRef
            });
        } catch (error) {
            console.error('Export Wrapper Catch:', error);
            alert(`Export failed: ${error.message}`);
        } finally {
            setIsExporting(false);
        }
    };

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
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Production Intelligence Hub</h2>
                    </div>
                    <button
                        onClick={() => exportToCSV(data, columns, `production_audit_${new Date().toISOString().split('T')[0]}`)}
                        className="btn-saas bg-primary text-white flex items-center gap-2 px-6 py-2.5 shadow-lg shadow-primary/20"
                    >
                        <Download size={16} />
                        Export Audit Log
                    </button>
                </div>

                {/* Relocated Latest Executive Intelligence Widget */}
                <section className="card-saas p-0 overflow-hidden border-primary/20 bg-gradient-to-br from-white to-primary/5 dark:from-card-dark dark:to-primary/5">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-card-dark">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Sparkles className="text-primary animate-pulse" size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-tight">Latest Executive Intelligence</h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Auto-Generated Performance Synthesis</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={fetchLatestReport}
                                disabled={latestAiLoading}
                                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-primary/10 hover:text-primary transition-all disabled:opacity-50"
                            >
                                <RefreshCw size={14} className={latestAiLoading ? 'animate-spin' : ''} />
                            </button>
                            {latestReport && (
                                <button
                                    onClick={(e) => handleExportPDF(latestReport.metrics, e)}
                                    disabled={isExporting}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-lg active:scale-95 disabled:opacity-50"
                                >
                                    <Download size={12} />
                                    Export PDF
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="p-6">
                        {latestAiLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-4">
                                <Brain size={40} className="text-primary/20 animate-pulse" />
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Synthesizing latest factory data...</span>
                            </div>
                        ) : !latestReport ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                                <AlertCircle size={32} className="text-slate-200" />
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No Intelligence Records Found</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <span className="text-[10px] font-black text-primary uppercase tracking-widest px-1">Executive Summary • {new Date(latestReport.reportDate).toLocaleDateString()}</span>
                                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-semibold bg-white/80 dark:bg-card-dark/80 p-5 rounded-2xl border border-primary/10 italic shadow-sm">
                                        "{latestReport.metrics?.executive_summary || latestReport.metrics?.summary || latestReport.summary}"
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    {[
                                        { label: 'Units Processed', value: (latestReport.metrics?.kpis?.units_processed || 0).toLocaleString(), icon: Database, color: 'text-primary' },
                                        { label: 'Defect Rate', value: `${(latestReport.metrics?.kpis?.defect_rate || 0).toFixed(2)}%`, icon: AlertCircle, color: 'text-warning' },
                                        { label: 'Batches Analyzed', value: latestReport.metrics?.kpis?.total_batches || 0, icon: FileText, color: 'text-slate-500' },
                                        { label: 'Top Performer', value: latestReport.metrics?.kpis?.top_operator || 'N/A', icon: Users, color: 'text-success' }
                                    ].map((kpi, idx) => (
                                        <div key={idx} className="p-4 rounded-2xl bg-white dark:bg-card-dark border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:border-primary/20">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1 tracking-widest">{kpi.label}</span>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-black text-slate-900 dark:text-white">{kpi.value}</span>
                                                <kpi.icon size={14} className={kpi.color} />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Brain size={16} className="text-primary" />
                                            <span className="text-[10px] font-black text-primary uppercase tracking-widest">Detailed Analysis</span>
                                        </div>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-semibold">
                                            {latestReport.metrics?.operational_analysis || "Operational synthesis pending..."}
                                        </p>
                                    </div>
                                    <div className="p-5 rounded-2xl bg-error/5 border border-error/10">
                                        <div className="flex items-center gap-2 mb-3">
                                            <TrendingDown size={16} className="text-error" />
                                            <span className="text-[10px] font-black text-error uppercase tracking-widest">Risk Assessment</span>
                                        </div>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-semibold">
                                            {latestReport.metrics?.risk_assessment || "Risk evaluation currently unavailable."}
                                        </p>
                                    </div>
                                    <div className="p-5 rounded-2xl bg-success/5 border border-success/10">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Zap size={16} className="text-success" />
                                            <span className="text-[10px] font-black text-success uppercase tracking-widest">Recommendations</span>
                                        </div>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-semibold">
                                            {latestReport.metrics?.recommendations || "Awaiting strategy generation..."}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

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
                                <button
                                    onClick={handleExportPDF}
                                    disabled={isExporting}
                                    className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-50"
                                >
                                    {isExporting ? <RefreshCw size={12} className="animate-spin" /> : <Download size={12} />}
                                    {isExporting ? 'Preparing...' : 'Download PDF'}
                                </button>
                            </div>

                            <div className="space-y-6 relative z-10">
                                <div className="flex items-center gap-2">
                                    <div className="w-1 h-6 bg-primary rounded-full" />
                                    <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-tight text-sm">Production Intelligence Synthesis</h4>
                                </div>

                                {parsedReport ? (
                                    <div className="space-y-8 mt-4">
                                        {/* 1. Intelligence Paragraph */}
                                        <div className="space-y-2">
                                            <span className="text-[10px] font-black text-primary uppercase tracking-widest px-1">Executive Summary</span>
                                            <p className="text-sm text-text-secondary leading-relaxed font-medium bg-white/50 dark:bg-slate-900/50 p-5 rounded-2xl border border-primary/10 italic">
                                                "{parsedReport.executive_summary || parsedReport.metrics?.executive_summary || parsedReport.summary}"
                                            </p>
                                        </div>

                                        {/* 2. KPI Grid */}
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                            {[
                                                { label: 'Units Processed', value: (parsedReport.kpis?.units_processed || parsedReport.metrics?.kpis?.units_processed || 0).toLocaleString(), icon: Database, color: 'text-primary' },
                                                { label: 'Defect Rate', value: `${(parsedReport.kpis?.defect_rate || parsedReport.metrics?.kpis?.defect_rate || 0).toFixed(2)}%`, icon: AlertCircle, color: 'text-warning' },
                                                { label: 'Batches Total', value: parsedReport.kpis?.total_batches || parsedReport.metrics?.kpis?.total_batches, icon: FileText, color: 'text-slate-500' },
                                                { label: 'Lead Performer', value: parsedReport.kpis?.top_operator || parsedReport.metrics?.kpis?.top_operator, icon: Users, color: 'text-success' }
                                            ].map((kpi, idx) => (
                                                <div key={idx} className="p-4 rounded-2xl bg-white dark:bg-card-dark border border-slate-100 dark:border-slate-800 shadow-sm">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1 tracking-widest">{kpi.label}</span>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-black text-slate-900 dark:text-white truncate max-w-[120px]">{kpi.value || 'N/A'}</span>
                                                        <kpi.icon size={14} className={kpi.color} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                            <div className="space-y-4">
                                            <div ref={efficiencyRef}>
                                                <div className="h-[260px] w-full p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-4 px-1">Stage Efficiency</span>
                                                    <ResponsiveContainer width="100%" height="80%">
                                                        <BarChart data={parsedReport.stage_efficiency || parsedReport.metrics?.stage_efficiency || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                                                            <XAxis dataKey="stage" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700 }} />
                                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9 }} />
                                                            <Bar dataKey="avg_time" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                                                            <RechartsTooltip
                                                                contentStyle={{ borderRadius: '8px', border: 'none', fontSize: '10px', fontWeight: 900 }}
                                                                labelStyle={{ display: 'none' }}
                                                            />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>
                                            </div>

                                            <div className="space-y-4">
                                            <div ref={defectsRef}>
                                                <div className="h-[260px] w-full p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-4 px-1">Defect Distribution</span>
                                                    <ResponsiveContainer width="100%" height="80%">
                                                        <PieChart>
                                                            <Pie
                                                                data={parsedReport.defect_distribution || parsedReport.metrics?.defect_distribution || []}
                                                                innerRadius={45}
                                                                outerRadius={65}
                                                                paddingAngle={5}
                                                                dataKey="count"
                                                                nameKey="defect"
                                                            >
                                                                {(parsedReport.defect_distribution || parsedReport.metrics?.defect_distribution)?.map((entry, index) => (
                                                                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                                                ))}
                                                            </Pie>
                                                            <RechartsTooltip />
                                                            <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '9px', paddingTop: '15px' }} />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>
                                            </div>
                                        </div>

                                        {/* New Advanced Analytics Expansion */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                            {/* 1. Production Velocity Trend */}
                                            <div ref={trendRef}>
                                                <div className="h-[260px] w-full p-6 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800">
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <TrendIcon size={16} className="text-primary" />
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">7-Day Trend Velocity</span>
                                                    </div>
                                                    <ResponsiveContainer width="100%" height="80%">
                                                        <AreaChart data={parsedReport.throughput_trend || parsedReport.metrics?.throughput_trend || []}>
                                                            <defs>
                                                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                                </linearGradient>
                                                            </defs>
                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                                                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9 }} />
                                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9 }} />
                                                            <Area type="monotone" dataKey="value" stroke="#3b82f6" fillOpacity={1} fill="url(#colorValue)" strokeWidth={2} />
                                                            <RechartsTooltip />
                                                        </AreaChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>

                                            {/* 2. Throughput Projection */}
                                            <div ref={throughputRef}>
                                                <div className="h-[260px] w-full p-6 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800">
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <Activity size={16} className="text-primary" />
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Throughput Volume</span>
                                                    </div>
                                                    <ResponsiveContainer width="100%" height="80%">
                                                        <BarChart data={parsedReport.throughput_trend || parsedReport.metrics?.throughput_trend || []}>
                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                                                            <XAxis dataKey="label" hide />
                                                            <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                                            <RechartsTooltip />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>

                                            {/* 3. Bottleneck Analysis Heatmap */}
                                            <div ref={bottleneckRef}>
                                                <div className="h-[260px] w-full p-6 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800">
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <Flame size={16} className="text-error" />
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bottleneck Heatmap</span>
                                                    </div>
                                                    <ResponsiveContainer width="100%" height="80%">
                                                        <ComposedChart data={parsedReport.bottleneck_heatmap || parsedReport.metrics?.bottleneck_heatmap || []}>
                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                                                            <XAxis dataKey="stage" hide />
                                                            <Bar dataKey="delay_factor" fill="#ef4444" opacity={0.6} barSize={30} />
                                                            <Line type="monotone" dataKey="delay_factor" stroke="#ef4444" strokeWidth={3} dot={{ fill: '#ef4444' }} />
                                                            <RechartsTooltip />
                                                        </ComposedChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>

                                            {/* 4. Operator Efficiency Rankings */}
                                            <div ref={efficiencyRankingRef}>
                                                <div className="h-[260px] w-full p-6 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800">
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <BarChart2 size={16} className="text-success" />
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Efficiency Rankings</span>
                                                    </div>
                                                    <ResponsiveContainer width="100%" height="80%">
                                                        <BarChart layout="vertical" data={parsedReport.operator_efficiency || parsedReport.metrics?.operator_efficiency || []} margin={{ left: 20 }}>
                                                            <XAxis type="number" hide />
                                                            <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fontWeight: 700 }} width={80} />
                                                            <Bar dataKey="score" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                                                            <RechartsTooltip />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>

                                            {/* 5. Defect Root Causes */}
                                            <div ref={rootCauseRef}>
                                                <div className="h-[260px] w-full p-6 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800">
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <PieIcon size={16} className="text-warning" />
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Root Cause Attribution</span>
                                                    </div>
                                                    <ResponsiveContainer width="100%" height="80%">
                                                        <PieChart>
                                                            <Pie
                                                                data={parsedReport.defect_root_causes || parsedReport.metrics?.defect_root_causes || []}
                                                                innerRadius={50}
                                                                outerRadius={70}
                                                                dataKey="percentage"
                                                                nameKey="cause"
                                                                label={({ cause, percentage }) => `${cause}: ${percentage}%`}
                                                            >
                                                                {(parsedReport.defect_root_causes || parsedReport.metrics?.defect_root_causes)?.map((entry, index) => (
                                                                    <Cell key={`cell-${index}`} fill={CHART_COLORS[(index + 4) % CHART_COLORS.length]} />
                                                                ))}
                                                            </Pie>
                                                            <RechartsTooltip />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 4. Multi-Section Analysis */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <Brain size={16} className="text-primary" />
                                                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">Operational Analysis</span>
                                                </div>
                                                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                                                    {parsedReport.operational_analysis || parsedReport.metrics?.operational_analysis || "Analysis pending... Click regenerate to update data."}
                                                </p>
                                            </div>

                                            <div className="p-6 rounded-2xl bg-error/5 border border-error/10">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <AlertCircle size={16} className="text-error" />
                                                    <span className="text-[10px] font-black text-error uppercase tracking-widest">Risk Assessment</span>
                                                </div>
                                                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                                                    {parsedReport.risk_assessment || parsedReport.metrics?.risk_assessment || "Risk evaluation pending..."}
                                                </p>
                                            </div>

                                            <div className="p-6 rounded-2xl bg-success/5 border border-success/10">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <Sparkles size={16} className="text-success" />
                                                    <span className="text-[10px] font-black text-success uppercase tracking-widest">Recommendations</span>
                                                </div>
                                                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                                                    {parsedReport.recommendations || parsedReport.metrics?.recommendations || "Awaiting AI strategy..."}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed font-medium whitespace-pre-wrap">
                                        {aiReport}
                                    </div>
                                )}

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
