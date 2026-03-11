import React from 'react';
import DashboardLayout from '@frontend/layouts/DashboardLayout';
import PageHeader from '@frontend/components/ui/PageHeader';
import { Settings, ShieldCheck, Lock, Bell } from 'lucide-react';

const ToggleRow = ({ label, sub, enabled, disabled: isDisabled }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: isDisabled ? 0.5 : 1 }}>
        <div>
            <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--bs-text-primary)' }}>{label}</p>
            <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--bs-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{sub}</p>
        </div>
        <div style={{ width: '40px', height: '22px', backgroundColor: enabled ? 'rgba(34,197,94,0.2)' : 'var(--bs-border)', borderRadius: '999px', display: 'flex', alignItems: 'center', padding: '2px' }}>
            <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: enabled ? 'var(--bs-success)' : 'var(--bs-text-muted)', marginLeft: enabled ? 'auto' : '0', transition: 'all 0.2s' }} />
        </div>
    </div>
);

const SettingsPage = () => {
    return (
        <DashboardLayout>
            <div className="space-y-6">
                <PageHeader title="System Configuration" subtitle="Manage platform settings and security policies" />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <section style={{ backgroundColor: 'var(--bs-surface)', border: '1px solid var(--bs-border)', borderRadius: '10px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--bs-border)', paddingBottom: '16px' }}>
                            <ShieldCheck size={18} style={{ color: 'var(--bs-success)' }} />
                            <h3 style={{ fontWeight: 700, color: 'var(--bs-text-primary)' }}>Governance & Security</h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <ToggleRow label="Two-Factor Authentication" sub="Mandatory for all Admin personnel" enabled />
                            <ToggleRow label="IP Restriction Layer" sub="Managed via Lock Layer v2" enabled={false} disabled />
                        </div>
                    </section>

                    <section style={{ backgroundColor: 'var(--bs-surface)', border: '1px solid var(--bs-border)', borderRadius: '10px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--bs-border)', paddingBottom: '16px' }}>
                            <Bell size={18} style={{ color: 'var(--bs-warning)' }} />
                            <h3 style={{ fontWeight: 700, color: 'var(--bs-text-primary)' }}>Global Notifications</h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <ToggleRow label="Defect Spike Alerts" sub="Notify if > 5% in 1 hour" enabled />
                            <ToggleRow label="Machine Downtime Alerts" sub="Real-time floor alerts" enabled />
                        </div>
                    </section>
                </div>

                <section style={{ backgroundColor: 'var(--bs-surface)', border: '1.5px dashed var(--bs-border)', borderRadius: '10px', padding: '48px', textAlign: 'center' }}>
                    <Lock size={40} style={{ margin: '0 auto 16px', color: 'var(--bs-border)' }} />
                    <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--bs-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Technical system parameters are derived from the production environment variables.</p>
                </section>
            </div>
        </DashboardLayout>
    );
};

export default SettingsPage;
