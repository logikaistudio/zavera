import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { getAllUsers } from '../utils/userAuth';

// ─── Role hierarchy (mirrored from UserManagement) ───────────────────────────
const ROLE_HIERARCHY = {
    superadmin: 100, superuser: 90, admin: 50, manager: 30, staff: 10
};
const getRoleLevel = (n) => ROLE_HIERARCHY[n] ?? 5;

// Roles that can RECEIVE limits (everything below superadmin/superuser)
const LIMITABLE_ROLE_LEVELS = Object.entries(ROLE_HIERARCHY)
    .filter(([, lvl]) => lvl < 90)
    .map(([name]) => name);

// ─── Stat card ────────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, sub, color = '#6366f1' }) => (
    <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${color}33`,
        borderRadius: '14px',
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        flex: 1,
        minWidth: '160px'
    }}>
        <div style={{
            width: 48, height: 48, borderRadius: '12px',
            background: `${color}22`, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0
        }}>{icon}</div>
        <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-primary)', marginTop: '2px' }}>{label}</div>
            {sub && <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>{sub}</div>}
        </div>
    </div>
);

// ─── Inline number input with +/- controls ────────────────────────────────────
const LimitInput = ({ value, onChange, min = 0, max = 999 }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button
            type="button"
            onClick={() => onChange(Math.max(min, value - 1))}
            style={{ width: 32, height: 32, borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', fontSize: '1.1rem', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >−</button>
        <input
            type="number"
            value={value}
            min={min}
            max={max}
            onChange={e => onChange(Math.max(min, Math.min(max, parseInt(e.target.value) || 0)))}
            style={{
                width: '64px', textAlign: 'center', padding: '6px', borderRadius: '8px',
                border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)', fontSize: '14px', fontWeight: 700,
                fontFamily: 'var(--font-primary)'
            }}
        />
        <button
            type="button"
            onClick={() => onChange(Math.min(max, value + 1))}
            style={{ width: 32, height: 32, borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', fontSize: '1.1rem', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >+</button>
    </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SuperAdminPanel() {
    const { branches, therapists, roles, systemSettings, updateSystemSettings, currentUser } = useAppContext();

    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(true);

    // Local copy of settings so changes are batched before saving
    const [localSettings, setLocalSettings] = useState(systemSettings || {});
    const [saved, setSaved] = useState(false);
    const [activeTab, setActiveTab] = useState('overview'); // overview | limits | system

    // Only superadmin/superuser may access this page
    const isSuperAdmin = currentUser?.role === 'superadmin' || currentUser?.role === 'superuser';

    const fetchUsers = useCallback(async () => {
        setLoadingUsers(true);
        const data = await getAllUsers();
        setUsers(data);
        setLoadingUsers(false);
    }, []);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    // Sync local settings when parent changes
    useEffect(() => { setLocalSettings(systemSettings || {}); }, [systemSettings]);

    if (!isSuperAdmin) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px' }}>
                <div style={{ fontSize: '4rem' }}>🔒</div>
                <h2 style={{ color: 'var(--color-text-primary)', margin: 0 }}>Akses Ditolak</h2>
                <p style={{ color: 'var(--color-text-secondary)' }}>Halaman ini hanya dapat diakses oleh Super Admin.</p>
            </div>
        );
    }

    // ── Derived stats ──────────────────────────────────────────────────────────
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.is_active).length;
    const adminUsers = users.filter(u => getRoleLevel(u.role) >= 50 && u.role !== 'superadmin' && u.role !== 'superuser').length;
    const totalBranches = branches.length;
    const totalTherapists = therapists.length;
    const totalRoles = roles.length;

    // ── Role limits helpers ────────────────────────────────────────────────────
    // Per-role limits stored as systemSettings.roleLimits = { [roleName]: { maxBranches, maxUsers, maxTherapists } }
    const roleLimits = localSettings.roleLimits || {};

    const getRoleLimit = (roleName, key, defaultVal) =>
        roleLimits[roleName]?.[key] ?? localSettings[key] ?? defaultVal;

    const setRoleLimit = (roleName, key, value) => {
        setLocalSettings(prev => ({
            ...prev,
            roleLimits: {
                ...prev.roleLimits,
                [roleName]: {
                    ...(prev.roleLimits?.[roleName] || {}),
                    [key]: value
                }
            }
        }));
    };

    const setGlobal = (key, value) => {
        setLocalSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = () => {
        updateSystemSettings(localSettings);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    // ── Role-specific rows from both registered DB roles + hardcoded hierarchy ──
    const limitableRoles = [
        ...roles.filter(r => getRoleLevel(r.name) < 90),
        // Add any hardcoded roles not yet in DB
        ...LIMITABLE_ROLE_LEVELS
            .filter(name => !roles.some(r => r.name === name))
            .map(name => ({ name, label: name.charAt(0).toUpperCase() + name.slice(1), color: '#94a3b8' }))
    ].sort((a, b) => getRoleLevel(b.name) - getRoleLevel(a.name));

    // Tab style helper
    const tabStyle = (tab) => ({
        padding: '10px 20px',
        border: 'none',
        borderRadius: '8px',
        fontWeight: 600,
        fontSize: '13px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        background: activeTab === tab ? 'var(--gradient-primary)' : 'transparent',
        color: activeTab === tab ? 'white' : 'var(--color-text-secondary)',
    });

    return (
        <div style={{ padding: '24px 20px', maxWidth: '1100px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: '14px',
                        background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem'
                    }}>🛡️</div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Super Admin Panel</h2>
                        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                            Kelola batas sistem, kuota per role, dan konfigurasi global aplikasi
                        </p>
                    </div>
                </div>
                {/* Role badge */}
                <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 700,
                    background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid #f59e0b44'
                }}>
                    🔑 {currentUser?.full_name} · {currentUser?.role}
                </span>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '24px', background: 'rgba(255,255,255,0.04)', padding: '6px', borderRadius: '12px', width: 'fit-content' }}>
                <button style={tabStyle('overview')} onClick={() => setActiveTab('overview')}>📊 Ringkasan</button>
                <button style={tabStyle('limits')} onClick={() => setActiveTab('limits')}>⚙️ Batas Kuota</button>
                <button style={tabStyle('system')} onClick={() => setActiveTab('system')}>🖥️ Sistem & Profil</button>
            </div>

            {/* ── TAB: OVERVIEW ────────────────────────────────────────────────── */}
            {activeTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Stat cards */}
                    <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                        <StatCard icon="🏢" label="Total Cabang" value={totalBranches} sub={`Maks. global: ${localSettings.maxBranches ?? 6}`} color="#6366f1" />
                        <StatCard icon="👤" label="Total User" value={totalUsers} sub={`${activeUsers} aktif · ${totalUsers - activeUsers} nonaktif`} color="#10b981" />
                        <StatCard icon="💆" label="Total Terapis" value={totalTherapists} sub={`Maks. global: ${localSettings.maxTherapists ?? 50}`} color="#f59e0b" />
                        <StatCard icon="🛡️" label="Total Role" value={totalRoles} sub="Terdaftar di sistem" color="#8b5cf6" />
                    </div>

                    {/* User breakdown by role */}
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '24px' }}>
                        <h3 style={{ margin: '0 0 18px', fontSize: '15px', fontWeight: 700 }}>👥 Distribusi Pengguna per Role</h3>
                        {loadingUsers ? (
                            <p style={{ color: 'var(--color-text-muted)' }}>Memuat...</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {[...new Set(users.map(u => u.role))].sort((a, b) => getRoleLevel(b) - getRoleLevel(a)).map(roleName => {
                                    const count = users.filter(u => u.role === roleName).length;
                                    const role = roles.find(r => r.name === roleName);
                                    const color = role?.color || '#94a3b8';
                                    const level = getRoleLevel(roleName);
                                    return (
                                        <div key={roleName} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                            <div style={{ width: '120px', flexShrink: 0 }}>
                                                <span style={{
                                                    display: 'inline-block', padding: '2px 10px', borderRadius: '999px',
                                                    fontSize: '11px', fontWeight: 700,
                                                    background: color + '22', color, border: `1px solid ${color}55`
                                                }}>{role?.label || roleName}</span>
                                            </div>
                                            <div style={{ flex: 1, height: '8px', background: 'var(--color-bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${Math.min(100, (count / Math.max(totalUsers, 1)) * 100)}%`, background: color, borderRadius: '4px', transition: 'width 0.5s ease' }} />
                                            </div>
                                            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)', minWidth: '28px', textAlign: 'right' }}>{count}</span>
                                            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', minWidth: '52px' }}>Lv. {level}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Limit snapshot */}
                    <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '16px', padding: '24px' }}>
                        <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 700 }}>⚠️ Batas Kuota Global (Aktif)</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                            {[
                                { key: 'maxBranches', label: 'Maks. Cabang', icon: '🏢', default: 6 },
                                { key: 'maxTherapists', label: 'Maks. Terapis', icon: '💆', default: 50 },
                                { key: 'maxUsers', label: 'Maks. User', icon: '👤', default: 20 },
                            ].map(item => (
                                <div key={item.key} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '1.4rem' }}>{item.icon}</span>
                                    <div>
                                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f59e0b' }}>{localSettings[item.key] ?? item.default}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{item.label}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <p style={{ margin: '14px 0 0', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                            Ubah kuota di tab <strong>Batas Kuota</strong>. Batas per-role menimpa batas global jika disetel.
                        </p>
                    </div>
                </div>
            )}

            {/* ── TAB: LIMITS ─────────────────────────────────────────────────── */}
            {activeTab === 'limits' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Global limits */}
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '24px' }}>
                        <h3 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700 }}>🌐 Batas Global (Fallback)</h3>
                        <p style={{ margin: '0 0 20px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                            Berlaku untuk semua role yang tidak memiliki pengaturan khusus di bawah ini.
                        </p>
                        <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
                            {[
                                { key: 'maxBranches', label: 'Maks. Cabang yang dapat dibuat', icon: '🏢', default: 6 },
                                { key: 'maxUsers', label: 'Maks. User yang dapat dicreate', icon: '👤', default: 20 },
                                { key: 'maxTherapists', label: 'Maks. Terapis yang dapat ditambah', icon: '💆', default: 50 },
                            ].map(item => (
                                <div key={item.key}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                                        {item.icon} {item.label}
                                    </label>
                                    <LimitInput
                                        value={localSettings[item.key] ?? item.default}
                                        onChange={val => setGlobal(item.key, val)}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Per-role limits table */}
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '24px' }}>
                        <h3 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700 }}>🎯 Batas Kuota Per Role</h3>
                        <p style={{ margin: '0 0 20px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                            Atur kuota khusus per role. Nilai <strong>0</strong> = tidak dibatasi (gunakan batas global). Pengaturan ini menimpa batas global jika lebih kecil dari 0 tidak berlaku.
                        </p>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid var(--color-border)', background: 'rgba(255,255,255,0.03)' }}>
                                        <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, width: '180px' }}>Role</th>
                                        <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>Level</th>
                                        <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700 }}>🏢 Maks. Cabang</th>
                                        <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700 }}>👤 Maks. User</th>
                                        <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700 }}>💆 Maks. Terapis</th>
                                        <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700 }}>Reset</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {limitableRoles.map((role, idx) => {
                                        const color = role.color || '#94a3b8';
                                        const hasCustom = !!roleLimits[role.name];
                                        return (
                                            <tr key={role.name} style={{
                                                borderBottom: idx < limitableRoles.length - 1 ? '1px solid var(--color-border)' : 'none',
                                                background: hasCustom ? 'rgba(99,102,241,0.04)' : 'transparent'
                                            }}>
                                                <td style={{ padding: '14px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{
                                                            display: 'inline-block', padding: '2px 10px', borderRadius: '999px',
                                                            fontSize: '11px', fontWeight: 700,
                                                            background: color + '22', color, border: `1px solid ${color}55`
                                                        }}>{role.label}</span>
                                                        {hasCustom && <span style={{ fontSize: '10px', color: '#6366f1', fontWeight: 700 }}>● Kustom</span>}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '14px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                                                    {getRoleLevel(role.name)}
                                                </td>
                                                <td style={{ padding: '14px', textAlign: 'center' }}>
                                                    <LimitInput
                                                        value={roleLimits[role.name]?.maxBranches ?? 0}
                                                        onChange={val => setRoleLimit(role.name, 'maxBranches', val)}
                                                    />
                                                    <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                                                        {roleLimits[role.name]?.maxBranches ? '' : `Default: ${localSettings.maxBranches ?? 6}`}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '14px', textAlign: 'center' }}>
                                                    <LimitInput
                                                        value={roleLimits[role.name]?.maxUsers ?? 0}
                                                        onChange={val => setRoleLimit(role.name, 'maxUsers', val)}
                                                    />
                                                    <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                                                        {roleLimits[role.name]?.maxUsers ? '' : `Default: ${localSettings.maxUsers ?? 20}`}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '14px', textAlign: 'center' }}>
                                                    <LimitInput
                                                        value={roleLimits[role.name]?.maxTherapists ?? 0}
                                                        onChange={val => setRoleLimit(role.name, 'maxTherapists', val)}
                                                    />
                                                    <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                                                        {roleLimits[role.name]?.maxTherapists ? '' : `Default: ${localSettings.maxTherapists ?? 50}`}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '14px', textAlign: 'center' }}>
                                                    {hasCustom && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setLocalSettings(prev => {
                                                                    const next = { ...prev, roleLimits: { ...prev.roleLimits } };
                                                                    delete next.roleLimits[role.name];
                                                                    return next;
                                                                });
                                                            }}
                                                            style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                                                        >
                                                            Reset
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(99,102,241,0.08)', borderRadius: '10px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                            💡 <strong>Cara kerja:</strong> Saat role Admin membuat Cabang baru, sistem memeriksa apakah jumlah cabang saat ini sudah mencapai batas Role Admin. Jika belum dikonfigurasi, batas global yang berlaku. Nilai <strong>0</strong> = ikut batas global.
                        </div>
                    </div>

                    {/* Save button */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <button
                            onClick={handleSave}
                            style={{
                                padding: '12px 32px', borderRadius: '10px', border: 'none',
                                background: saved ? '#10b981' : 'var(--gradient-primary)',
                                color: 'white', fontWeight: 700, fontSize: '15px', cursor: 'pointer',
                                transition: 'all 0.3s', display: 'flex', alignItems: 'center', gap: '8px'
                            }}
                        >
                            {saved ? '✅ Tersimpan!' : '💾 Simpan Semua Pengaturan'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setLocalSettings(systemSettings || {})}
                            style={{ padding: '12px 20px', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-primary)', fontWeight: 600, cursor: 'pointer' }}
                        >
                            Reset Perubahan
                        </button>
                        {saved && <span style={{ fontSize: '13px', color: '#10b981', fontWeight: 600 }}>Pengaturan berhasil disimpan dan langsung berlaku.</span>}
                    </div>
                </div>
            )}

            {/* ── TAB: SYSTEM ─────────────────────────────────────────────────── */}
            {activeTab === 'system' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '640px' }}>
                    {/* Company info */}
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '24px' }}>
                        <h3 style={{ margin: '0 0 18px', fontSize: '15px', fontWeight: 700 }}>🏢 Identitas Perusahaan</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Nama Perusahaan</label>
                                <input
                                    type="text"
                                    value={localSettings.companyName || ''}
                                    onChange={e => setGlobal('companyName', e.target.value)}
                                    placeholder="Contoh: PT Zavera Indonesia"
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', fontSize: '14px', fontFamily: 'var(--font-primary)' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Alamat Perusahaan (Pusat)</label>
                                <textarea
                                    value={localSettings.companyAddress || ''}
                                    onChange={e => setGlobal('companyAddress', e.target.value)}
                                    placeholder="Alamat lengkap perusahaan"
                                    rows="3"
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', fontSize: '14px', fontFamily: 'var(--font-primary)', resize: 'vertical' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>No. Telepon / WhatsApp Perusahaan</label>
                                <input
                                    type="text"
                                    value={localSettings.companyPhone || ''}
                                    onChange={e => setGlobal('companyPhone', e.target.value)}
                                    placeholder="Contoh: +6281234567890"
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', fontSize: '14px', fontFamily: 'var(--font-primary)' }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* App info */}
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '24px' }}>
                        <h3 style={{ margin: '0 0 18px', fontSize: '15px', fontWeight: 700 }}>🔧 Batas Default Sistem</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {[
                                { key: 'maxBranches', label: 'Maksimal Cabang (Global)', default: 6 },
                                { key: 'maxTherapists', label: 'Maksimal Terapis (Global)', default: 50 },
                                { key: 'maxUsers', label: 'Maksimal User (Global)', default: 20 },
                            ].map(item => (
                                <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>{item.label}</label>
                                    <LimitInput
                                        value={localSettings[item.key] ?? item.default}
                                        onChange={val => setGlobal(item.key, val)}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Save */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <button
                            onClick={handleSave}
                            style={{
                                padding: '12px 32px', borderRadius: '10px', border: 'none',
                                background: saved ? '#10b981' : 'var(--gradient-primary)',
                                color: 'white', fontWeight: 700, fontSize: '15px', cursor: 'pointer',
                                transition: 'all 0.3s'
                            }}
                        >
                            {saved ? '✅ Tersimpan!' : '💾 Simpan'}
                        </button>
                        {saved && <span style={{ fontSize: '13px', color: '#10b981', fontWeight: 600 }}>Tersimpan!</span>}
                    </div>
                </div>
            )}
        </div>
    );
}
