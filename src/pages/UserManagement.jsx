import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { getAllUsers, addUser, updateUser, deleteUser, toggleUserActive, addRole, updateRole, deleteRole } from '../utils/userAuth';

/**
 * Role Hierarchy — higher number = higher privilege level.
 * A user can only manage roles/users STRICTLY BELOW their own level.
 * superadmin=100 > superuser=90 > admin=50 > manager=30 > staff=10 > custom=5
 * Any unknown role defaults to level 5 (lowest).
 */
const ROLE_HIERARCHY = {
    superadmin: 100,
    superuser: 90,
    admin: 50,
    manager: 30,
    staff: 10,
};

const getRoleLevel = (roleName) => ROLE_HIERARCHY[roleName] ?? 5;

// Can the acting user manage (edit/delete/create) this target role name?
const canManageRole = (actorRoleName, targetRoleName) =>
    getRoleLevel(actorRoleName) > getRoleLevel(targetRoleName);

// Can the acting user see/manage this target user?
const canManageUser = (actorRoleName, targetRoleName) =>
    getRoleLevel(actorRoleName) > getRoleLevel(targetRoleName);

const PERMISSION_MODULES = [
    {
        id: 'analytics',
        label: '📊 Dashboard & Analitik',
        description: 'Halaman utama analitik, grafik pendapatan, perbandingan cabang',
        actions: ['view']
    },
    {
        id: 'services',
        label: '💆 Layanan & Terapis',
        description: 'Kelola paket layanan SPA dan data master terapis (foto, insentif, biaya transport)',
        actions: ['view', 'create', 'edit', 'delete']
    },
    {
        id: 'scheduling',
        label: '📅 Jadwal & Booking',
        description: 'Lihat jadwal, buat booking, mulai/selesai layanan, cetak struk, on/off duty terapis',
        actions: ['view', 'create', 'edit', 'delete']
    },
    {
        id: 'customers',
        label: '👤 Database Pelanggan',
        description: 'Lihat & cari daftar pelanggan, tambah/edit profil, hapus data pelanggan',
        actions: ['view', 'create', 'edit', 'delete']
    },
    {
        id: 'recap',
        label: '📈 Rekap & Pendapatan Terapis',
        description: 'Rekap harian cabang, laporan pendapatan terapis (harian/mingguan/bulanan), cetak slip gaji',
        actions: ['view', 'create', 'edit', 'delete']
    },
    {
        id: 'finance',
        label: '💳 Pembukuan & Keuangan',
        description: 'Lihat catatan keuangan, tambah pengeluaran, konfirmasi rekap terapis (lunas), hapus transaksi & Approval Center',
        actions: ['view', 'create', 'edit', 'delete']
    },
    {
        id: 'inventory',
        label: '📦 Inventori Barang',
        description: 'Kelola stok barang, bahan, dan peralatan SPA',
        actions: ['view', 'create', 'edit', 'delete']
    },
    {
        id: 'roster',
        label: '📝 Roster & Shift Massal',
        description: 'Atur jadwal kerja terapis harian, jadwalkan shift mingguan/bulanan secara massal',
        actions: ['manage']
    },
    {
        id: 'settings',
        label: '⚙️ Pengaturan Cabang & Logo',
        description: 'Kelola data cabang, logo perusahaan, pengaturan sistem',
        actions: ['manage']
    },
    {
        id: 'users',
        label: '👥 Manajemen Pengguna & Role',
        description: 'Tambah/edit/hapus user, kelola role dan matriks hak akses',
        actions: ['manage']
    }
];


const RoleBadge = ({ roleName, rolesList }) => {
    const role = rolesList.find(r => r.name === roleName) || { label: roleName, color: '#94a3b8' };
    return (
        <span style={{
            display: 'inline-block',
            padding: '2px 10px',
            borderRadius: '999px',
            fontSize: '12px',
            fontWeight: 700,
            backgroundColor: role.color + '22',
            color: role.color,
            border: `1px solid ${role.color}55`
        }}>
            {role.label}
        </span>
    );
};

const emptyUserForm = { username: '', password_plain: '', full_name: '', role: '', branch_id: '' };
const emptyRoleForm = { name: '', label: '', description: '', color: '#94a3b8', permissions: [] };

export default function UserManagement() {
    const { branches, currentUser, roles, fetchRoles, systemSettings } = useAppContext();
    const [activeTab, setActiveTab] = useState('users'); // 'users' or 'roles'
    
    // User State
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [showUserModal, setShowUserModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [userForm, setUserForm] = useState(emptyUserForm);

    // Role State
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [editingRole, setEditingRole] = useState(null);
    const [roleForm, setRoleForm] = useState(emptyRoleForm);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const fetchUsers = useCallback(async () => {
        setLoadingUsers(true);
        const data = await getAllUsers();
        setUsers(data);
        setLoadingUsers(false);
    }, []);

    useEffect(() => { 
        fetchUsers(); 
        if (roles.length === 0) fetchRoles();
    }, [fetchUsers]);

    // Derived states for visibility control
    // Only show users/roles that are STRICTLY BELOW current user's level
    const myLevel = getRoleLevel(currentUser?.role);

    const displayUsers = (users || []).filter(user =>
        canManageUser(currentUser?.role, user.role)
    );

    const displayRoles = (roles || []).filter(role =>
        canManageRole(currentUser?.role, role.name)
    );

    // Roles the current user is allowed to assign to other users (strictly below their level)
    const assignableRoles = displayRoles;

    // --- User Handlers ---
    const openAddUser = () => {
        const isSuperAdmin = currentUser?.role === 'superadmin' || currentUser?.role === 'superuser';
        if (!isSuperAdmin) {
            const maxUsers = systemSettings?.roleLimits?.[currentUser?.role]?.maxUsers ?? systemSettings?.maxUsers ?? 20;
            if (maxUsers > 0 && (users || []).length >= maxUsers) {
                alert(`Maksimal user yang dapat Anda buat adalah ${maxUsers}. Hubungi Super Admin untuk menambah kuota.`);
                return;
            }
        }
        setEditingUser(null);
        setUserForm({ ...emptyUserForm, role: assignableRoles.length > 0 ? assignableRoles[0].name : '' });
        setError('');
        setShowUserModal(true);
    };

    const openEditUser = (user) => {
        setEditingUser(user);
        setUserForm({
            username: user.username,
            password_plain: '',
            full_name: user.full_name,
            role: user.role,
            branch_id: user.branch_id || ''
        });
        setError('');
        setShowUserModal(true);
    };

    const handleUserSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        let result;
        if (editingUser) {
            const updates = { full_name: userForm.full_name, role: userForm.role, branch_id: userForm.branch_id || null };
            if (userForm.password_plain) updates.password_plain = userForm.password_plain;
            result = await updateUser(editingUser.id, updates);
        } else {
            if (!userForm.username || !userForm.password_plain || !userForm.full_name) {
                setError('Semua field wajib diisi.');
                setSaving(false);
                return;
            }
            result = await addUser({ ...userForm, branch_id: userForm.branch_id || null });
        }

        setSaving(false);
        if (result.success) {
            setShowUserModal(false);
            fetchUsers();
        } else {
            setError(result.error || 'Gagal menyimpan user. Coba lagi.');
        }
    };

    const handleDeleteUser = async (user) => {
        // Cannot delete self
        if (user.username === currentUser?.username) {
            setError('Tidak dapat menghapus akun yang sedang aktif digunakan.');
            return;
        }
        // Cannot delete user at same or higher level
        if (!canManageUser(currentUser?.role, user.role)) {
            setError('Anda tidak memiliki izin untuk menghapus pengguna dengan level akses ini.');
            return;
        }
        if (!window.confirm(`Yakin ingin menghapus user "${user.full_name}"?`)) return;
        await deleteUser(user.id);
        fetchUsers();
    };

    const handleToggleUser = async (user) => {
        // Cannot toggle self or higher-level users
        if (user.username === currentUser?.username) {
            setError('Tidak dapat menonaktifkan akun yang sedang digunakan.');
            return;
        }
        if (!canManageUser(currentUser?.role, user.role)) {
            setError('Anda tidak memiliki izin untuk mengubah status pengguna dengan level akses ini.');
            return;
        }
        await toggleUserActive(user.id, !user.is_active);
        fetchUsers();
    };

    // --- Role Handlers ---
    const openAddRole = () => {
        setEditingRole(null);
        setRoleForm(emptyRoleForm);
        setError('');
        setShowRoleModal(true);
    };

    const openEditRole = (role) => {
        // Block editing roles at same or higher level
        if (!canManageRole(currentUser?.role, role.name)) {
            setError(`Role "${role.label}" berada di level yang sama atau lebih tinggi dari akun Anda. Tidak dapat diedit.`);
            return;
        }
        setEditingRole(role);
        setRoleForm({
            name: role.name,
            label: role.label,
            description: role.description || '',
            color: role.color,
            permissions: role.permissions || []
        });
        setError('');
        setShowRoleModal(true);
    };

    const handleRoleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        let result;
        if (editingRole) {
            const updates = { 
                label: roleForm.label, 
                description: roleForm.description, 
                color: roleForm.color, 
                permissions: roleForm.permissions 
            };
            if (editingRole.name !== 'superadmin') {
                updates.name = roleForm.name;
            }
            result = await updateRole(editingRole.id, updates);
        } else {
            if (!roleForm.name || !roleForm.label) {
                setError('ID Role dan Label wajib diisi.');
                setSaving(false);
                return;
            }
            result = await addRole(roleForm);
        }

        setSaving(false);
        if (result.success) {
            setShowRoleModal(false);
            fetchRoles(); // Refresh global roles
        } else {
            setError(result.error || 'Gagal menyimpan role. Coba lagi.');
        }
    };

    const handleDeleteRole = async (role) => {
        // Block deleting roles at same or higher level
        if (!canManageRole(currentUser?.role, role.name)) {
            setError(`Role "${role.label}" berada di level yang sama atau lebih tinggi dari akun Anda. Tidak dapat dihapus.`);
            return;
        }
        // Check if role is used
        if (users.some(u => u.role === role.name)) {
            setError('Role ini masih digunakan oleh pengguna aktif. Ubah role pengguna terkait terlebih dahulu.');
            return;
        }
        if (!window.confirm(`Yakin ingin menghapus role "${role.label}"?`)) return;
        await deleteRole(role.id);
        fetchRoles();
    };

    const togglePermission = (permId) => {
        setRoleForm(prev => {
            const has = prev.permissions.includes(permId);
            if (has) return { ...prev, permissions: prev.permissions.filter(p => p !== permId) };
            return { ...prev, permissions: [...prev.permissions, permId] };
        });
    };

    // --- UI Styles ---
    const inputStyle = {
        width: '100%',
        padding: '10px 14px',
        borderRadius: '8px',
        border: '1px solid var(--color-border)',
        background: 'var(--color-bg-secondary)',
        color: 'var(--color-text-primary)',
        fontSize: '14px',
        fontFamily: 'var(--font-primary)',
        outline: 'none',
    };
    const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)' };

    return (
        <div>
            {/* Header & Tabs */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>👥 Manajemen Pengguna & Role</h3>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                        Kelola akun pengguna dan hak akses sistem secara terperinci
                    </p>
                </div>
                <div style={{ display: 'flex', background: 'var(--color-bg-secondary)', borderRadius: '8px', padding: '4px' }}>
                    <button
                        onClick={() => setActiveTab('users')}
                        style={{
                            padding: '8px 16px',
                            background: activeTab === 'users' ? 'var(--color-primary)' : 'transparent',
                            color: activeTab === 'users' ? 'white' : 'var(--color-text-secondary)',
                            border: 'none',
                            borderRadius: '6px',
                            fontWeight: 600,
                            fontSize: '13px',
                            cursor: 'pointer'
                        }}
                    >
                        👤 Pengguna
                    </button>
                    <button
                        onClick={() => setActiveTab('roles')}
                        style={{
                            padding: '8px 16px',
                            background: activeTab === 'roles' ? 'var(--color-primary)' : 'transparent',
                            color: activeTab === 'roles' ? 'white' : 'var(--color-text-secondary)',
                            border: 'none',
                            borderRadius: '6px',
                            fontWeight: 600,
                            fontSize: '13px',
                            cursor: 'pointer'
                        }}
                    >
                        🛡️ Roles & Hak Akses
                    </button>
                </div>
            </div>

            {/* TAB: PENGGUNA */}
            {activeTab === 'users' && (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            {displayRoles.map(r => (
                                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                                    <RoleBadge roleName={r.name} rolesList={roles} />
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={openAddUser}
                            style={{
                                padding: '10px 20px', background: 'var(--gradient-primary)', color: 'white',
                                border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer'
                            }}
                        >
                            + Tambah User
                        </button>
                    </div>

                    {loadingUsers ? (
                        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '40px' }}>Memuat data pengguna...</p>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                                        {['Nama Lengkap', 'Username', 'Role', 'Cabang Akses', 'Status', 'Aksi'].map(h => (
                                            <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayUsers.map((user, idx) => (
                                        <tr key={user.id} style={{ borderBottom: '1px solid var(--color-border)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                                            <td style={{ padding: '14px', fontWeight: 600 }}>{user.full_name}</td>
                                            <td style={{ padding: '14px', color: 'var(--color-text-secondary)', fontSize: '13px', fontFamily: 'monospace' }}>@{user.username}</td>
                                            <td style={{ padding: '14px' }}><RoleBadge roleName={user.role} rolesList={roles} /></td>
                                            <td style={{ padding: '14px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                                                {user.branch_id ? branches.find(b => b.id === user.branch_id)?.name || user.branch_id : <span style={{ color: 'var(--color-text-muted)' }}>Semua Cabang</span>}
                                            </td>
                                            <td style={{ padding: '14px' }}>
                                                <span style={{
                                                    display: 'inline-block', padding: '2px 10px', borderRadius: '999px',
                                                    fontSize: '12px', fontWeight: 600,
                                                    backgroundColor: user.is_active ? '#10b98122' : '#ef444422',
                                                    color: user.is_active ? '#10b981' : '#ef4444',
                                                    border: `1px solid ${user.is_active ? '#10b98155' : '#ef444455'}`
                                                }}>
                                                    {user.is_active ? 'Aktif' : 'Nonaktif'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '14px' }}>
                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                    <button onClick={() => openEditUser(user)} style={{ padding: '6px 12px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Edit</button>
                                                    <button onClick={() => handleToggleUser(user)} style={{ padding: '6px 12px', background: user.is_active ? '#f59e0b22' : '#10b98122', color: user.is_active ? '#f59e0b' : '#10b981', border: `1px solid ${user.is_active ? '#f59e0b55' : '#10b98155'}`, borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                                                        {user.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                                    </button>
                                                    {user.role !== 'superadmin' && (
                                                        <button onClick={() => handleDeleteUser(user)} style={{ padding: '6px 12px', background: '#ef444422', color: '#ef4444', border: '1px solid #ef444455', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Hapus</button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {displayUsers.length === 0 && <p style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>Belum ada pengguna.</p>}
                        </div>
                    )}
                </>
            )}

            {/* TAB: ROLES */}
            {activeTab === 'roles' && (
                <>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                        <button
                            onClick={openAddRole}
                            style={{
                                padding: '10px 20px', background: 'var(--gradient-primary)', color: 'white',
                                border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer'
                            }}
                        >
                            + Tambah Role Baru
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                        {displayRoles.map(role => (
                            <div key={role.id} style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                    <RoleBadge roleName={role.name} rolesList={roles} />
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={() => openEditRole(role)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '14px' }}>✏️</button>
                                        {role.name !== 'superadmin' && (
                                            <button onClick={() => handleDeleteRole(role)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '14px' }}>🗑️</button>
                                        )}
                                    </div>
                                </div>
                                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '16px', minHeight: '38px' }}>
                                    {role.description || 'Tidak ada deskripsi.'}
                                </div>
                                <div>
                                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>Hak Akses ({role.permissions?.length || 0} permission):</div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                        {(role.permissions || []).slice(0, 10).map(permId => {
                                            // Find human readable label
                                            const [action, ...modParts] = permId.split('_');
                                            const modId = modParts.join('_');
                                            const mod = PERMISSION_MODULES.find(m => m.id === modId);
                                            const actionLabel = { view: '👁', create: '➕', edit: '✏️', delete: '🗑️', manage: '🔑' }[action] || action;
                                            const modLabel = mod ? mod.label.replace(/[\u{1F000}-\u{1FFFF}]|[\u2600-\u27BF]/gu, '').trim() : modId;
                                            return (
                                                <span key={permId} style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', padding: '2px 7px', borderRadius: '5px', fontSize: '10px', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                                                    {actionLabel} {modLabel}
                                                </span>
                                            );
                                        })}
                                        {(role.permissions || []).length > 10 && <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', alignSelf: 'center', fontWeight: 600 }}>+{role.permissions.length - 10} lagi</span>}
                                        {(!role.permissions || role.permissions.length === 0) && <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Tidak ada akses terdaftar.</span>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* MODAL USER */}
            {showUserModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
                    <div style={{ background: 'var(--color-surface)', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '480px', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-xl)', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3 style={{ margin: '0 0 24px', fontSize: '18px', fontWeight: 700 }}>
                            {editingUser ? `✏️ Edit User: ${editingUser.full_name}` : '➕ Tambah User Baru'}
                        </h3>
                        {error && <div style={{ background: '#ef444422', color: '#ef4444', border: '1px solid #ef444455', borderRadius: '8px', padding: '10px 14px', marginBottom: '20px', fontSize: '14px' }}>{error}</div>}

                        <form onSubmit={handleUserSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                            <div>
                                <label style={labelStyle}>Nama Lengkap *</label>
                                <input style={inputStyle} value={userForm.full_name} onChange={e => setUserForm({ ...userForm, full_name: e.target.value })} placeholder="Nama lengkap pengguna" required />
                            </div>
                            {!editingUser && (
                                <div>
                                    <label style={labelStyle}>Username *</label>
                                    <input style={inputStyle} value={userForm.username} onChange={e => setUserForm({ ...userForm, username: e.target.value })} placeholder="Username (unik, tanpa spasi)" required />
                                </div>
                            )}
                            <div>
                                <label style={labelStyle}>{editingUser ? 'Password Baru (kosongkan jika tidak diganti)' : 'Password *'}</label>
                                <input type="password" style={inputStyle} value={userForm.password_plain} onChange={e => setUserForm({ ...userForm, password_plain: e.target.value })} placeholder="Masukkan password" required={!editingUser} />
                            </div>
                            <div>
                                <label style={labelStyle}>Role *</label>
                                <select style={{ ...inputStyle, cursor: 'pointer' }} value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })} required>
                                    <option value="" disabled>Pilih Role...</option>
                                    {assignableRoles.map(r => (
                                        <option key={r.id} value={r.name}>{r.label} (Level {getRoleLevel(r.name)})</option>
                                    ))}
                                </select>
                                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                                    Hanya role dengan level di bawah akun Anda yang dapat dipilih.
                                </div>
                            </div>
                            <div>
                                <label style={labelStyle}>Akses Cabang</label>
                                <select style={{ ...inputStyle, cursor: 'pointer' }} value={userForm.branch_id} onChange={e => setUserForm({ ...userForm, branch_id: e.target.value })}>
                                    <option value="">Semua Cabang</option>
                                    {(branches || []).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                <button type="submit" disabled={saving} style={{ flex: 1, padding: '12px', background: 'var(--gradient-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '15px', cursor: saving ? 'not-allowed' : 'pointer' }}>
                                    {saving ? 'Menyimpan...' : (editingUser ? 'Simpan Perubahan' : 'Tambah User')}
                                </button>
                                <button type="button" onClick={() => setShowUserModal(false)} style={{ flex: 1, padding: '12px', background: 'transparent', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)', borderRadius: '8px', fontWeight: 600, fontSize: '15px', cursor: 'pointer' }}>
                                    Batal
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL ROLE */}
            {showRoleModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
                    <div style={{ background: 'var(--color-surface)', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '700px', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-xl)', maxHeight: '95vh', overflowY: 'auto' }}>
                        <h3 style={{ margin: '0 0 24px', fontSize: '18px', fontWeight: 700 }}>
                            {editingRole ? `✏️ Edit Role: ${editingRole.label}` : '➕ Tambah Role Baru'}
                        </h3>
                        {error && <div style={{ background: '#ef444422', color: '#ef4444', border: '1px solid #ef444455', borderRadius: '8px', padding: '10px 14px', marginBottom: '20px', fontSize: '14px' }}>{error}</div>}

                        <form onSubmit={handleRoleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: '200px' }}>
                                    <label style={labelStyle}>Label Role *</label>
                                    <input style={inputStyle} value={roleForm.label} onChange={e => setRoleForm({ ...roleForm, label: e.target.value })} placeholder="Contoh: Admin Gudang" required />
                                </div>
                                {!editingRole && (
                                    <div style={{ flex: 1, minWidth: '200px' }}>
                                        <label style={labelStyle}>ID Role (Unik) *</label>
                                        <input style={inputStyle} value={roleForm.name} onChange={e => setRoleForm({ ...roleForm, name: e.target.value })} placeholder="Contoh: admin_gudang" required />
                                    </div>
                                )}
                                <div style={{ width: '80px' }}>
                                    <label style={labelStyle}>Warna</label>
                                    <input type="color" style={{ ...inputStyle, padding: '4px', height: '40px', cursor: 'pointer' }} value={roleForm.color} onChange={e => setRoleForm({ ...roleForm, color: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label style={labelStyle}>Deskripsi</label>
                                <input style={inputStyle} value={roleForm.description} onChange={e => setRoleForm({ ...roleForm, description: e.target.value })} placeholder="Deskripsi singkat tentang role ini" />
                            </div>
                            
                            <div>
                                <label style={labelStyle}>Pilih Hak Akses (Permissions Matrix)</label>
                                <div style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: '8px', overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '2px solid var(--color-border)', background: 'var(--color-bg-secondary)' }}>
                                                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, minWidth: '200px' }}>Modul / Menu</th>
                                                <th style={{ padding: '10px', textAlign: 'center', fontWeight: 700, width: '90px' }}>👁 Lihat</th>
                                                <th style={{ padding: '10px', textAlign: 'center', fontWeight: 700, width: '90px' }}>➕ Tambah</th>
                                                <th style={{ padding: '10px', textAlign: 'center', fontWeight: 700, width: '90px' }}>✏️ Ubah</th>
                                                <th style={{ padding: '10px', textAlign: 'center', fontWeight: 700, width: '90px' }}>🗑️ Hapus</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {PERMISSION_MODULES.map((mod, idx) => {
                                                const isManageOnly = mod.actions.includes('manage') && mod.actions.length === 1;
                                                const managePermId = `manage_${mod.id}`;
                                                return (
                                                    <tr key={mod.id} style={{
                                                        borderBottom: idx < PERMISSION_MODULES.length - 1 ? '1px solid var(--color-border)' : 'none',
                                                        background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'
                                                    }}>
                                                        <td style={{ padding: '10px 14px' }}>
                                                            <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '13px' }}>{mod.label}</div>
                                                            {mod.description && (
                                                                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px', lineHeight: 1.4 }}>{mod.description}</div>
                                                            )}
                                                        </td>
                                                        {isManageOnly ? (
                                                            <td colSpan={4} style={{ padding: '10px', textAlign: 'center' }}>
                                                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '6px 14px', borderRadius: '6px', background: roleForm.permissions.includes(managePermId) ? 'rgba(var(--color-primary-rgb, 99,102,241),0.15)' : 'transparent', border: `1px solid ${roleForm.permissions.includes(managePermId) ? 'var(--color-primary)' : 'var(--color-border)'}`, transition: 'all 0.2s' }}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={roleForm.permissions.includes(managePermId)}
                                                                        onChange={() => togglePermission(managePermId)}
                                                                        style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                                                                    />
                                                                    <span style={{ fontWeight: 600, fontSize: '12px' }}>Akses Penuh</span>
                                                                </label>
                                                            </td>
                                                        ) : (
                                                            ['view', 'create', 'edit', 'delete'].map(action => {
                                                                const permId = `${action}_${mod.id}`;
                                                                const isSupported = mod.actions.includes(action);
                                                                const isChecked = roleForm.permissions.includes(permId);
                                                                return (
                                                                    <td key={permId} style={{ padding: '10px', textAlign: 'center' }}>
                                                                        {isSupported ? (
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={isChecked}
                                                                                onChange={() => togglePermission(permId)}
                                                                                style={{ width: '17px', height: '17px', accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                                                                            />
                                                                        ) : (
                                                                            <span style={{ color: 'var(--color-border)', fontSize: '16px' }}>—</span>
                                                                        )}
                                                                    </td>
                                                                );
                                                            })
                                                        )}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                                <button type="submit" disabled={saving} style={{ flex: 1, padding: '12px', background: 'var(--gradient-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '15px', cursor: saving ? 'not-allowed' : 'pointer' }}>
                                    {saving ? 'Menyimpan...' : (editingRole ? 'Simpan Perubahan' : 'Tambah Role')}
                                </button>
                                <button type="button" onClick={() => setShowRoleModal(false)} style={{ flex: 1, padding: '12px', background: 'transparent', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)', borderRadius: '8px', fontWeight: 600, fontSize: '15px', cursor: 'pointer' }}>
                                    Batal
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
