import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { getAllUsers, addUser, updateUser, deleteUser, toggleUserActive, ROLES } from '../utils/userAuth';

const RoleBadge = ({ role }) => {
    const r = ROLES[role] || { label: role, color: '#94a3b8' };
    return (
        <span style={{
            display: 'inline-block',
            padding: '2px 10px',
            borderRadius: '999px',
            fontSize: '12px',
            fontWeight: 700,
            backgroundColor: r.color + '22',
            color: r.color,
            border: `1px solid ${r.color}55`
        }}>
            {r.label}
        </span>
    );
};

const emptyForm = { username: '', password_plain: '', full_name: '', role: 'kasir', branch_id: '' };

export default function UserManagement() {
    const { branches, currentUser } = useAppContext();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        const data = await getAllUsers();
        setUsers(data);
        setLoading(false);
    }, []);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const openAdd = () => {
        setEditingUser(null);
        setForm(emptyForm);
        setError('');
        setShowModal(true);
    };

    const openEdit = (user) => {
        setEditingUser(user);
        setForm({
            username: user.username,
            password_plain: '',
            full_name: user.full_name,
            role: user.role,
            branch_id: user.branch_id || ''
        });
        setError('');
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        let result;
        if (editingUser) {
            const updates = { full_name: form.full_name, role: form.role, branch_id: form.branch_id || null };
            if (form.password_plain) updates.password_plain = form.password_plain;
            result = await updateUser(editingUser.id, updates);
        } else {
            if (!form.username || !form.password_plain || !form.full_name) {
                setError('Semua field wajib diisi.');
                setSaving(false);
                return;
            }
            result = await addUser({ ...form, branch_id: form.branch_id || null });
        }

        setSaving(false);
        if (result.success) {
            setShowModal(false);
            fetchUsers();
        } else {
            setError(result.error || 'Gagal menyimpan. Coba lagi.');
        }
    };

    const handleDelete = async (user) => {
        if (user.role === 'superadmin' && user.username === currentUser?.username) {
            alert('Tidak dapat menghapus akun yang sedang aktif digunakan.');
            return;
        }
        if (!confirm(`Yakin ingin menghapus user "${user.full_name}"?`)) return;
        await deleteUser(user.id);
        fetchUsers();
    };

    const handleToggle = async (user) => {
        await toggleUserActive(user.id, !user.is_active);
        fetchUsers();
    };

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
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>👥 Manajemen Pengguna & Role</h3>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                        Kelola akun pengguna dan hak akses sistem
                    </p>
                </div>
                <button
                    onClick={openAdd}
                    style={{
                        padding: '10px 20px',
                        background: 'var(--gradient-primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 600,
                        fontSize: '14px',
                        cursor: 'pointer'
                    }}
                >
                    + Tambah User
                </button>
            </div>

            {/* Role Legend */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
                {Object.entries(ROLES).map(([key, r]) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                        <RoleBadge role={key} />
                        <span>{r.description}</span>
                    </div>
                ))}
            </div>

            {/* User Table */}
            {loading ? (
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
                            {users.map((user, idx) => (
                                <tr key={user.id} style={{ borderBottom: '1px solid var(--color-border)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                                    <td style={{ padding: '14px', fontWeight: 600 }}>{user.full_name}</td>
                                    <td style={{ padding: '14px', color: 'var(--color-text-secondary)', fontSize: '13px', fontFamily: 'monospace' }}>@{user.username}</td>
                                    <td style={{ padding: '14px' }}><RoleBadge role={user.role} /></td>
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
                                            <button onClick={() => openEdit(user)} style={{ padding: '6px 12px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Edit</button>
                                            <button onClick={() => handleToggle(user)} style={{ padding: '6px 12px', background: user.is_active ? '#f59e0b22' : '#10b98122', color: user.is_active ? '#f59e0b' : '#10b981', border: `1px solid ${user.is_active ? '#f59e0b55' : '#10b98155'}`, borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                                                {user.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                            </button>
                                            {user.role !== 'superadmin' && (
                                                <button onClick={() => handleDelete(user)} style={{ padding: '6px 12px', background: '#ef444422', color: '#ef4444', border: '1px solid #ef444455', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Hapus</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {users.length === 0 && <p style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>Belum ada pengguna.</p>}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
                    <div style={{ background: 'var(--color-surface)', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '480px', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-xl)', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3 style={{ margin: '0 0 24px', fontSize: '18px', fontWeight: 700 }}>
                            {editingUser ? `✏️ Edit User: ${editingUser.full_name}` : '➕ Tambah User Baru'}
                        </h3>

                        {error && <div style={{ background: '#ef444422', color: '#ef4444', border: '1px solid #ef444455', borderRadius: '8px', padding: '10px 14px', marginBottom: '20px', fontSize: '14px' }}>{error}</div>}

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                            <div>
                                <label style={labelStyle}>Nama Lengkap *</label>
                                <input style={inputStyle} value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Nama lengkap pengguna" required />
                            </div>
                            {!editingUser && (
                                <div>
                                    <label style={labelStyle}>Username *</label>
                                    <input style={inputStyle} value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="Username (unik, tanpa spasi)" required />
                                </div>
                            )}
                            <div>
                                <label style={labelStyle}>{editingUser ? 'Password Baru (kosongkan jika tidak diganti)' : 'Password *'}</label>
                                <input type="password" style={inputStyle} value={form.password_plain} onChange={e => setForm({ ...form, password_plain: e.target.value })} placeholder="Masukkan password" required={!editingUser} />
                            </div>
                            <div>
                                <label style={labelStyle}>Role *</label>
                                <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                                    {Object.entries(ROLES).map(([key, r]) => (
                                        <option key={key} value={key}>{r.label} — {r.description}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Akses Cabang</label>
                                <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.branch_id} onChange={e => setForm({ ...form, branch_id: e.target.value })}>
                                    <option value="">Semua Cabang</option>
                                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                <button type="submit" disabled={saving} style={{ flex: 1, padding: '12px', background: 'var(--gradient-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '15px', cursor: saving ? 'not-allowed' : 'pointer' }}>
                                    {saving ? 'Menyimpan...' : (editingUser ? 'Simpan Perubahan' : 'Tambah User')}
                                </button>
                                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', background: 'transparent', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)', borderRadius: '8px', fontWeight: 600, fontSize: '15px', cursor: 'pointer' }}>
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
