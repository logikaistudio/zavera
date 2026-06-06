import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import { formatCurrency, formatDuration } from '../utils/formatters';

export default function Services() {
    const { services, addService, updateService, deleteService, hasPermission } = useAppContext();
    const [showModal, setShowModal] = useState(false);
    const [editingService, setEditingService] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        category: 'Massage',
        durationMinutes: 60,
        price: 0,
        description: ''
    });

    const categories = ['Massage', 'Facial', 'Body Treatment', 'Therapy', 'Package'];

    const handleSubmit = (e) => {
        e.preventDefault();

        if (editingService) {
            updateService(editingService.id, formData);
        } else {
            addService(formData);
        }

        resetForm();
    };

    const handleEdit = (service) => {
        setEditingService(service);
        setFormData({
            name: service.name,
            category: service.category,
            durationMinutes: service.durationMinutes,
            price: service.price,
            description: service.description
        });
        setShowModal(true);
    };

    const handleDelete = (id) => {
        if (confirm('Yakin ingin menghapus layanan ini?')) {
            deleteService(id);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            category: 'Massage',
            durationMinutes: 60,
            price: 0,
            description: ''
        });
        setEditingService(null);
        setShowModal(false);
    };

    // Group services by category
    const groupedServices = services.reduce((acc, service) => {
        if (!acc[service.category]) {
            acc[service.category] = [];
        }
        acc[service.category].push(service);
        return acc;
    }, {});

    return (
        <div className="container" style={{ padding: 'var(--spacing-lg) var(--spacing-md)' }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-lg">
                <div>
                    <h2 className="heading-2" style={{ marginBottom: 'var(--spacing-xs)' }}>
                        Manajemen Layanan
                    </h2>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                        Kelola jenis layanan spa dan harga
                    </p>
                </div>
                {hasPermission('create_services') && (
                    <Button onClick={() => setShowModal(true)}>
                        + Tambah Layanan
                    </Button>
                )}
            </div>

            {/* Services by Category */}
            <div className="grid gap-lg">
                {Object.entries(groupedServices).map(([category, categoryServices]) => (
                    <Card key={category} glass>
                        <h3 className="heading-3 mb-md flex items-center gap-md">
                            <span>{category === 'Massage' ? '💆' : category === 'Facial' ? '✨' : category === 'Body Treatment' ? '🌿' : category === 'Therapy' ? '🧘' : '📦'}</span>
                            {category}
                            <Badge variant="primary">{categoryServices.length}</Badge>
                        </h3>

                        <div className="grid gap-md">
                            {categoryServices.map(service => (
                                <div
                                    key={service.id}
                                    className="card"
                                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
                                >
                                    <div style={{ flex: 1 }}>
                                        <h4 style={{
                                            fontSize: 'var(--font-size-lg)',
                                            fontWeight: 600,
                                            marginBottom: 'var(--spacing-xs)',
                                            color: 'var(--color-text-primary)'
                                        }}>
                                            {service.name}
                                        </h4>
                                        {service.description && (
                                            <p style={{
                                                fontSize: 'var(--font-size-sm)',
                                                color: 'var(--color-text-muted)',
                                                marginBottom: 'var(--spacing-sm)'
                                            }}>
                                                {service.description}
                                            </p>
                                        )}
                                        <div className="flex gap-md" style={{ fontSize: 'var(--font-size-sm)' }}>
                                            <span>⏱️ {formatDuration(service.durationMinutes)}</span>
                                            <span style={{ fontWeight: 700, color: 'var(--color-primary-light)' }}>
                                                {formatCurrency(service.price)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex gap-sm">
                                        {hasPermission('edit_services') && (
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => handleEdit(service)}
                                            >
                                                Edit
                                            </Button>
                                        )}
                                        {hasPermission('delete_services') && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleDelete(service.id)}
                                            >
                                                Hapus
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                ))}
            </div>

            {/* Add/Edit Modal */}
            <Modal
                isOpen={showModal}
                onClose={resetForm}
                title={editingService ? 'Edit Layanan' : 'Tambah Layanan Baru'}
            >
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-md">
                        <div>
                            <label className="label">Nama Layanan *</label>
                            <input
                                type="text"
                                className="input"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                placeholder="e.g. Traditional Balinese Massage"
                            />
                        </div>

                        <div>
                            <label className="label">Kategori *</label>
                            <select
                                className="select"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                required
                            >
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-md">
                            <div>
                                <label className="label">Durasi (menit) *</label>
                                <input
                                    type="number"
                                    className="input"
                                    value={formData.durationMinutes}
                                    onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) || 0 })}
                                    required
                                    min="15"
                                    step="15"
                                    placeholder="60"
                                />
                            </div>

                            <div>
                                <label className="label">Harga (IDR) *</label>
                                <input
                                    type="number"
                                    className="input"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                                    required
                                    min="0"
                                    step="10000"
                                    placeholder="350000"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="label">Deskripsi</label>
                            <textarea
                                className="input"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows="3"
                                placeholder="Deskripsi layanan..."
                                style={{ resize: 'vertical' }}
                            />
                        </div>

                        <div className="flex gap-md justify-end">
                            <Button type="button" variant="secondary" onClick={resetForm}>
                                Batal
                            </Button>
                            <Button type="submit" variant="success">
                                {editingService ? 'Simpan Perubahan' : 'Tambah Layanan'}
                            </Button>
                        </div>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
