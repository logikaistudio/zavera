import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import { getToday } from '../utils/formatters';

export default function Roster() {
    const {
        therapists,
        selectedBranch,
        getTherapistStatus,
        setTherapistStatus,
        bulkSetTherapistStatuses,
        hasPermission
    } = useAppContext();

    const [selectedDate, setSelectedDate] = useState(getToday());

    // Bulk Modal States
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkPeriod, setBulkPeriod] = useState('weekly'); // 'weekly' | 'monthly'
    const [bulkStartDate, setBulkStartDate] = useState(getToday());
    const [bulkMonth, setBulkMonth] = useState(() => {
        const today = new Date();
        return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    });
    const [selectedTherapistIds, setSelectedTherapistIds] = useState([]);

    const DAYS_OF_WEEK = [
        { key: 1, label: 'Senin' },
        { key: 2, label: 'Selasa' },
        { key: 3, label: 'Rabu' },
        { key: 4, label: 'Kamis' },
        { key: 5, label: 'Jumat' },
        { key: 6, label: 'Sabtu' },
        { key: 7, label: 'Minggu' }
    ];

    const [weeklyConfig, setWeeklyConfig] = useState({
        1: { isWorkDay: true, startTime: '09:00', endTime: '17:00' },
        2: { isWorkDay: true, startTime: '09:00', endTime: '17:00' },
        3: { isWorkDay: true, startTime: '09:00', endTime: '17:00' },
        4: { isWorkDay: true, startTime: '09:00', endTime: '17:00' },
        5: { isWorkDay: true, startTime: '09:00', endTime: '17:00' },
        6: { isWorkDay: true, startTime: '09:00', endTime: '17:00' },
        7: { isWorkDay: false, startTime: '09:00', endTime: '17:00' } // Minggu default Libur
    });

    if (!hasPermission('manage_users')) {
        return (
            <div className="container" style={{ padding: 'var(--spacing-lg) var(--spacing-md)' }}>
                <Card glass style={{ textAlign: 'center', padding: '40px' }}>
                    <h3>Akses Ditolak</h3>
                    <p>Anda tidak memiliki izin untuk mengelola roster/shift.</p>
                </Card>
            </div>
        );
    }

    const branchTherapists = (therapists || []).filter(t => t.branchId === selectedBranch?.id || !t.branchId);

    // Generate time slots from 06:00 to 23:30
    const timeOptions = [];
    for (let i = 6; i <= 23; i++) {
        timeOptions.push(`${String(i).padStart(2, '0')}:00`);
        timeOptions.push(`${String(i).padStart(2, '0')}:30`);
    }

    // Calculate summary
    const offDutyCount = branchTherapists.filter(t => {
        const tStatus = getTherapistStatus(t.id, selectedDate)?.status;
        return tStatus === 'off-duty';
    }).length;
    const onDutyCount = branchTherapists.length - offDutyCount;

    const handleToggleStatus = (therapistId, currentIsOffDuty, tStatusObj) => {
        const newStatus = currentIsOffDuty ? 'on-duty' : 'off-duty';
        const st = tStatusObj?.startTime || '09:00';
        const et = tStatusObj?.endTime || '17:00';
        setTherapistStatus(therapistId, newStatus, selectedDate, tStatusObj?.note || '', st, et);
    };

    const handleTimeChange = (therapistId, tStatusObj, field, value) => {
        const st = field === 'start' ? value : (tStatusObj?.startTime || '09:00');
        const et = field === 'end' ? value : (tStatusObj?.endTime || '17:00');
        setTherapistStatus(therapistId, 'on-duty', selectedDate, tStatusObj?.note || '', st, et);
    };

    const handleApplyBulkSchedule = (e) => {
        e.preventDefault();
        if (selectedTherapistIds.length === 0) {
            alert('Silakan pilih minimal satu terapis.');
            return;
        }

        const entries = [];

        if (bulkPeriod === 'weekly') {
            const start = new Date(bulkStartDate);
            for (let i = 0; i < 7; i++) {
                const currentDate = new Date(start);
                currentDate.setDate(start.getDate() + i);
                const dateStr = currentDate.toISOString().split('T')[0];
                
                let dayKey = currentDate.getDay();
                if (dayKey === 0) dayKey = 7; // Sunday is 7
                
                const config = weeklyConfig[dayKey];
                
                selectedTherapistIds.forEach(tId => {
                    entries.push({
                        therapistId: tId,
                        date: dateStr,
                        status: config.isWorkDay ? 'on-duty' : 'off-duty',
                        startTime: config.startTime,
                        endTime: config.endTime,
                        note: `Jadwal Shift Mingguan`
                    });
                });
            }
        } else {
            // Monthly schedule
            const [year, month] = bulkMonth.split('-').map(Number);
            const daysInMonth = new Date(year, month, 0).getDate();
            
            for (let day = 1; day <= daysInMonth; day++) {
                const currentDate = new Date(year, month - 1, day);
                const dateStr = currentDate.toISOString().split('T')[0];
                
                let dayKey = currentDate.getDay();
                if (dayKey === 0) dayKey = 7; // Sunday is 7
                
                const config = weeklyConfig[dayKey];
                
                selectedTherapistIds.forEach(tId => {
                    entries.push({
                        therapistId: tId,
                        date: dateStr,
                        status: config.isWorkDay ? 'on-duty' : 'off-duty',
                        startTime: config.startTime,
                        endTime: config.endTime,
                        note: `Jadwal Shift Bulanan`
                    });
                });
            }
        }

        bulkSetTherapistStatuses(entries);
        setShowBulkModal(false);
        alert(`Berhasil menerapkan jadwal roster untuk ${selectedTherapistIds.length} terapis.`);
    };

    return (
        <div className="container" style={{ padding: 'var(--spacing-lg) var(--spacing-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: 'var(--spacing-lg)' }}>
                <div>
                    <h2 className="heading-2" style={{ marginBottom: 'var(--spacing-xs)' }}>
                        Manajemen Roster & Jam Kerja
                    </h2>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                        Atur jadwal shift, libur, dan jam kerja terapis
                    </p>
                </div>
                <Button 
                    variant="primary" 
                    onClick={() => {
                        setSelectedTherapistIds([]);
                        setShowBulkModal(true);
                    }}
                >
                    📅 Jadwalkan Shift Massal
                </Button>
            </div>

            {/* Controls & Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-md mb-lg">
                <Card glass>
                    <label className="label">Pilih Tanggal Roster</label>
                    <input
                        type="date"
                        className="input"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        style={{ maxWidth: '100%' }}
                    />
                </Card>
                <Card glass style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                        <div>
                            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#3b82f6' }}>{branchTherapists.length}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Total Terapis</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#10b981' }}>{onDutyCount}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>On Duty</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#ef4444' }}>{offDutyCount}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Off Duty</div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Therapist Grid */}
            <h3 style={{ marginBottom: '16px', fontSize: '1.2rem', fontWeight: 600 }}>Daftar Terapis</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-md mb-lg">
                {branchTherapists.map(t => {
                    const tStatusObj = getTherapistStatus(t.id, selectedDate);
                    const isOffDuty = tStatusObj?.status === 'off-duty';
                    const startTime = tStatusObj?.startTime || '09:00';
                    const endTime = tStatusObj?.endTime || '17:00';

                    return (
                        <div 
                            key={t.id} 
                            style={{ 
                                background: isOffDuty ? 'var(--color-surface)' : 'var(--color-bg-alt)',
                                borderRadius: '16px', 
                                padding: '20px', 
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: '16px', 
                                border: isOffDuty ? '1px dashed var(--color-border)' : '1px solid var(--color-border)',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' 
                            }}
                        >
                            {/* Top row: Info & Status */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#cbd5e1', border: '2px solid #e2e8f0', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {t.photo ? (
                                            <img src={t.photo} alt={t.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <span style={{ fontSize: '1rem' }}>👤</span>
                                        )}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.95rem', color: isOffDuty ? 'var(--color-text-secondary)' : 'var(--color-text-primary)' }}>{t.name}</div>
                                        <div style={{ color: 'var(--color-text-tertiary)', fontSize: '0.75rem' }}>{t.specialization}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Working Hours Input (Always visible, disabled when Off Duty) */}
                            <div style={{ 
                                display: 'flex', 
                                gap: '8px', 
                                alignItems: 'center', 
                                background: 'var(--color-surface)', 
                                padding: '12px', 
                                borderRadius: '8px',
                                opacity: isOffDuty ? 0.55 : 1,
                                border: isOffDuty ? '1px solid transparent' : '1px solid var(--color-border)'
                            }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Mulai</label>
                                    <select 
                                        value={startTime}
                                        disabled={isOffDuty}
                                        onChange={(e) => handleTimeChange(t.id, tStatusObj, 'start', e.target.value)}
                                        style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: isOffDuty ? '#94a3b8' : '#fff', fontSize: '0.85rem', cursor: isOffDuty ? 'not-allowed' : 'default' }}
                                    >
                                        {timeOptions.map(time => (
                                            <option key={`start-${time}`} value={time}>{time}</option>
                                        ))}
                                    </select>
                                </div>
                                <span style={{ fontWeight: 'bold', color: 'var(--color-text-tertiary)', marginTop: '16px' }}>-</span>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Selesai</label>
                                    <select 
                                        value={endTime}
                                        disabled={isOffDuty}
                                        onChange={(e) => handleTimeChange(t.id, tStatusObj, 'end', e.target.value)}
                                        style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: isOffDuty ? '#94a3b8' : '#fff', fontSize: '0.85rem', cursor: isOffDuty ? 'not-allowed' : 'default' }}
                                    >
                                        {timeOptions.map(time => (
                                            <option key={`end-${time}`} value={time}>{time}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Bottom row: Toggle */}
                            <div style={{ marginTop: 'auto' }}>
                                <button 
                                    onClick={() => handleToggleStatus(t.id, isOffDuty, tStatusObj)}
                                    style={{
                                        width: '100%',
                                        padding: '6px 0',
                                        borderRadius: '20px',
                                        border: 'none',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        background: isOffDuty ? '#10b981' : '#ef4444',
                                        color: '#fff',
                                        fontSize: '0.8rem',
                                        transition: 'background 0.2s'
                                    }}
                                >
                                    {isOffDuty ? 'Set On Duty' : 'Set Off Duty'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal: Bulk Scheduling Shift */}
            <Modal
                isOpen={showBulkModal}
                onClose={() => setShowBulkModal(false)}
                title="Penjadwalan Shift Massal"
            >
                <form onSubmit={handleApplyBulkSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Period Tabs */}
                    <div style={{ display: 'flex', background: 'var(--color-surface)', padding: '4px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                        <button
                            type="button"
                            onClick={() => setBulkPeriod('weekly')}
                            style={{
                                flex: 1,
                                padding: '8px 12px',
                                border: 'none',
                                borderRadius: '6px',
                                background: bulkPeriod === 'weekly' ? 'var(--color-primary)' : 'transparent',
                                color: '#fff',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'background 0.2s'
                            }}
                        >
                            Mingguan
                        </button>
                        <button
                            type="button"
                            onClick={() => setBulkPeriod('monthly')}
                            style={{
                                flex: 1,
                                padding: '8px 12px',
                                border: 'none',
                                borderRadius: '6px',
                                background: bulkPeriod === 'monthly' ? 'var(--color-primary)' : 'transparent',
                                color: '#fff',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'background 0.2s'
                            }}
                        >
                            Bulanan
                        </button>
                    </div>

                    {/* Date Selector */}
                    {bulkPeriod === 'weekly' ? (
                        <div>
                            <label className="label">Pilih Tanggal Mulai</label>
                            <input
                                type="date"
                                className="input"
                                value={bulkStartDate}
                                onChange={(e) => setBulkStartDate(e.target.value)}
                                required
                                style={{ width: '100%' }}
                            />
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                                Shift akan diterapkan selama 7 hari berturut-turut mulai tanggal ini.
                            </p>
                        </div>
                    ) : (
                        <div>
                            <label className="label">Pilih Bulan</label>
                            <input
                                type="month"
                                className="input"
                                value={bulkMonth}
                                onChange={(e) => setBulkMonth(e.target.value)}
                                required
                                style={{ width: '100%' }}
                            />
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                                Shift akan diterapkan untuk seluruh tanggal di bulan ini.
                            </p>
                        </div>
                    )}

                    {/* Therapist Selector checklist */}
                    <div>
                        <label className="label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Pilih Terapis ({selectedTherapistIds.length} terpilih)</span>
                        </label>
                        <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '10px', background: 'var(--color-surface)' }}>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
                                <Button size="xs" variant="secondary" type="button" onClick={() => setSelectedTherapistIds(branchTherapists.map(t => t.id))}>
                                    Pilih Semua
                                </Button>
                                <Button size="xs" variant="outline" type="button" onClick={() => setSelectedTherapistIds([])}>
                                    Hapus Pilihan
                                </Button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
                                {branchTherapists.map(t => (
                                    <label key={`select-${t.id}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer', userSelect: 'none' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedTherapistIds.includes(t.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedTherapistIds([...selectedTherapistIds, t.id]);
                                                } else {
                                                    setSelectedTherapistIds(selectedTherapistIds.filter(id => id !== t.id));
                                                }
                                            }}
                                        />
                                        {t.name}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Workday configuration list */}
                    <div>
                        <label className="label" style={{ marginBottom: '8px' }}>Aturan Jam Kerja & Hari Masuk</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {DAYS_OF_WEEK.map(day => {
                                const config = weeklyConfig[day.key];
                                return (
                                    <div key={day.key} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--color-bg-alt)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                                        <div style={{ width: '70px', fontWeight: 600, fontSize: '0.85rem' }}>{day.label}</div>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.8rem', userSelect: 'none' }}>
                                            <input
                                                type="checkbox"
                                                checked={config.isWorkDay}
                                                onChange={(e) => {
                                                    setWeeklyConfig({
                                                        ...weeklyConfig,
                                                        [day.key]: { ...config, isWorkDay: e.target.checked }
                                                    });
                                                }}
                                            />
                                            Masuk
                                        </label>
                                        
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto', opacity: config.isWorkDay ? 1 : 0.45, pointerEvents: config.isWorkDay ? 'auto' : 'none' }}>
                                            <select
                                                value={config.startTime}
                                                onChange={(e) => {
                                                    setWeeklyConfig({
                                                        ...weeklyConfig,
                                                        [day.key]: { ...config, startTime: e.target.value }
                                                    });
                                                }}
                                                className="select"
                                                style={{ padding: '4px 6px', fontSize: '0.75rem', width: '75px', height: '28px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: '#fff', borderRadius: '4px' }}
                                                disabled={!config.isWorkDay}
                                            >
                                                {timeOptions.map(time => (
                                                    <option key={`bulk-start-${day.key}-${time}`} value={time}>{time}</option>
                                                ))}
                                            </select>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)' }}>-</span>
                                            <select
                                                value={config.endTime}
                                                onChange={(e) => {
                                                    setWeeklyConfig({
                                                        ...weeklyConfig,
                                                        [day.key]: { ...config, endTime: e.target.value }
                                                    });
                                                }}
                                                className="select"
                                                style={{ padding: '4px 6px', fontSize: '0.75rem', width: '75px', height: '28px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: '#fff', borderRadius: '4px' }}
                                                disabled={!config.isWorkDay}
                                            >
                                                {timeOptions.map(time => (
                                                    <option key={`bulk-end-${day.key}-${time}`} value={time}>{time}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                        <Button variant="secondary" type="button" onClick={() => setShowBulkModal(false)}>
                            Batal
                        </Button>
                        <Button variant="primary" type="submit">
                            Terapkan Jadwal
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
