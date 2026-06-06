import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import ExportModal from '../components/common/ExportModal';
import { exportInventoryReport } from '../utils/exportPDF';
import { exportInventoryToExcel } from '../utils/exportExcel';
import { formatCurrency } from '../utils/formatters';

export default function Inventory() {
    const { inventory, addInventoryItem, updateInventoryItem, deleteInventoryItem, hasPermission } = useAppContext();
    const [showModal, setShowModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        category: 'Oil & Aromatherapy',
        unit: 'bottle',
        currentStock: 0,
        minStock: 0,
        pricePerUnit: 0
    });

    const categories = [
        'Oil & Aromatherapy',
        'Facial Products',
        'Body Products',
        'Equipment',
        'Linen',
        'Other'
    ];

    const units = ['bottle', 'liter', 'kg', 'gram', 'pack', 'piece', 'set', 'box'];

    const handleSubmit = (e) => {
        e.preventDefault();

        if (editingItem) {
            updateInventoryItem(editingItem.id, formData);
        } else {
            addInventoryItem(formData);
        }

        resetForm();
    };

    const handleEdit = (item) => {
        setEditingItem(item);
        setFormData({
            name: item.name,
            category: item.category,
            unit: item.unit,
            currentStock: item.currentStock,
            minStock: item.minStock,
            pricePerUnit: item.pricePerUnit
        });
        setShowModal(true);
    };

    const handleDelete = (id) => {
        if (confirm('Yakin ingin menghapus item ini?')) {
            deleteInventoryItem(id);
        }
    };

    const handleStockChange = (id, change) => {
        const item = inventory.find(i => i.id === id);
        if (item) {
            const newStock = Math.max(0, item.currentStock + change);
            updateInventoryItem(id, { currentStock: newStock });
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            category: 'Oil & Aromatherapy',
            unit: 'bottle',
            currentStock: 0,
            minStock: 0,
            pricePerUnit: 0
        });
        setEditingItem(null);
        setShowModal(false);
    };

    const getStockStatus = (item) => {
        const percentage = (item.currentStock / item.minStock) * 100;
        if (item.currentStock === 0) return { status: 'critical', label: 'Habis', variant: 'error' };
        if (percentage < 100) return { status: 'low', label: 'Stok Rendah', variant: 'warning' };
        return { status: 'normal', label: 'Normal', variant: 'success' };
    };

    // Group by category
    const groupedInventory = inventory.reduce((acc, item) => {
        if (!acc[item.category]) {
            acc[item.category] = [];
        }
        acc[item.category].push(item);
        return acc;
    }, {});

    // Get low stock count
    const lowStockCount = inventory.filter(i => i.currentStock < i.minStock).length;

    const handleExport = (options) => {
        if (options.format === 'pdf') {
            exportInventoryReport(inventory, {
                includeLowStockOnly: options.includeLowStockOnly,
                includeValues: options.includeValues
            });
        } else {
            exportInventoryToExcel(inventory, {
                includeLowStockOnly: options.includeLowStockOnly,
                includeValues: options.includeValues
            });
        }
    };

    return (
        <div className="container" style={{ padding: 'var(--spacing-lg) var(--spacing-md)' }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-lg">
                <div>
                    <h2 className="heading-2" style={{ marginBottom: 'var(--spacing-xs)' }}>
                        Manajemen Inventory
                    </h2>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                        Kelola stok produk dan perlengkapan spa
                    </p>
                </div>
                <div className="flex gap-sm">
                    <Button onClick={() => setShowExportModal(true)} variant="secondary">
                        📥 Export
                    </Button>
                    {hasPermission('create_inventory') && (
                        <Button onClick={() => setShowModal(true)}>
                            + Tambah Item
                        </Button>
                    )}
                </div>
            </div>

            {/* Alert for low stock */}
            {lowStockCount > 0 && (
                <Card className="mb-lg" style={{
                    background: 'rgba(245, 158, 11, 0.1)',
                    borderColor: 'var(--color-warning)'
                }}>
                    <div className="flex items-center gap-md">
                        <span style={{ fontSize: '2rem' }}>⚠️</span>
                        <div>
                            <strong style={{ color: 'var(--color-warning)' }}>
                                {lowStockCount} item dengan stok rendah
                            </strong>
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                                Segera lakukan restock untuk item-item tersebut
                            </p>
                        </div>
                    </div>
                </Card>
            )}

            {/* Inventory by Category */}
            <div className="grid gap-lg">
                {Object.entries(groupedInventory).map(([category, items]) => (
                    <Card key={category} glass>
                        <h3 className="heading-3 mb-md">
                            {category} <Badge variant="primary">{items.length}</Badge>
                        </h3>

                        {/* Mobile-First Card Layout */}
                        <div className="grid gap-md">
                            {items.map(item => {
                                const stockStatus = getStockStatus(item);
                                return (
                                    <div
                                        key={item.id}
                                        className="card"
                                        style={{
                                            borderLeft: `4px solid var(--color-${stockStatus.variant})`,
                                            padding: 'var(--spacing-md)'
                                        }}
                                    >
                                        {/* Item Header */}
                                        <div className="flex justify-between items-start mb-sm">
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600, fontSize: 'var(--font-size-md)', marginBottom: '4px' }}>
                                                    {item.name}
                                                </div>
                                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                                                    Unit: {item.unit}
                                                </div>
                                            </div>
                                            <Badge variant={stockStatus.variant}>
                                                {stockStatus.label}
                                            </Badge>
                                        </div>

                                        {/* Stock Info Grid */}
                                        <div className="grid grid-cols-2 gap-md mb-md" style={{
                                            padding: 'var(--spacing-sm) 0',
                                            borderTop: '1px solid var(--color-border)',
                                            borderBottom: '1px solid var(--color-border)'
                                        }}>
                                            <div>
                                                <div style={{
                                                    fontSize: 'var(--font-size-xs)',
                                                    color: 'var(--color-text-secondary)',
                                                    marginBottom: '4px'
                                                }}>
                                                    Stok Saat Ini
                                                </div>
                                                <div className="flex items-center gap-sm">
                                                    {hasPermission('edit_inventory') && (
                                                        <button
                                                            className="btn-icon btn-secondary"
                                                            style={{
                                                                width: '1.75rem',
                                                                height: '1.75rem',
                                                                fontSize: '0.875rem',
                                                                padding: 0
                                                            }}
                                                            onClick={() => handleStockChange(item.id, -1)}
                                                        >
                                                            -
                                                        </button>
                                                    )}
                                                    <span style={{
                                                        fontWeight: 700,
                                                        minWidth: '40px',
                                                        textAlign: 'center',
                                                        fontSize: 'var(--font-size-lg)'
                                                    }}>
                                                        {item.currentStock}
                                                    </span>
                                                    {hasPermission('edit_inventory') && (
                                                        <button
                                                            className="btn-icon btn-secondary"
                                                            style={{
                                                                width: '1.75rem',
                                                                height: '1.75rem',
                                                                fontSize: '0.875rem',
                                                                padding: 0
                                                            }}
                                                            onClick={() => handleStockChange(item.id, 1)}
                                                        >
                                                            +
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <div>
                                                <div style={{
                                                    fontSize: 'var(--font-size-xs)',
                                                    color: 'var(--color-text-secondary)',
                                                    marginBottom: '4px'
                                                }}>
                                                    Min. Stok
                                                </div>
                                                <div style={{
                                                    fontWeight: 600,
                                                    fontSize: 'var(--font-size-lg)',
                                                    paddingTop: '6px'
                                                }}>
                                                    {item.minStock}
                                                </div>
                                            </div>

                                            <div>
                                                <div style={{
                                                    fontSize: 'var(--font-size-xs)',
                                                    color: 'var(--color-text-secondary)',
                                                    marginBottom: '4px'
                                                }}>
                                                    Harga/Unit
                                                </div>
                                                <div style={{
                                                    fontWeight: 700,
                                                    color: 'var(--color-primary-light)',
                                                    fontSize: 'var(--font-size-md)'
                                                }}>
                                                    {formatCurrency(item.pricePerUnit)}
                                                </div>
                                            </div>

                                            <div>
                                                <div style={{
                                                    fontSize: 'var(--font-size-xs)',
                                                    color: 'var(--color-text-secondary)',
                                                    marginBottom: '4px'
                                                }}>
                                                    Total Nilai
                                                </div>
                                                <div style={{
                                                    fontWeight: 700,
                                                    color: 'var(--color-success)',
                                                    fontSize: 'var(--font-size-md)'
                                                }}>
                                                    {formatCurrency(item.currentStock * item.pricePerUnit)}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-sm">
                                            {hasPermission('edit_inventory') && (
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => handleEdit(item)}
                                                    style={{ flex: 1 }}
                                                >
                                                    ✏️ Edit
                                                </Button>
                                            )}
                                            {hasPermission('delete_inventory') && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleDelete(item.id)}
                                                    style={{ flex: 1 }}
                                                >
                                                    🗑️ Hapus
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                ))}
            </div>

            {/* Add/Edit Modal */}
            <Modal
                isOpen={showModal}
                onClose={resetForm}
                title={editingItem ? 'Edit Item' : 'Tambah Item Baru'}
            >
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-md">
                        <div>
                            <label className="label">Nama Item *</label>
                            <input
                                type="text"
                                className="input"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                placeholder="e.g. Aromatherapy Essential Oil"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-md">
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

                            <div>
                                <label className="label">Unit *</label>
                                <select
                                    className="select"
                                    value={formData.unit}
                                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                    required
                                >
                                    {units.map(unit => (
                                        <option key={unit} value={unit}>{unit}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-md">
                            <div>
                                <label className="label">Stok Saat Ini *</label>
                                <input
                                    type="number"
                                    className="input"
                                    value={formData.currentStock}
                                    onChange={(e) => setFormData({ ...formData, currentStock: parseInt(e.target.value) || 0 })}
                                    required
                                    min="0"
                                    placeholder="25"
                                />
                            </div>

                            <div>
                                <label className="label">Minimum Stok *</label>
                                <input
                                    type="number"
                                    className="input"
                                    value={formData.minStock}
                                    onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })}
                                    required
                                    min="0"
                                    placeholder="10"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="label">Harga per Unit (IDR) *</label>
                            <input
                                type="number"
                                className="input"
                                value={formData.pricePerUnit}
                                onChange={(e) => setFormData({ ...formData, pricePerUnit: parseInt(e.target.value) || 0 })}
                                required
                                min="0"
                                step="1000"
                                placeholder="150000"
                            />
                        </div>

                        <div className="flex gap-md justify-end">
                            <Button type="button" variant="secondary" onClick={resetForm}>
                                Batal
                            </Button>
                            <Button type="submit" variant="success">
                                {editingItem ? 'Simpan Perubahan' : 'Tambah Item'}
                            </Button>
                        </div>
                    </div>

                </form>
            </Modal>

            {/* Export Modal */}
            <ExportModal
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                onExport={handleExport}
                type="inventory"
            />
        </div>
    );
}
