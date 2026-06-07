import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import { formatCurrency, formatDuration } from '../utils/formatters';
import { generateTherapistSlipPDF } from '../utils/exportPDF';
import { calculateTherapistIncome } from '../utils/calculations';

export default function Services() {
    const { services, addService, updateService, deleteService, therapists, addTherapist, updateTherapist, deleteTherapist, systemSettings, hasPermission, selectedBranchId, bookings, branches } = useAppContext();
    const [activeTab, setActiveTab] = useState('services'); // 'services', 'therapists'
    const [showModal, setShowModal] = useState(false);
    const [editingService, setEditingService] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        category: 'Massage',
        durationMinutes: 60,
        price: 0,
        description: '',
        therapistIncentiveType: 'default',
        therapistIncentiveValue: 0
    });

    const [showTherapistModal, setShowTherapistModal] = useState(false);
    const [editingTherapist, setEditingTherapist] = useState(null);
    const [therapistData, setTherapistData] = useState({
        name: '',
        specialization: 'Massage',
        wage: 0,
        incentiveType: 'fixed',
        incentiveValue: 0,
        bonusItems: [],
        deductionItems: [],
        whatsappNumber: '',
        photo: null
    });

    const [previewPdfUrl, setPreviewPdfUrl] = useState(null);

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
            description: service.description,
            therapistIncentiveType: service.therapistIncentiveType || 'default',
            therapistIncentiveValue: service.therapistIncentiveValue || 0
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
            description: '',
            therapistIncentiveType: 'default',
            therapistIncentiveValue: 0
        });
        setEditingService(null);
        setShowModal(false);
    };

    const branchTherapists = (therapists || []).filter(t => t.branchId === selectedBranchId || !t.branchId);

    const handleAddTherapistClick = () => {
        if (branchTherapists.length >= (systemSettings?.maxTherapists || 50)) {
            alert(`Maksimal terapis yang diizinkan adalah ${systemSettings?.maxTherapists || 50}.`);
            return;
        }
        setEditingTherapist(null);
        setTherapistData({
            name: '',
            specialization: 'Massage',
            wage: 0,
            incentiveType: 'fixed',
            incentiveValue: 0,
            bonusItems: [],
            deductionItems: [],
            whatsappNumber: '',
            photo: null
        });
        setShowTherapistModal(true);
    };

    const handleTherapistSubmit = (e) => {
        e.preventDefault();
        const dataToSave = { ...therapistData, branchId: selectedBranchId };
        if (editingTherapist) {
            updateTherapist(editingTherapist.id, dataToSave);
        } else {
            addTherapist(dataToSave);
        }
        setShowTherapistModal(false);
    };

    const handleEditTherapist = (therapist) => {
        setEditingTherapist(therapist);
        setTherapistData({
            name: therapist.name,
            specialization: therapist.specialization,
            wage: therapist.wage || 0,
            incentiveType: therapist.incentiveType || 'fixed',
            incentiveValue: therapist.incentiveValue || 0,
            bonusItems: therapist.bonusItems || [],
            deductionItems: therapist.deductionItems || [],
            whatsappNumber: therapist.whatsappNumber || '',
            photo: therapist.photo || null
        });
        setShowTherapistModal(true);
    };

    const handleDeleteTherapist = (id) => {
        if (confirm('Yakin ingin menghapus terapis ini?')) {
            deleteTherapist(id);
        }
    };

    const handleAddBonus = () => {
        setTherapistData(prev => ({
            ...prev,
            bonusItems: [...(prev.bonusItems || []), { id: Date.now(), name: '', amount: 0 }]
        }));
    };

    const handleUpdateBonus = (id, field, value) => {
        setTherapistData(prev => ({
            ...prev,
            bonusItems: prev.bonusItems.map(item => item.id === id ? { ...item, [field]: value } : item)
        }));
    };

    const handleRemoveBonus = (id) => {
        setTherapistData(prev => ({
            ...prev,
            bonusItems: prev.bonusItems.filter(item => item.id !== id)
        }));
    };

    const handleAddDeduction = () => {
        setTherapistData(prev => ({
            ...prev,
            deductionItems: [...(prev.deductionItems || []), { id: Date.now(), name: '', amount: 0 }]
        }));
    };

    const handleUpdateDeduction = (id, field, value) => {
        setTherapistData(prev => ({
            ...prev,
            deductionItems: prev.deductionItems.map(item => item.id === id ? { ...item, [field]: value } : item)
        }));
    };

    const handleRemoveDeduction = (id) => {
        setTherapistData(prev => ({
            ...prev,
            deductionItems: prev.deductionItems.filter(item => item.id !== id)
        }));
    };

    // Group services by category
    const groupedServices = (services || []).reduce((acc, service) => {
        if (!acc[service.category]) {
            acc[service.category] = [];
        }
        acc[service.category].push(service);
        return acc;
    }, {});

    const handlePhotoUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.match('image.*')) {
            alert('Format file tidak didukung. Harap unggah gambar (JPEG/PNG).');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const targetRatio = 3 / 4;
                const imgRatio = img.width / img.height;
                
                let sourceX = 0, sourceY = 0, sourceWidth = img.width, sourceHeight = img.height;
                
                if (imgRatio > targetRatio) {
                    sourceWidth = img.height * targetRatio;
                    sourceX = (img.width - sourceWidth) / 2;
                } else {
                    sourceHeight = img.width / targetRatio;
                    sourceY = (img.height - sourceHeight) / 2;
                }

                const maxWidth = 300; // 300x400 is 3:4
                const targetWidth = Math.min(maxWidth, sourceWidth);
                const targetHeight = targetWidth / targetRatio;

                const canvas = document.createElement('canvas');
                canvas.width = targetWidth;
                canvas.height = targetHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, targetWidth, targetHeight);

                const base64Photo = canvas.toDataURL('image/jpeg', 0.8);
                const sizeInBytes = Math.round((base64Photo.length * 3) / 4);
                
                if (sizeInBytes > 400 * 1024) {
                    setTherapistData(prev => ({ ...prev, photo: canvas.toDataURL('image/jpeg', 0.6) }));
                } else {
                    setTherapistData(prev => ({ ...prev, photo: base64Photo }));
                }
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    const handlePrintSlip = (therapist) => {
        const income = calculateTherapistIncome(therapist, bookings, services);
        const branch = (branches || []).find(b => b.id === therapist.branchId) || (branches && branches[0]);
        const pdfBlobUrl = generateTherapistSlipPDF(therapist, income, branch);
        setPreviewPdfUrl(pdfBlobUrl);
    };

    return (
        <div className="container" style={{ padding: 'var(--spacing-lg) var(--spacing-md)' }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-lg">
                <div>
                    <h2 className="heading-2" style={{ marginBottom: 'var(--spacing-xs)' }}>
                        Manajemen Layanan & Terapis
                    </h2>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                        Kelola jenis layanan spa, harga, dan daftar terapis
                    </p>
                </div>
                <div>
                    {hasPermission('create_services') && activeTab === 'services' && (
                        <Button onClick={() => setShowModal(true)}>
                            + Tambah Layanan
                        </Button>
                    )}
                    {hasPermission('create_services') && activeTab === 'therapists' && (
                        <Button onClick={handleAddTherapistClick}>
                            + Tambah Terapis
                        </Button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)', borderBottom: '2px solid var(--color-border)' }}>
                <button
                    onClick={() => setActiveTab('services')}
                    style={{
                        padding: 'var(--spacing-md)',
                        background: activeTab === 'services' ? 'var(--color-primary)' : 'transparent',
                        border: 'none',
                        color: activeTab === 'services' ? 'white' : 'var(--color-text-secondary)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        borderRadius: 'var(--radius-md) var(--radius-md) 0 0'
                    }}
                >
                    Layanan
                </button>
                <button
                    onClick={() => setActiveTab('therapists')}
                    style={{
                        padding: 'var(--spacing-md)',
                        background: activeTab === 'therapists' ? 'var(--color-primary)' : 'transparent',
                        border: 'none',
                        color: activeTab === 'therapists' ? 'white' : 'var(--color-text-secondary)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        borderRadius: 'var(--radius-md) var(--radius-md) 0 0'
                    }}
                >
                    Terapis
                </button>
            </div>

            {activeTab === 'services' && (
                <>
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
        </>
    )}

            {activeTab === 'therapists' && (
                <div className="grid gap-md">
                    {branchTherapists.map(therapist => {
                        const income = calculateTherapistIncome(therapist, bookings, services);
                        return (
                        <Card key={therapist.id} glass>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--spacing-md)' }}>
                                {/* Photo */}
                                <div style={{ width: '120px', height: '160px', background: 'var(--color-surface-hover)', borderRadius: 'var(--radius-md)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--color-border)' }}>
                                    {therapist.photo ? (
                                        <img src={therapist.photo} alt={therapist.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <span style={{ color: 'var(--color-text-secondary)', fontSize: '2rem' }}>👤</span>
                                    )}
                                </div>
                                {/* Details */}
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-xs)', color: 'var(--color-text-primary)' }}>
                                        {therapist.name}
                                    </h4>
                                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-sm)' }}>
                                        Spesialisasi: {therapist.specialization} <br/>
                                        {therapist.whatsappNumber && <span>WA: <a href={`https://wa.me/${therapist.whatsappNumber.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>{therapist.whatsappNumber}</a></span>}
                                    </p>
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)', background: 'var(--color-background)', padding: 'var(--spacing-sm)', borderRadius: 'var(--radius-md)' }}>
                                        <div>Gaji Pokok: <strong>{formatCurrency(income.wage)}</strong></div>
                                        <div>Insentif ({therapist.incentiveType === 'percentage' ? `${therapist.incentiveValue}%` : 'Fix'}): <strong>{formatCurrency(income.totalIncentive)}</strong></div>
                                        <div>Total Bonus: <strong style={{ color: 'var(--color-success)' }}>+{formatCurrency(income.totalBonus)}</strong></div>
                                        <div>Total Potongan: <strong style={{ color: 'var(--color-error)' }}>-{formatCurrency(income.totalDeduction)}</strong></div>
                                        <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--spacing-xs)', marginTop: 'var(--spacing-xs)', fontSize: 'var(--font-size-md)' }}>
                                            Estimasi Diperoleh (Bulan Ini): <strong style={{ color: 'var(--color-primary)' }}>{formatCurrency(income.netTotal)}</strong>
                                        </div>
                                    </div>
                                    <div style={{ marginTop: 'var(--spacing-sm)' }}>
                                        <Button variant="outline" size="sm" onClick={() => handlePrintSlip(therapist)}>
                                            📄 Cetak Slip
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex gap-sm" style={{ marginLeft: 'var(--spacing-md)', flexDirection: 'column' }}>
                                    {hasPermission('edit_services') && (
                                        <Button variant="secondary" size="sm" onClick={() => handleEditTherapist(therapist)}>
                                            Edit
                                        </Button>
                                    )}
                                    {hasPermission('delete_services') && (
                                        <Button variant="outline" size="sm" onClick={() => handleDeleteTherapist(therapist.id)}>
                                            Hapus
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </Card>
                    )})}
                </div>
            )}

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

                        <div className="grid grid-cols-2 gap-md">
                            <div>
                                <label className="label">Insentif Khusus Terapis</label>
                                <select
                                    className="select"
                                    value={formData.therapistIncentiveType}
                                    onChange={(e) => setFormData({ ...formData, therapistIncentiveType: e.target.value })}
                                >
                                    <option value="default">Ikuti Pengaturan Terapis</option>
                                    <option value="fixed">Nominal Tetap (Fix)</option>
                                    <option value="percentage">Persentase (%)</option>
                                </select>
                            </div>
                            
                            {formData.therapistIncentiveType !== 'default' && (
                                <div>
                                    <label className="label">Nilai Insentif {formData.therapistIncentiveType === 'percentage' ? '(%)' : '(IDR)'}</label>
                                    <input
                                        type="number"
                                        className="input"
                                        value={formData.therapistIncentiveValue}
                                        onChange={(e) => setFormData({ ...formData, therapistIncentiveValue: parseInt(e.target.value) || 0 })}
                                        min="0"
                                        step={formData.therapistIncentiveType === 'percentage' ? "1" : "1000"}
                                    />
                                </div>
                            )}
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

            {/* Add/Edit Therapist Modal */}
            <Modal
                isOpen={showTherapistModal}
                onClose={() => setShowTherapistModal(false)}
                title={editingTherapist ? 'Edit Terapis' : 'Tambah Terapis Baru'}
            >
                <form onSubmit={handleTherapistSubmit}>
                    <div className="grid gap-md">
                        <div>
                            <label className="label">Nama Terapis *</label>
                            <input
                                type="text"
                                className="input"
                                value={therapistData.name}
                                onChange={(e) => setTherapistData({ ...therapistData, name: e.target.value })}
                                required
                                placeholder="Nama lengkap terapis"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-md">
                            <div>
                                <label className="label">Nomor WhatsApp</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={therapistData.whatsappNumber}
                                    onChange={(e) => setTherapistData({ ...therapistData, whatsappNumber: e.target.value })}
                                    placeholder="Contoh: 08123456789"
                                />
                            </div>
                            <div>
                                <label className="label">Foto Terapis (Otomatis 3:4)</label>
                                <input
                                    type="file"
                                    accept="image/jpeg, image/png"
                                    onChange={handlePhotoUpload}
                                    style={{ display: 'block', marginTop: '4px', fontSize: '14px' }}
                                />
                                {therapistData.photo && (
                                    <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--color-success)' }}>
                                        ✓ Foto tersimpan
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="label">Spesialisasi *</label>
                            <select
                                className="select"
                                value={therapistData.specialization}
                                onChange={(e) => setTherapistData({ ...therapistData, specialization: e.target.value })}
                                required
                            >
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                            <div className="grid grid-cols-2 gap-md">
                                <div>
                                    <label className="label">Gaji Pokok / Upah Tetap (IDR)</label>
                                    <input
                                        type="number"
                                        className="input"
                                        value={therapistData.wage}
                                        onChange={(e) => setTherapistData({ ...therapistData, wage: parseInt(e.target.value) || 0 })}
                                        min="0"
                                        step="10000"
                                        placeholder="1000000"
                                    />
                                </div>
                                <div>
                                    <label className="label">Tipe Insentif per Layanan</label>
                                    <select
                                        className="select"
                                        value={therapistData.incentiveType}
                                        onChange={(e) => setTherapistData({ ...therapistData, incentiveType: e.target.value })}
                                    >
                                        <option value="fixed">Nominal Tetap (Fix)</option>
                                        <option value="percentage">Persentase (%)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Nilai Insentif {therapistData.incentiveType === 'percentage' ? '(%)' : '(IDR)'} *</label>
                                    <input
                                        type="number"
                                        className="input"
                                        value={therapistData.incentiveValue}
                                        onChange={(e) => setTherapistData({ ...therapistData, incentiveValue: parseInt(e.target.value) || 0 })}
                                        required
                                        min="0"
                                        step={therapistData.incentiveType === 'percentage' ? "1" : "1000"}
                                        placeholder={therapistData.incentiveType === 'percentage' ? "10" : "50000"}
                                    />
                                </div>
                            </div>

                            {/* Dynamic Bonus Items */}
                            <div style={{ marginTop: 'var(--spacing-sm)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xs)' }}>
                                    <label className="label" style={{ margin: 0 }}>Item Bonus Tambahan</label>
                                    <Button type="button" size="sm" variant="outline" onClick={handleAddBonus}>+ Tambah</Button>
                                </div>
                                {therapistData.bonusItems?.map(item => (
                                    <div key={item.id} style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
                                        <input 
                                            type="text" 
                                            placeholder="Nama Bonus" 
                                            className="input" 
                                            style={{ flex: 2 }} 
                                            value={item.name} 
                                            onChange={(e) => handleUpdateBonus(item.id, 'name', e.target.value)} 
                                        />
                                        <input 
                                            type="number" 
                                            placeholder="Nominal" 
                                            className="input" 
                                            style={{ flex: 1 }} 
                                            value={item.amount} 
                                            onChange={(e) => handleUpdateBonus(item.id, 'amount', e.target.value)} 
                                        />
                                        <Button type="button" variant="outline" style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)' }} onClick={() => handleRemoveBonus(item.id)}>X</Button>
                                    </div>
                                ))}
                            </div>

                            {/* Dynamic Deduction Items */}
                            <div style={{ marginTop: 'var(--spacing-sm)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xs)' }}>
                                    <label className="label" style={{ margin: 0 }}>Item Potongan</label>
                                    <Button type="button" size="sm" variant="outline" onClick={handleAddDeduction}>+ Tambah</Button>
                                </div>
                                {therapistData.deductionItems?.map(item => (
                                    <div key={item.id} style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
                                        <input 
                                            type="text" 
                                            placeholder="Nama Potongan" 
                                            className="input" 
                                            style={{ flex: 2 }} 
                                            value={item.name} 
                                            onChange={(e) => handleUpdateDeduction(item.id, 'name', e.target.value)} 
                                        />
                                        <input 
                                            type="number" 
                                            placeholder="Nominal" 
                                            className="input" 
                                            style={{ flex: 1 }} 
                                            value={item.amount} 
                                            onChange={(e) => handleUpdateDeduction(item.id, 'amount', e.target.value)} 
                                        />
                                        <Button type="button" variant="outline" style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)' }} onClick={() => handleRemoveDeduction(item.id)}>X</Button>
                                    </div>
                                ))}
                            </div>

                        <div className="flex gap-md justify-end">
                            <Button type="button" variant="secondary" onClick={() => setShowTherapistModal(false)}>
                                Batal
                            </Button>
                            <Button type="submit" variant="success">
                                {editingTherapist ? 'Simpan Perubahan' : 'Tambah Terapis'}
                            </Button>
                        </div>
                    </div>
                </form>
            </Modal>

            {/* PDF Preview Modal */}
            <Modal
                isOpen={!!previewPdfUrl}
                onClose={() => setPreviewPdfUrl(null)}
                title="Preview Slip Pendapatan"
            >
                <div style={{ height: '70vh', minHeight: '500px' }}>
                    {previewPdfUrl && (
                        <iframe 
                            src={previewPdfUrl} 
                            style={{ width: '100%', height: '100%', border: 'none', borderRadius: 'var(--radius-md)' }} 
                            title="Slip Preview"
                        />
                    )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--spacing-md)' }}>
                    <Button variant="secondary" onClick={() => setPreviewPdfUrl(null)}>Tutup</Button>
                </div>
            </Modal>
        </div>
    );
}
