import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@frontend/layouts/DashboardLayout';
import TableView from '@frontend/components/tables/TableView';
import { useTable } from '@frontend/components/tables/useTable';
import PageHeader from '@frontend/components/ui/PageHeader';
import Button from '@frontend/components/ui/Button';
import StatusBadge from '@frontend/components/ui/StatusBadge';
import api from '@frontend/services/api';
import { FileText, Download, Sparkles, RefreshCw, AlertCircle, Brain, Clock, Users, Database, ChevronDown } from 'lucide-react';
import { exportToCSV } from '@frontend/services/exportUtils';

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
            setOperators(opsRes.data?.users || opsRes.data || []);
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
        { key: 'batchNumber', label: 'Batch ID', render: (val) => <span style={{ fontWeight: 700 }}>{val}</span> },
        { key: 'briefTypeName', label: 'Configuration' },
        { key: 'currentStage', label: 'Last Phase', render: (val) => <StatusBadge status={val} /> },
        { key: 'totalQuantity', label: 'Quantity' },
        { key: 'updatedAt', label: 'Completed Date', render: (val) => new Date(val).toLocaleDateString() }
    ];

    const {
        data: paginatedData,
        sortConfig,
        requestSort,
        searchTerm,
        setSearchTerm,
        currentPage,
        setCurrentPage,
        totalPages,
        totalItems,
        pageSize
    } = useTable(data, {
        searchKeys: ['batchNumber', 'briefTypeName']
    });

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <PageHeader
                    title="Production Reports"
                    subtitle="Audit logs and AI-generated manufacturing intelligence"
                    actions={
                        <Button variant="primary" size="sm" leftIcon={Download} onClick={() => exportToCSV(data, columns, `production_audit_${new Date().toISOString().split('T')[0]}`)}>
                            Export Audit Log
                        </Button>
                    }
                />

                <section style={{ backgroundColor: 'var(--bs-surface)', border: '1px solid var(--bs-border)', borderRadius: '10px', padding: '24px' }}>
                    <TableView
                        data={paginatedData}
                        columns={columns}
                        sortConfig={sortConfig}
                        requestSort={requestSort}
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        currentPage={currentPage}
                        setCurrentPage={setCurrentPage}
                        totalPages={totalPages}
                        totalItems={totalItems}
                        pageSize={pageSize}
                        loading={loading}
                        emptyMessage="No audit records available."
                    />
                </section>

                <section style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingTop: '24px', borderTop: '1px solid var(--bs-border)' }}>
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
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 700, color: 'var(--bs-brand)', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', opacity: aiLoading ? 0.5 : 1 }}
                            >
                                <RefreshCw size={14} className={aiLoading ? 'animate-spin' : ''} />
                                REGENERATE REPORT
                            </button>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', padding: '24px', backgroundColor: 'var(--bs-background)', borderRadius: '12px', border: '1px solid var(--bs-border)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--bs-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Clock size={12} /> Date Range
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input type="date" name="date.start" value={filters.dateRange.start} onChange={handleFilterChange} className="input-field" style={{ flex: 1 }} />
                                <span style={{ color: 'var(--bs-text-muted)', fontSize: '12px' }}>to</span>
                                <input type="date" name="date.end" value={filters.dateRange.end} onChange={handleFilterChange} className="input-field" style={{ flex: 1 }} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--bs-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Database size={12} /> Stage Filter
                            </label>
                            <select name="stage" value={filters.stage} onChange={handleFilterChange} className="input-field">
                                <option value="">All Production Stages</option>
                                {availableStages.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--bs-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Users size={12} /> Operator
                            </label>
                            <select name="operatorId" value={filters.operatorId} onChange={handleFilterChange} className="input-field">
                                <option value="">All Operators</option>
                                {operators.map(op => <option key={op.id} value={op.id}>{op.fullName} ({op.employeeCode})</option>)}
                            </select>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <Button variant="primary" size="md" leftIcon={aiLoading ? RefreshCw : Sparkles} loading={aiLoading} onClick={() => generateAIReport(false)} style={{ width: '100%', justifyContent: 'center' }}>
                                {aiLoading ? 'Computing...' : 'Generate AI Report'}
                            </Button>
                        </div>
                    </div>

                    {/* AI Output Display */}
                    {aiLoading ? (
                        <div style={{ backgroundColor: 'var(--bs-surface)', border: '1px dashed rgba(14,165,233,0.3)', borderRadius: '10px', padding: '48px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                                <Brain size={40} style={{ color: 'var(--bs-brand)' }} />
                                <div>
                                    <h4 style={{ fontWeight: 700, color: 'var(--bs-text-primary)' }}>Local AI Processing</h4>
                                    <p style={{ fontSize: '12px', color: 'var(--bs-text-muted)', marginTop: '4px' }}>Analyzing manufacturing patterns...</p>
                                </div>
                                <div style={{ width: '200px', height: '4px', backgroundColor: 'var(--bs-border)', borderRadius: '99px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: '40%', backgroundColor: 'var(--bs-brand)', borderRadius: '99px' }} />
                                </div>
                            </div>
                        </div>
                    ) : aiError ? (
                        <div style={{ backgroundColor: 'var(--bs-surface)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                                <AlertCircle style={{ color: 'var(--bs-danger)', flexShrink: 0 }} size={20} />
                                <div>
                                    <h4 style={{ fontWeight: 700, color: 'var(--bs-danger)', fontSize: '13px' }}>Service Interruption</h4>
                                    <p style={{ fontSize: '12px', color: 'var(--bs-text-muted)', marginTop: '4px' }}>{aiError}</p>
                                    <button onClick={() => generateAIReport(false)} style={{ marginTop: '12px', fontSize: '10px', fontWeight: 700, color: 'var(--bs-danger)', backgroundColor: 'rgba(239,68,68,0.1)', border: 'none', padding: '4px 12px', borderRadius: '999px', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                        RETRY CONNECTION
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : aiReport ? (
                        <div style={{ backgroundColor: 'var(--bs-surface)', border: '1px solid rgba(14,165,233,0.2)', borderRadius: '10px', padding: '32px', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: '16px', right: '16px', display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '999px', backgroundColor: isCached ? 'var(--bs-background)' : 'rgba(14,165,233,0.1)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: isCached ? 'var(--bs-text-muted)' : 'var(--bs-brand)' }}>
                                {isCached ? <Clock size={10} /> : <Sparkles size={10} />}
                                {isCached ? 'Cached Result' : 'Local AI Live'}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', zIndex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '3px', height: '20px', backgroundColor: 'var(--bs-brand)', borderRadius: '99px' }} />
                                    <h4 style={{ fontWeight: 700, color: 'var(--bs-text-primary)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Production Intelligence Synthesis</h4>
                                </div>
                                <div style={{ fontSize: '13px', color: 'var(--bs-text-secondary)', lineHeight: 1.7, fontWeight: 500, whiteSpace: 'pre-wrap' }}>{aiReport}</div>
                                <div style={{ paddingTop: '20px', borderTop: '1px solid var(--bs-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div>
                                        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--bs-text-muted)', textTransform: 'uppercase' }}>Analysis Scope</div>
                                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--bs-text-secondary)', marginTop: '2px' }}>{filters.stage || 'All Stages'} • {filters.dateRange.start ? `${filters.dateRange.start} to ${filters.dateRange.end}` : 'Full History'}</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', backgroundColor: 'var(--bs-background)', borderRadius: '8px' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--bs-success)' }} />
                                        <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--bs-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Read-Only Verified</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ backgroundColor: 'var(--bs-surface)', border: '1.5px dashed var(--bs-border)', borderRadius: '10px', padding: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                            <div style={{ width: '56px', height: '56px', borderRadius: '14px', backgroundColor: 'var(--bs-background)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                                <Sparkles size={28} style={{ color: 'var(--bs-border)' }} />
                            </div>
                            <h4 style={{ fontWeight: 700, color: 'var(--bs-text-secondary)' }}>Ready for Analysis</h4>
                            <p style={{ fontSize: '12px', color: 'var(--bs-text-muted)', maxWidth: '280px', marginTop: '8px' }}>Configure filters above and click generate to synthesize internal production intelligence.</p>
                        </div>
                    )}
                </section>
            </div>
        </DashboardLayout>
    );
};

export default ReportsPage;
