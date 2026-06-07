import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import UserManagement from './UserManagement';
import { migrateLocalStorageToSupabase } from '../utils/storageSync';

export default function Settings() {
    const { branches, addBranch, updateBranch, deleteBranch, currentUser, systemSettings, updateSystemSettings } = useAppContext();
    const [showModal, setShowModal] = useState(false);
    const [editingBranch, setEditingBranch] = useState(null);
    const [activeTab, setActiveTab] = useState('branches'); // 'branches', 'logo', 'users'
    const [formData, setFormData] = useState({
        name: '',
        hotelPartner: '',
        location: '',
        penanggungJawab: '',
        noRekening: '',
        profitSharingPercent: 30
    });
    const [logoFile, setLogoFile] = useState(null);

    const resetForm = () => {
        setFormData({
            name: '',
            hotelPartner: '',
            location: '',
            penanggungJawab: '',
            noRekening: '',
            profitSharingPercent: 30
        });
        setEditingBranch(null);
    };

    const handleOpenModal = (branch = null) => {
        if (!branch && (branches || []).length >= (systemSettings?.maxBranches || 6)) {
            alert(`Maksimal cabang yang diizinkan adalah ${systemSettings?.maxBranches || 6}.`);
            return;
        }

        if (branch) {
            setEditingBranch(branch);
            setFormData({
                name: branch.name || '',
                hotelPartner: branch.hotelPartner || '',
                location: branch.location || '',
                penanggungJawab: branch.penanggungJawab || '',
                noRekening: branch.noRekening || '',
                profitSharingPercent: branch.profitSharingPercent || 30
            });
        } else {
            resetForm();
        }
        setShowModal(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            alert('Nama cabang tidak boleh kosong');
            return;
        }

        if (editingBranch) {
            updateBranch(editingBranch.id, formData);
        } else {
            addBranch(formData);
        }

        setShowModal(false);
        resetForm();
    };

    const handleDelete = (branchId) => {
        if (confirm('Yakin ingin menghapus cabang ini? Tindakan ini tidak dapat dibatalkan.')) {
            deleteBranch(branchId);
        }
    };

    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setLogoFile(event.target.result);
                localStorage.setItem('zavera_logo', event.target.result);
                alert('Logo berhasil diubah! Refresh halaman untuk melihat perubahan.');
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="container" style={{ padding: 'var(--spacing-lg)' }}>
            <h2 style={{ marginBottom: 'var(--spacing-lg)', fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>
                ⚙️ Pengaturan
            </h2>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)', borderBottom: '2px solid var(--color-border)' }}>
                <button
                    onClick={() => setActiveTab('branches')}
                    style={{
                        padding: 'var(--spacing-md)',
                        background: activeTab === 'branches' ? 'var(--color-primary)' : 'transparent',
                        border: 'none',
                        color: activeTab === 'branches' ? 'white' : 'var(--color-text-secondary)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        borderRadius: 'var(--radius-md) var(--radius-md) 0 0'
                    }}
                >
                    Cabang
                </button>
                <button
                    onClick={() => setActiveTab('logo')}
                    style={{
                        padding: 'var(--spacing-md)',
                        background: activeTab === 'logo' ? 'var(--color-primary)' : 'transparent',
                        border: 'none',
                        color: activeTab === 'logo' ? 'white' : 'var(--color-text-secondary)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        borderRadius: 'var(--radius-md) var(--radius-md) 0 0'
                    }}
                >
                    Logo
                </button>
                {currentUser?.role === 'superadmin' && (
                    <button
                        onClick={() => setActiveTab('users')}
                        style={{
                            padding: 'var(--spacing-md)',
                            background: activeTab === 'users' ? '#f59e0b' : 'transparent',
                            border: 'none',
                            color: activeTab === 'users' ? 'white' : 'var(--color-text-secondary)',
                            cursor: 'pointer',
                            fontWeight: 600,
                            borderRadius: 'var(--radius-md) var(--radius-md) 0 0'
                        }}
                    >
                        👥 Pengguna & Role
                    </button>
                )}
                {(currentUser?.role === 'superadmin' || currentUser?.role === 'superuser') && (
                    <button
                        onClick={() => setActiveTab('system')}
                        style={{
                            padding: 'var(--spacing-md)',
                            background: activeTab === 'system' ? 'var(--color-error)' : 'transparent',
                            border: 'none',
                            color: activeTab === 'system' ? 'white' : 'var(--color-text-secondary)',
                            cursor: 'pointer',
                            fontWeight: 600,
                            borderRadius: 'var(--radius-md) var(--radius-md) 0 0'
                        }}
                    >
                        ⚙️ Sistem
                    </button>
                )}
            </div>

            {/* Branches Tab */}
            {activeTab === 'branches' && (
                <div>
                    <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                        <Button
                            onClick={() => handleOpenModal()}
                            style={{
                                background: 'var(--gradient-success)',
                                color: 'white',
                                border: 'none',
                                padding: '0.75rem 1.5rem',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                                fontWeight: 600
                            }}
                        >
                            + Tambah Cabang Baru
                        </Button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 'var(--spacing-lg)' }}>
                        {(branches || []).map((branch) => (
                            <Card key={branch.id} style={{ padding: 'var(--spacing-lg)' }}>
                                <div style={{ marginBottom: 'var(--spacing-md)' }}>
                                    <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, margin: 0, marginBottom: 'var(--spacing-sm)' }}>
                                        {branch.name}
                                    </h3>
                                    <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                                        {branch.hotelPartner}
                                    </p>
                                </div>

                                <div style={{ marginBottom: 'var(--spacing-md)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                                    <p style={{ margin: 'var(--spacing-sm) 0' }}>📍 {branch.location}</p>
                                    {branch.penanggungJawab && <p style={{ margin: 'var(--spacing-sm) 0' }}>👤 PJ: {branch.penanggungJawab}</p>}
                                    {branch.noRekening && <p style={{ margin: 'var(--spacing-sm) 0' }}>🏦 Rekening: {branch.noRekening}</p>}
                                    <p style={{ margin: 'var(--spacing-sm) 0' }}>📊 Profit Sharing: {branch.profitSharingPercent}%</p>
                                </div>

                                <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                                    <Button
                                        onClick={() => handleOpenModal(branch)}
                                        style={{
                                            flex: 1,
                                            background: 'var(--color-primary)',
                                            color: 'white',
                                            border: 'none',
                                            padding: '0.5rem 1rem',
                                            borderRadius: 'var(--radius-md)',
                                            cursor: 'pointer',
                                            fontSize: 'var(--font-size-sm)'
                                        }}
                                    >
                                        Edit
                                    </Button>
                                    {(branches || []).length > 1 && (
                                        <Button
                                            onClick={() => handleDelete(branch.id)}
                                            style={{
                                                flex: 1,
                                                background: 'var(--color-error)',
                                                color: 'white',
                                                border: 'none',
                                                padding: '0.5rem 1rem',
                                                borderRadius: 'var(--radius-md)',
                                                cursor: 'pointer',
                                                fontSize: 'var(--font-size-sm)'
                                            }}
                                        >
                                            Hapus
                                        </Button>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Logo Tab */}
            {activeTab === 'logo' && (
                <Card style={{ padding: 'var(--spacing-2xl)', maxWidth: '600px' }}>
                    <h3 style={{ marginBottom: 'var(--spacing-lg)', fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>
                        Ganti Logo Aplikasi
                    </h3>

                    <div style={{
                        border: '2px dashed var(--color-border)',
                        borderRadius: 'var(--radius-lg)',
                        padding: 'var(--spacing-2xl)',
                        textAlign: 'center',
                        marginBottom: 'var(--spacing-lg)',
                        cursor: 'pointer'
                    }}>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            style={{ display: 'none' }}
                            id="logo-upload"
                        />
                        <label htmlFor="logo-upload" style={{ cursor: 'pointer', display: 'block' }}>
                            <div style={{ fontSize: 'var(--font-size-3xl)', marginBottom: 'var(--spacing-md)' }}>🖼️</div>
                            <p style={{ margin: 0, marginBottom: 'var(--spacing-sm)', fontWeight: 600 }}>
                                Klik atau drag & drop untuk upload logo baru
                            </p>
                            <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                                Format: PNG, JPG (Max 2MB)
                            </p>
                        </label>
                    </div>

                    <div style={{
                        padding: 'var(--spacing-lg)',
                        background: 'var(--color-bg-secondary)',
                        borderRadius: 'var(--radius-md)',
                        textAlign: 'center'
                    }}>
                        <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                            ℹ️ Logo akan muncul di header aplikasi dan sebagai favicon browser. Ukuran rekomendasi: 1000x1000px atau lebih
                        </p>
                    </div>
                </Card>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && currentUser?.role === 'superadmin' && (
                <UserManagement />
            )}

            {/* System Tab */}
            {activeTab === 'system' && (currentUser?.role === 'superadmin' || currentUser?.role === 'superuser') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
                    <Card style={{ padding: 'var(--spacing-2xl)', maxWidth: '600px' }}>
                        <h3 style={{ marginBottom: 'var(--spacing-lg)', fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>
                            Sinkronisasi Database
                        </h3>
                        <p style={{ marginBottom: 'var(--spacing-md)', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                            Jika data Anda (seperti Terapis, Inventori, atau Cabang) kosong atau tidak tersinkronisasi, Anda dapat menyinkronkan ulang data dari browser ini ke Supabase secara manual.
                        </p>
                        <Button 
                            onClick={async () => {
                                if (confirm('Peringatan: Ini akan mengunggah data lokal Anda ke Supabase. Lanjutkan?')) {
                                    try {
                                        const result = await migrateLocalStorageToSupabase();
                                        if (result.success) {
                                            alert('Berhasil! Data Anda telah tersinkronisasi ke Supabase. Halaman akan dimuat ulang.');
                                            window.location.reload();
                                        } else {
                                            alert('Gagal menyinkronisasi: ' + result.error);
                                        }
                                    } catch (err) {
                                        alert('Error: ' + err.message);
                                    }
                                }
                            }}
                            style={{ background: 'var(--color-primary)', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                        >
                            🔄 Sinkronisasikan Sekarang
                        </Button>
                    </Card>

                    <Card style={{ padding: 'var(--spacing-2xl)', maxWidth: '600px' }}>
                        <h3 style={{ marginBottom: 'var(--spacing-lg)', fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>
                            Pengaturan Batas Sistem
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: 'var(--spacing-sm)', fontWeight: 600 }}>
                                Maksimal Cabang
                            </label>
                            <input
                                type="number"
                                value={systemSettings?.maxBranches || 6}
                                onChange={(e) => updateSystemSettings({ maxBranches: parseInt(e.target.value) || 6 })}
                                style={{ width: '100%', padding: 'var(--spacing-md)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: 'var(--spacing-sm)', fontWeight: 600 }}>
                                Maksimal Terapis
                            </label>
                            <input
                                type="number"
                                value={systemSettings?.maxTherapists || 50}
                                onChange={(e) => updateSystemSettings({ maxTherapists: parseInt(e.target.value) || 50 })}
                                style={{ width: '100%', padding: 'var(--spacing-md)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
                            />
                        </div>
                    </div>
                </Card>
                </div>
            )}

            {/* Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => {
                    setShowModal(false);
                    resetForm();
                }}
                title={editingBranch ? `Edit Cabang: ${editingBranch.name}` : 'Tambah Cabang Baru'}
            >
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: 'var(--spacing-sm)', fontWeight: 600 }}>
                            Nama Cabang *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Contoh: Zavera Bali Resort"
                            style={{
                                width: '100%',
                                padding: 'var(--spacing-md)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-md)',
                                background: 'var(--color-surface)',
                                color: 'var(--color-text-primary)',
                                fontFamily: 'var(--font-primary)'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: 'var(--spacing-sm)', fontWeight: 600 }}>
                            Hotel Partner
                        </label>
                        <input
                            type="text"
                            value={formData.hotelPartner}
                            onChange={(e) => setFormData({ ...formData, hotelPartner: e.target.value })}
                            placeholder="Contoh: Bali Paradise Resort"
                            style={{
                                width: '100%',
                                padding: 'var(--spacing-md)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-md)',
                                background: 'var(--color-surface)',
                                color: 'var(--color-text-primary)',
                                fontFamily: 'var(--font-primary)'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: 'var(--spacing-sm)', fontWeight: 600 }}>
                            Alamat / Lokasi
                        </label>
                        <input
                            type="text"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            placeholder="Contoh: Nusa Dua, Bali"
                            style={{
                                width: '100%',
                                padding: 'var(--spacing-md)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-md)',
                                background: 'var(--color-surface)',
                                color: 'var(--color-text-primary)',
                                fontFamily: 'var(--font-primary)'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: 'var(--spacing-sm)', fontWeight: 600 }}>
                            Penanggung Jawab
                        </label>
                        <input
                            type="text"
                            value={formData.penanggungJawab}
                            onChange={(e) => setFormData({ ...formData, penanggungJawab: e.target.value })}
                            placeholder="Nama penanggung jawab cabang"
                            style={{
                                width: '100%',
                                padding: 'var(--spacing-md)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-md)',
                                background: 'var(--color-surface)',
                                color: 'var(--color-text-primary)',
                                fontFamily: 'var(--font-primary)'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: 'var(--spacing-sm)', fontWeight: 600 }}>
                            No. Rekening Cabang
                        </label>
                        <input
                            type="text"
                            value={formData.noRekening}
                            onChange={(e) => setFormData({ ...formData, noRekening: e.target.value })}
                            placeholder="Contoh: BCA 1234567890"
                            style={{
                                width: '100%',
                                padding: 'var(--spacing-md)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-md)',
                                background: 'var(--color-surface)',
                                color: 'var(--color-text-primary)',
                                fontFamily: 'var(--font-primary)'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: 'var(--spacing-sm)', fontWeight: 600 }}>
                            Profit Sharing (%) *
                        </label>
                        <input
                            type="number"
                            min="0"
                            max="100"
                            value={formData.profitSharingPercent}
                            onChange={(e) => setFormData({ ...formData, profitSharingPercent: parseInt(e.target.value) })}
                            style={{
                                width: '100%',
                                padding: 'var(--spacing-md)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-md)',
                                background: 'var(--color-surface)',
                                color: 'var(--color-text-primary)',
                                fontFamily: 'var(--font-primary)'
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                        <Button
                            type="submit"
                            style={{
                                flex: 1,
                                background: 'var(--gradient-primary)',
                                color: 'white',
                                border: 'none',
                                padding: 'var(--spacing-md)',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                                fontWeight: 600
                            }}
                        >
                            {editingBranch ? 'Simpan Perubahan' : 'Tambah Cabang'}
                        </Button>
                        <Button
                            type="button"
                            onClick={() => {
                                setShowModal(false);
                                resetForm();
                            }}
                            style={{
                                flex: 1,
                                background: 'var(--color-bg-secondary)',
                                color: 'var(--color-text-primary)',
                                border: '1px solid var(--color-border)',
                                padding: 'var(--spacing-md)',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                                fontWeight: 600
                            }}
                        >
                            Batal
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
