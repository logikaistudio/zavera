import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';

const EMPTY_FORM = { name: '', phone: '', address: '', notes: '' };

export default function Customers() {
    const { customers, addCustomer, updateCustomer, deleteCustomer, hasPermission } = useAppContext();

    const [searchQuery, setSearchQuery] = useState('');

    // --- Edit / Add Modal ---
    const [modalMode, setModalMode] = useState(null); // 'add' | 'edit'
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [formError, setFormError] = useState('');

    // --- Delete Confirm Modal ---
    const [deleteTarget, setDeleteTarget] = useState(null); // single customer object or null

    // --- Multi-delete ---
    const [isMultiSelect, setIsMultiSelect] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

    // --- Toast notification ---
    const [toast, setToast] = useState(null);
    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    // ---- Filtered list ----
    const filteredCustomers = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return customers || [];
        return (customers || []).filter(c =>
            (c.name || '').toLowerCase().includes(query) ||
            (c.phone || '').toLowerCase().includes(query) ||
            (c.address || '').toLowerCase().includes(query) ||
            (c.notes || '').toLowerCase().includes(query)
        );
    }, [customers, searchQuery]);

    // ---- Handlers: Add ----
    const handleOpenAdd = () => {
        setFormData(EMPTY_FORM);
        setFormError('');
        setEditingCustomer(null);
        setModalMode('add');
    };

    // ---- Handlers: Edit ----
    const handleOpenEdit = (customer) => {
        setEditingCustomer(customer);
        setFormData({
            name: customer.name || '',
            phone: customer.phone || '',
            address: customer.address || '',
            notes: customer.notes || ''
        });
        setFormError('');
        setModalMode('edit');
    };

    const handleCloseModal = () => {
        setModalMode(null);
        setEditingCustomer(null);
        setFormData(EMPTY_FORM);
        setFormError('');
    };

    const handleSave = (e) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            setFormError('Nama pelanggan tidak boleh kosong.');
            return;
        }
        if (modalMode === 'edit' && editingCustomer) {
            updateCustomer(editingCustomer.id, {
                name: formData.name.trim(),
                phone: formData.phone.trim(),
                address: formData.address.trim(),
                notes: formData.notes.trim()
            });
            showToast('Data pelanggan berhasil diperbarui.');
        } else {
            addCustomer({
                name: formData.name.trim(),
                phone: formData.phone.trim(),
                address: formData.address.trim(),
                notes: formData.notes.trim()
            });
            showToast('Pelanggan baru berhasil ditambahkan.');
        }
        handleCloseModal();
    };

    // ---- Handlers: Single Delete ----
    const handleDeleteClick = (customer) => {
        setDeleteTarget(customer);
    };

    const handleConfirmDelete = () => {
        if (!deleteTarget) return;
        deleteCustomer(deleteTarget.id);
        setDeleteTarget(null);
        showToast('Data pelanggan berhasil dihapus.');
    };

    // ---- Handlers: Multi-select ----
    const toggleSelect = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredCustomers.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredCustomers.map(c => c.id));
        }
    };

    const handleCancelMultiSelect = () => {
        setIsMultiSelect(false);
        setSelectedIds([]);
    };

    const handleBulkDelete = () => {
        if (selectedIds.length === 0) return;
        setShowBulkDeleteModal(true);
    };

    const handleConfirmBulkDelete = () => {
        selectedIds.forEach(id => deleteCustomer(id));
        showToast(`${selectedIds.length} pelanggan berhasil dihapus.`);
        setSelectedIds([]);
        setIsMultiSelect(false);
        setShowBulkDeleteModal(false);
    };

    const canDelete = hasPermission('delete_customers');

    return (
        <div className="container" style={{ padding: 'var(--spacing-lg) var(--spacing-md)', position: 'relative' }}>

            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed', top: '80px', right: '20px', zIndex: 9999,
                    background: toast.type === 'success' ? '#10b981' : '#ef4444',
                    color: '#fff', padding: '12px 20px', borderRadius: '10px',
                    fontWeight: 600, fontSize: '0.9rem', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    animation: 'fadeIn 0.3s ease'
                }}>
                    {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
                </div>
            )}

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: 'var(--spacing-lg)' }}>
                <div>
                    <h2 className="heading-2" style={{ marginBottom: 'var(--spacing-xs)' }}>
                        Database Pelanggan
                    </h2>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                        {(customers || []).length} pelanggan terdaftar • Data tersinkron otomatis dari booking
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {canDelete && (customers || []).length > 0 && (
                        <Button
                            variant={isMultiSelect ? 'danger' : 'outline'}
                            size="sm"
                            onClick={() => {
                                if (isMultiSelect) { handleCancelMultiSelect(); }
                                else { setIsMultiSelect(true); setSelectedIds([]); }
                            }}
                        >
                            {isMultiSelect ? '✕ Nonaktifkan Multi-Hapus' : '☑ Mode Multi-Hapus'}
                        </Button>
                    )}
                    <Button variant="primary" onClick={handleOpenAdd}>
                        + Tambah Pelanggan
                    </Button>
                </div>
            </div>

            {/* Search bar */}
            <Card glass className="mb-lg">
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }}>🔍</span>
                        <input
                            type="text"
                            placeholder="Cari nama, telepon, alamat, atau catatan..."
                            className="input"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ paddingLeft: '36px', width: '100%' }}
                        />
                    </div>
                    {searchQuery && (
                        <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>Reset</Button>
                    )}
                </div>
            </Card>

            {/* Multi-select header */}
            {isMultiSelect && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px',
                    padding: '10px 16px', background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px',
                    flexWrap: 'wrap'
                }}>
                    <input
                        type="checkbox"
                        checked={selectedIds.length === filteredCustomers.length && filteredCustomers.length > 0}
                        onChange={toggleSelectAll}
                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#ef4444' }}
                        title="Pilih semua"
                    />
                    <span style={{ color: 'var(--color-text-primary)', fontWeight: 600, fontSize: '0.9rem' }}>
                        {selectedIds.length === 0 ? 'Pilih pelanggan yang akan dihapus' : `${selectedIds.length} dipilih`}
                    </span>
                    {selectedIds.length > 0 && (
                        <>
                            <Button size="sm" variant="danger" onClick={handleBulkDelete}>
                                🗑️ Hapus {selectedIds.length} Terpilih
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setSelectedIds([])}>
                                Batal Pilih
                            </Button>
                        </>
                    )}
                </div>
            )}

            {/* Table */}
            <Card glass style={{ padding: 0, overflow: 'hidden' }}>
                {filteredCustomers.length === 0 ? (
                    <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                        <div style={{ fontSize: '3.5rem', marginBottom: '12px' }}>👥</div>
                        <h4 style={{ marginBottom: '8px' }}>
                            {searchQuery ? 'Tidak ada pelanggan yang cocok' : 'Belum ada data pelanggan'}
                        </h4>
                        <p style={{ fontSize: '0.85rem', marginBottom: '16px' }}>
                            {searchQuery
                                ? 'Coba kata kunci lain atau reset pencarian.'
                                : 'Klik "+ Tambah Pelanggan" atau tambahkan booking baru — data pelanggan akan otomatis tersimpan.'}
                        </p>
                        {!searchQuery && (
                            <Button variant="primary" onClick={handleOpenAdd}>+ Tambah Pelanggan</Button>
                        )}
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.03)' }}>
                                    {isMultiSelect && (
                                        <th style={{ padding: '14px 16px', width: '40px' }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.length === filteredCustomers.length && filteredCustomers.length > 0}
                                                onChange={toggleSelectAll}
                                                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#ef4444' }}
                                            />
                                        </th>
                                    )}
                                    <th style={{ padding: '14px 16px', fontWeight: 600, fontSize: '0.82rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nama</th>
                                    <th style={{ padding: '14px 16px', fontWeight: 600, fontSize: '0.82rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>No. Telepon</th>
                                    <th style={{ padding: '14px 16px', fontWeight: 600, fontSize: '0.82rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Alamat</th>
                                    <th style={{ padding: '14px 16px', fontWeight: 600, fontSize: '0.82rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Catatan Riwayat</th>
                                    <th style={{ padding: '14px 16px', fontWeight: 600, fontSize: '0.82rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', minWidth: '160px' }}>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCustomers.map((c, idx) => {
                                    const isSelected = selectedIds.includes(c.id);
                                    return (
                                        <tr
                                            key={c.id}
                                            onClick={() => isMultiSelect && toggleSelect(c.id)}
                                            style={{
                                                borderBottom: idx < filteredCustomers.length - 1 ? '1px solid var(--color-border)' : 'none',
                                                transition: 'background 0.15s',
                                                background: isSelected ? 'rgba(239,68,68,0.06)' : 'transparent',
                                                cursor: isMultiSelect ? 'pointer' : 'default'
                                            }}
                                            className="hover-row"
                                        >
                                            {isMultiSelect && (
                                                <td style={{ padding: '14px 16px' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleSelect(c.id)}
                                                        onClick={e => e.stopPropagation()}
                                                        style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#ef4444' }}
                                                    />
                                                </td>
                                            )}
                                            <td style={{ padding: '14px 16px' }}>
                                                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>{c.name}</div>
                                                {c.createdAt && (
                                                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>
                                                        Sejak {new Date(c.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: '14px 16px', fontSize: '0.85rem' }}>
                                                {c.phone
                                                    ? <a href={`tel:${c.phone}`} onClick={e => e.stopPropagation()} style={{ color: 'var(--color-primary-light)', textDecoration: 'none', fontWeight: 600 }}>📞 {c.phone}</a>
                                                    : <span style={{ color: 'var(--color-text-tertiary)' }}>-</span>
                                                }
                                            </td>
                                            <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--color-text-secondary)', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={c.address}>
                                                {c.address || <span style={{ color: 'var(--color-text-tertiary)' }}>-</span>}
                                            </td>
                                            <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--color-text-secondary)', maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={c.notes}>
                                                {c.notes || <span style={{ color: 'var(--color-text-tertiary)' }}>-</span>}
                                            </td>
                                            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                                {!isMultiSelect && (
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                                        <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); handleOpenEdit(c); }}>
                                                            ✏️ Edit
                                                        </Button>
                                                        {canDelete && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={(e) => { e.stopPropagation(); handleDeleteClick(c); }}
                                                                style={{ borderColor: '#ef4444', color: '#ef4444' }}
                                                            >
                                                                🗑️ Hapus
                                                            </Button>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Floating bulk action bar */}
            {isMultiSelect && selectedIds.length > 0 && (
                <div style={{
                    position: 'fixed',
                    bottom: 'calc(var(--bottom-nav-height, 64px) + 16px)',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 500,
                    background: 'rgba(15, 23, 42, 0.92)',
                    backdropFilter: 'blur(14px)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    borderRadius: '14px',
                    padding: '12px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
                }}>
                    <span style={{ color: '#f8fafc', fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                        {selectedIds.length} Pelanggan dipilih
                    </span>
                    <Button variant="danger" size="sm" onClick={handleBulkDelete}>
                        🗑️ Hapus Terpilih
                    </Button>
                    <Button variant="secondary" size="sm" onClick={handleCancelMultiSelect}>
                        Batal
                    </Button>
                </div>
            )}

            {/* Modal: Add / Edit Customer */}
            <Modal
                isOpen={modalMode === 'add' || modalMode === 'edit'}
                onClose={handleCloseModal}
                title={modalMode === 'add' ? '➕ Tambah Pelanggan Baru' : '✏️ Edit Profil Pelanggan'}
            >
                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {formError && (
                        <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#ef4444', fontSize: '0.85rem' }}>
                            ⚠️ {formError}
                        </div>
                    )}
                    <div>
                        <label className="label">Nama Pelanggan *</label>
                        <input
                            type="text"
                            className="input"
                            value={formData.name}
                            onChange={(e) => { setFormData({ ...formData, name: e.target.value }); setFormError(''); }}
                            required
                            placeholder="Nama Lengkap"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="label">No. Telepon / HP</label>
                        <input
                            type="text"
                            className="input"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="Contoh: 08123456789"
                        />
                    </div>
                    <div>
                        <label className="label">Alamat Lengkap</label>
                        <textarea
                            className="input"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            rows="3"
                            placeholder="Alamat Pelanggan"
                        />
                    </div>
                    <div>
                        <label className="label">Catatan Tambahan</label>
                        <textarea
                            className="input"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            rows="3"
                            placeholder="Catatan keluhan, alergi, atau preferensi lainnya"
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                        <Button variant="secondary" type="button" onClick={handleCloseModal}>Batal</Button>
                        <Button variant="primary" type="submit">
                            {modalMode === 'add' ? '✅ Tambah Pelanggan' : '✅ Simpan Perubahan'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Modal: Confirm Single Delete */}
            <Modal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                title="⚠️ Konfirmasi Hapus Pelanggan"
            >
                <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🗑️</div>
                    <p style={{ marginBottom: '8px', fontSize: '0.95rem' }}>
                        Yakin ingin menghapus data pelanggan:
                    </p>
                    <p style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-text-primary)', marginBottom: '12px' }}>
                        "{deleteTarget?.name}"?
                    </p>
                    <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
                        Tindakan ini tidak akan menghapus riwayat booking pelanggan tersebut.
                    </p>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                        <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Batal</Button>
                        <Button variant="danger" onClick={handleConfirmDelete}>Ya, Hapus</Button>
                    </div>
                </div>
            </Modal>

            {/* Modal: Confirm Bulk Delete */}
            <Modal
                isOpen={showBulkDeleteModal}
                onClose={() => setShowBulkDeleteModal(false)}
                title="⚠️ Konfirmasi Hapus Massal"
            >
                <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🗑️</div>
                    <p style={{ marginBottom: '8px', fontSize: '0.95rem' }}>
                        Yakin ingin menghapus <strong>{selectedIds.length} pelanggan</strong> yang dipilih?
                    </p>
                    <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
                        Riwayat booking mereka tidak akan terhapus.
                    </p>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                        <Button variant="secondary" onClick={() => setShowBulkDeleteModal(false)}>Batal</Button>
                        <Button variant="danger" onClick={handleConfirmBulkDelete}>Ya, Hapus {selectedIds.length} Pelanggan</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
