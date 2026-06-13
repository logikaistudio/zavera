import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import { StatusBadge } from '../components/common/Badge';
import { formatCurrency, formatTime, formatDate, formatDuration, getToday } from '../utils/formatters';
import { exportReceipt } from '../utils/exportPDF';

export default function Scheduling() {
    const {
        branchBookings,
        services,
        therapists,
        selectedBranch,
        addBooking,
        updateBooking,
        deleteBooking,
        customers,
        // supervisor / timing
        setTherapistStatus,
        getTherapistStatus,
        startService,
        finishService,
        getServiceRemainingMinutes,
        getDailyServiceTotals,
        // new states from context
        rekaps,
        setRekaps,
        pembukuan,
        setPembukuan,
        hasPermission
    } = useAppContext();
    const [now, setNow] = useState(new Date());
    const [remainingSecondsMap, setRemainingSecondsMap] = useState({});
    const [totalSecondsMap, setTotalSecondsMap] = useState({});
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [isExporting, setIsExporting] = useState(false);
    const [previewRekapId, setPreviewRekapId] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState(getToday());
    const [hideOffDuty, setHideOffDuty] = useState(true);
    const [isMultiDeleteActive, setIsMultiDeleteActive] = useState(false);
    const [selectedBookingIds, setSelectedBookingIds] = useState([]);

    const handleBulkDelete = () => {
        if (selectedBookingIds.length === 0) return;
        if (confirm(`Yakin ingin menghapus ${selectedBookingIds.length} booking terpilih? Semua aktivitas booking hingga pembukuan terkait akan dihapus otomatis.`)) {
            deleteBooking(selectedBookingIds);
            setSelectedBookingIds([]);
            setIsMultiDeleteActive(false);
        }
    };

    const [formData, setFormData] = useState({
        serviceIds: [],
        therapistId: '',
        customerName: '',
        customerPhone: '',
        gender: '',
        address: '',
        transport: '',
        extraTransport: '',
        extraCharge: '',
        customDuration: '',
        complaint: '',
        pressure: '',
        paymentMethod: '',
        date: getToday(),
        time: '09:00',
        status: 'confirmed',
        notes: ''
    });

    const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);

    const filteredCustomerSuggestions = React.useMemo(() => {
        const nameInput = (formData.customerName || '').toLowerCase().trim();
        if (!nameInput) return [];
        return (customers || []).filter(c => 
            (c.name || '').toLowerCase().includes(nameInput) ||
            (c.phone || '').toLowerCase().includes(nameInput)
        );
    }, [customers, formData.customerName]);

    const selectedServices = services.filter(s => formData.serviceIds?.includes(s.id));
    const calculatedPrice = selectedServices.reduce((sum, s) => sum + (s.price || 0), 0);
    const transportNum = parseInt(formData.transport?.toString().replace(/[^0-9]/g, '') || '0', 10);
    const extraTransportNum = parseInt(formData.extraTransport?.toString().replace(/[^0-9]/g, '') || '0', 10);
    const extraChargeNum = parseInt(formData.extraCharge?.toString().replace(/[^0-9]/g, '') || '0', 10);
    const finalPrice = calculatedPrice + transportNum + extraTransportNum + extraChargeNum;
    const calculatedDuration = selectedServices.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);


    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (!formData.serviceIds || formData.serviceIds.length === 0) {
            alert('Pilih minimal 1 layanan!');
            return;
        }

        const bookingData = {
            ...formData,
            transport: transportNum,
            extraTransport: extraTransportNum,
            extraCharge: extraChargeNum,
            totalPrice: finalPrice,
            durationMinutes: formData.customDuration ? parseInt(formData.customDuration) : calculatedDuration
        };

        if (formData.id) {
            updateBooking(formData.id, bookingData);
        } else {
            addBooking(bookingData);
        }
        resetForm();
    };

    const toggleOffDuty = (therapistId, isCurrentlyOffDuty) => {
        if (!hasPermission('manage_users')) return;
        setTherapistStatus(therapistId, isCurrentlyOffDuty ? 'on-duty' : 'off-duty', selectedDate);
    };

    const handleStartNextBooking = (therapistId) => {
        const myBookings = branchBookings
            .filter(b => b.therapistId === therapistId && b.date === selectedDate && b.status === 'confirmed')
            .sort((a, b) => a.time.localeCompare(b.time));
        if (myBookings.length > 0) {
            updateBooking(myBookings[0].id, { status: 'in-service' });
        } else {
            alert('Tidak ada booking yang berstatus Confirmed untuk hari ini.');
        }
    };

    const handleFinishCurrentBooking = (therapistId) => {
        const inService = branchBookings.find(b => b.therapistId === therapistId && b.date === selectedDate && b.status === 'in-service');
        if (inService) {
            updateBooking(inService.id, { status: 'completed' });
        } else {
            alert('Tidak ada layanan yang sedang berjalan.');
        }
    };

    const handleEditBooking = (booking) => {
        setFormData({ 
            ...booking,
            customerPhone: booking.customerPhone || '',
            transport: booking.transport ? booking.transport.toLocaleString('id-ID') : '',
            extraTransport: booking.extraTransport ? booking.extraTransport.toLocaleString('id-ID') : '',
            extraCharge: booking.extraCharge ? booking.extraCharge.toLocaleString('id-ID') : '',
            serviceIds: booking.serviceIds || (booking.serviceId ? [booking.serviceId] : [])
        });
        setShowModal(true);
    };

    const handleBook = (therapistId) => {
        // Calculate auto transport fee based on therapist's config
        const therapist = therapists.find(t => t.id === therapistId);
        
        // Count valid bookings today (excluding canceled)
        const bookingsToday = branchBookings.filter(b => b.therapistId === therapistId && b.date === selectedDate && b.status !== 'canceled');
        const isFirstBooking = bookingsToday.length === 0;

        let autoTransport = '';
        if (therapist) {
            if (isFirstBooking && therapist.transportFee1) {
                autoTransport = therapist.transportFee1.toLocaleString('id-ID');
            } else if (!isFirstBooking && therapist.transportFeeNext) {
                autoTransport = therapist.transportFeeNext.toLocaleString('id-ID');
            }
        }

        setFormData({
            ...formData,
            therapistId: therapistId,
            date: selectedDate,
            transport: autoTransport,
            serviceIds: [],
            customerName: '',
            customerPhone: '',
            gender: '',
            address: '',
            extraTransport: '',
            extraCharge: '',
            customDuration: '',
            complaint: '',
            pressure: '',
            paymentMethod: '',
            time: '09:00',
            status: 'confirmed',
            notes: ''
        });
        setShowModal(true);
    };

    const resetForm = () => {
        setFormData({
            serviceIds: [],
            therapistId: '',
            customerName: '',
            customerPhone: '',
            gender: '',
            address: '',
            transport: '',
            extraTransport: '',
            extraCharge: '',
            customDuration: '',
            complaint: '',
            pressure: '',
            paymentMethod: '',
            date: getToday(),
            time: '09:00',
            status: 'confirmed',
            notes: ''
        });
        setShowModal(false);
    };

    const handleStatusChange = (bookingId, newStatus) => {
        updateBooking(bookingId, { status: newStatus });
    };

    const handleCancelBooking = (bookingId) => {
        updateBooking(bookingId, { status: 'canceled' });
    };

    const handleDelete = (id) => {
        if (confirm('Yakin ingin menghapus booking ini?')) {
            deleteBooking(id);
        }
    };

    const handlePrintReceipt = (booking) => {
        const bookedServices = services.filter(s => (booking.serviceIds || [booking.serviceId]).includes(s.id));
        const therapist = therapists.find(t => t.id === booking.therapistId);
        if (bookedServices.length > 0 && therapist && selectedBranch) {
            exportReceipt(booking, bookedServices, therapist, selectedBranch);
        }
    };

    // Filter bookings by selected date (exclude canceled)
    const dateBookings = branchBookings
        .filter(b => b.date === selectedDate && b.status !== 'canceled')
        .sort((a, b) => a.time.localeCompare(b.time));

    const branchTherapists = (therapists || []).filter(t => t.branchId === selectedBranch?.id || !t.branchId);

    // Generate time slots from 00:00 to 24:00 (30-minute slots)
    const timeSlots = [];
    for (let i = 0; i <= 23; i++) {
        timeSlots.push(`${String(i).padStart(2, '0')}:00`);
        timeSlots.push(`${String(i).padStart(2, '0')}:30`);
    }
    const parseTimeToMinutes = (timeStr) => {
        const [hh, mm] = timeStr.split(':').map(Number);
        return hh * 60 + (mm || 0);
    };


    // Live clock and countdown updater
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        const map = {};
        const totals = {};
        therapists.forEach(t => {
            const inService = branchBookings.find(b => b.therapistId === t.id && b.date === selectedDate && b.status === 'in-service');
            if (inService) {
                const remMin = getServiceRemainingMinutes(inService);
                const seconds = Math.max(0, Math.floor((remMin || 0) * 60));
                map[t.id] = seconds;
                totals[t.id] = seconds;
            } else {
                map[t.id] = 0;
                totals[t.id] = 0;
            }
        });
        setRemainingSecondsMap(map);
        setTotalSecondsMap(totals);
        // tick every second to decrement
        const iv = setInterval(() => {
            setRemainingSecondsMap(prev => {
                const next = { ...prev };
                Object.keys(next).forEach(k => {
                    next[k] = Math.max(0, next[k] - 1);
                });
                return next;
            });
        }, 1000);
        return () => clearInterval(iv);
    }, [therapists, branchBookings, selectedDate]);

    return (
        <div className="container" style={{ padding: 'var(--spacing-lg) var(--spacing-md)' }}>
            {/* Header */}
                <div className="flex items-center justify-between mb-lg">
                    <div>
                        <h2 className="heading-2" style={{ marginBottom: 'var(--spacing-xs)' }}>
                            Jadwal & Booking
                        </h2>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                            Kelola jadwal layanan dan booking pelanggan
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{String(now.getHours()).padStart(2,'0')} : {String(now.getMinutes()).padStart(2,'0')} : {String(now.getSeconds()).padStart(2,'0')}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>{now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' })}</div>
                        </div>
                    </div>
                </div>

            {/* Date Selector */}
            <Card glass className="mb-lg">
                <div className="flex items-center justify-between">
                    <label className="label">Pilih Tanggal</label>
                </div>
                <input
                    type="date"
                    className="input"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    style={{ maxWidth: '300px' }}
                />
                <div style={{ marginTop: 8 }}>
                    {hasPermission('create_scheduling') && (
                        <Button onClick={() => setShowModal(true)}>+ Booking Baru</Button>
                    )}
                </div>
            </Card>

            {/* Therapist Dashboard Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-sm mb-lg">
                {[...branchTherapists]
                    .map(t => ({
                        ...t,
                        isOffDuty: getTherapistStatus(t.id, selectedDate)?.status === 'off-duty'
                    }))
                    .filter(t => !t.isOffDuty)
                    .sort((a, b) => {
                        if (a.isOffDuty && !b.isOffDuty) return 1;
                        if (!a.isOffDuty && b.isOffDuty) return -1;
                        return a.name.localeCompare(b.name);
                    })
                    .map(t => {
                    const tStatusObj = getTherapistStatus(t.id, selectedDate);
                    const myBookings = branchBookings.filter(b => b.therapistId === t.id && b.date === selectedDate && b.status !== 'canceled');
                    const isOffDuty = t.isOffDuty;
                    const inServiceBooking = myBookings.find(b => b.status === 'in-service');
                    
                    const totalMinutes = myBookings.reduce((sum, b) => {
                        const bookedServices = services.filter(s => (b.serviceIds || [b.serviceId]).includes(s.id));
                        const totalDuration = b.durationMinutes || bookedServices.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
                        return sum + (totalDuration || 0);
                    }, 0);

                    // Determine level bar state
                    let barContent = null;
                    if (isOffDuty) {
                        barContent = <div style={{ width: '100%', height: '100%', background: '#ef4444', borderRadius: 20 }} />;
                    } else if (inServiceBooking) {
                        const svc = services.find(x => x.id === inServiceBooking.serviceId);
                        const durMin = svc ? svc.durationMinutes : 60;
                        const totalSec = durMin * 60;
                        const remSec = remainingSecondsMap[t.id] || 0;
                        const elapsedSec = Math.max(0, totalSec - remSec);
                        const elapsedPct = totalSec > 0 ? (elapsedSec / totalSec) * 100 : 0;
                        
                        barContent = (
                            <div style={{ display: 'flex', width: '100%', height: '100%', borderRadius: 20, overflow: 'hidden' }}>
                                <div style={{ width: `${elapsedPct}%`, background: '#f59e0b', transition: 'width 1s linear' }} />
                                <div style={{ width: `${100 - elapsedPct}%`, background: '#0ea5e9', transition: 'width 1s linear' }} />
                            </div>
                        );
                    } else {
                        // Available / Not in service
                        barContent = <div style={{ width: '100%', height: '100%', background: '#65a30d', borderRadius: 20 }} />;
                    }

                    return (
                        <div key={t.id} style={{ background: isOffDuty ? '#0f172a' : '#1e293b', opacity: isOffDuty ? 0.6 : 1, border: isOffDuty ? '1px dashed #334155' : 'none', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                            {/* Top row: Info & Status */}
                            <div 
                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: hasPermission('manage_users') ? 'pointer' : 'default' }}
                                onClick={() => toggleOffDuty(t.id, isOffDuty)}
                                title={hasPermission('manage_users') ? (isOffDuty ? "Set On Duty" : "Set Off Duty") : ""}
                            >
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#334155', border: '2px solid #e2e8f0', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', filter: isOffDuty ? 'grayscale(100%)' : 'none' }}>
                                        {t.photo ? (
                                            <img src={t.photo} alt={t.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <span style={{ fontSize: '1rem' }}>👤</span>
                                        )}
                                    </div>
                                    <div>
                                        <div style={{ color: isOffDuty ? '#64748b' : '#f8fafc', fontWeight: 600, fontSize: '0.95rem', textDecoration: isOffDuty ? 'line-through' : 'none' }}>{t.name}</div>
                                        <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{myBookings.length} booking • {totalMinutes} mnt</div>
                                        {!isOffDuty && tStatusObj && (
                                            <div style={{ color: '#10b981', fontSize: '0.7rem', marginTop: '2px', fontWeight: 600 }}>
                                                Shift: {tStatusObj.startTime || '09:00'} - {tStatusObj.endTime || '17:00'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div style={{ width: '100%', height: 16, background: '#334155', borderRadius: 10, overflow: 'hidden' }}>
                                {barContent}
                            </div>

                            {/* Bottom row: Controls */}
                            {!isOffDuty && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    <button 
                                        onClick={() => handleStartNextBooking(t.id)}
                                        style={{ flex: 1, minWidth: '45%', padding: '6px 0', background: '#f59e0b', color: '#fff', fontWeight: 700, fontSize: '0.75rem', border: 'none', borderRadius: 12, cursor: 'pointer' }}
                                    >
                                        MULAI
                                    </button>
                                    <button 
                                        onClick={() => handleFinishCurrentBooking(t.id)}
                                        style={{ flex: 1, minWidth: '45%', padding: '6px 0', background: '#0ea5e9', color: '#fff', fontWeight: 700, fontSize: '0.75rem', border: 'none', borderRadius: 12, cursor: 'pointer' }}
                                    >
                                        SELESAI
                                    </button>
                                    {inServiceBooking ? (
                                        <button 
                                            onClick={() => handleEditBooking(inServiceBooking)}
                                            style={{ flex: '1 1 100%', padding: '6px 0', background: '#d1d5db', color: '#1f2937', fontWeight: 700, fontSize: '0.75rem', border: 'none', borderRadius: 12, cursor: 'pointer' }}
                                        >
                                            EDIT
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => handleBook(t.id)}
                                            style={{ flex: '1 1 100%', padding: '6px 0', background: '#65a30d', color: '#fff', fontWeight: 700, fontSize: '0.75rem', border: 'none', borderRadius: 12, cursor: 'pointer' }}
                                        >
                                            BOOK
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Bookings List */}
            <Card glass>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)', flexWrap: 'wrap', gap: '8px' }}>
                    <h3 className="heading-3" style={{ margin: 0 }}>
                        Booking untuk {formatDate(selectedDate, 'medium')}
                    </h3>
                    {hasPermission('delete_scheduling') && dateBookings.length > 0 && (
                        <Button 
                            variant={isMultiDeleteActive ? "danger" : "outline"} 
                            size="sm"
                            onClick={() => {
                                setIsMultiDeleteActive(!isMultiDeleteActive);
                                setSelectedBookingIds([]);
                            }}
                        >
                            {isMultiDeleteActive ? "Nonaktifkan Multi-Hapus" : "⚙️ Mode Multi-Hapus"}
                        </Button>
                    )}
                </div>

                {dateBookings.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: 'var(--spacing-xl)',
                        color: 'var(--color-text-muted)'
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-md)' }}>📅</div>
                        <p>Tidak ada booking untuk tanggal ini</p>
                    </div>
                ) : (
                    <div className="grid gap-md">
                        {dateBookings.map(booking => {
                            const service = services.find(s => s.id === booking.serviceId);
                            const therapist = therapists.find(t => t.id === booking.therapistId);

                            return (
                                <div
                                    key={booking.id}
                                    className="card"
                                    style={{ 
                                        borderLeft: `4px solid var(--color-${booking.status === 'completed' ? 'success' : 'primary'})`,
                                        display: 'flex',
                                        gap: '16px',
                                        alignItems: 'center',
                                        cursor: isMultiDeleteActive ? 'pointer' : 'default',
                                        transition: 'background-color 0.2s ease',
                                        backgroundColor: isMultiDeleteActive && selectedBookingIds.includes(booking.id) ? 'rgba(239, 68, 68, 0.05)' : 'transparent'
                                    }}
                                    onClick={() => {
                                        if (isMultiDeleteActive) {
                                            setSelectedBookingIds(prev => 
                                                prev.includes(booking.id)
                                                    ? prev.filter(id => id !== booking.id)
                                                    : [...prev, booking.id]
                                            );
                                        }
                                    }}
                                >
                                    {isMultiDeleteActive && (
                                        <input 
                                            type="checkbox" 
                                            checked={selectedBookingIds.includes(booking.id)}
                                            onChange={(e) => {
                                                e.stopPropagation();
                                                const checked = e.target.checked;
                                                setSelectedBookingIds(prev => 
                                                    checked
                                                        ? [...prev, booking.id]
                                                        : prev.filter(id => id !== booking.id)
                                                );
                                            }}
                                            style={{
                                                width: '20px',
                                                height: '20px',
                                                cursor: 'pointer',
                                                accentColor: '#ef4444',
                                                flexShrink: 0
                                            }}
                                        />
                                    )}
                                    <div className="flex justify-between items-start" style={{ flex: 1 }}>
                                        <div style={{ flex: 1 }}>
                                            <div className="flex items-center gap-md mb-sm">
                                                <span style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>
                                                    {formatTime(booking.time)}
                                                </span>
                                                <StatusBadge status={booking.status} />
                                            </div>

                                            <h4 style={{
                                                fontSize: 'var(--font-size-lg)',
                                                fontWeight: 600,
                                                marginBottom: 'var(--spacing-xs)'
                                            }}>
                                                {booking.customerName}
                                            </h4>

                                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                                                <div className="mb-xs">
                                                    <strong>Layanan:</strong> {service?.name || '-'}
                                                    {service && ` (${formatDuration(service.durationMinutes)})`}
                                                </div>
                                                <div className="mb-xs">
                                                    <strong>Terapis:</strong> {therapist?.name || '-'}
                                                </div>
                                                {service && (
                                                    <div className="mb-xs">
                                                        <strong>Harga:</strong> <span style={{ color: 'var(--color-primary-light)', fontWeight: 600 }}>
                                                            {formatCurrency(service.price)}
                                                        </span>
                                                    </div>
                                                )}
                                                {booking.notes && (
                                                    <div style={{ marginTop: 'var(--spacing-sm)', fontStyle: 'italic' }}>
                                                        "{booking.notes}"
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-sm">
                                            <Button
                                                style={{ background: '#4b5563', color: 'white' }}
                                                size="sm"
                                                onClick={(e) => { e.stopPropagation(); handlePrintReceipt(booking); }}
                                            >
                                                🖨️ Cetak Struk
                                            </Button>
                                            {booking.status === 'confirmed' && (
                                                <>
                                                    
                                                    {hasPermission('delete_scheduling') && (
                                                        <Button
                                                            variant="danger"
                                                            size="sm"
                                                            onClick={(e) => { e.stopPropagation(); handleCancelBooking(booking.id); }}
                                                            style={{ marginTop: 6 }}
                                                        >
                                                            Batal Booking
                                                        </Button>
                                                    )}
                                                </>
                                            )}
                                            {/* Supervisor controls for starting/finishing service and viewing remaining time */}
                                            {booking.status === 'confirmed' && hasPermission('edit_scheduling') && (
                                                <Button
                                                    variant="primary"
                                                    size="sm"
                                                    onClick={(e) => { e.stopPropagation(); startService(booking.id); }}
                                                >
                                                    ▶️ Mulai Service
                                                </Button>
                                            )}
                                            {booking.status === 'in-service' && hasPermission('edit_scheduling') && (
                                                <>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                                                        Sisa waktu: {getServiceRemainingMinutes(booking)} menit
                                                    </div>
                                                    <Button
                                                        variant="success"
                                                        size="sm"
                                                        onClick={(e) => { e.stopPropagation(); finishService(booking.id); }}
                                                    >
                                                        ⏹️ Selesai Service
                                                    </Button>
                                                </>
                                            )}
                                            {hasPermission('delete_scheduling') && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(booking.id); }}
                                                >
                                                    Hapus
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Card>


            {hasPermission('view_finance') && (
            <Card glass className="mt-lg">
                <h3 className="heading-3 mb-md">Pembukuan</h3>
                {pembukuan.length === 0 ? (
                    <div style={{ padding: 12, color: 'var(--color-text-muted)' }}>Belum ada pembukuan.</div>
                ) : (
                    <div className="grid gap-md">
                        {pembukuan.map(p => {
                            const bookedServices = services.filter(s => (p.serviceIds || []).includes(s.id));
                            const serviceNames = bookedServices.map(s => s.name).join(' + ');
                            return (
                            <div key={p.id} className="card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 700 }}>{p.therapistName}</div>
                                        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>{p.minutes} menit • Rp {p.amount.toLocaleString('id-ID')}</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {serviceNames}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Diterima: {new Date(p.paidAt).toLocaleString()}</div>
                                    </div>
                                    {p.receipt && (
                                        <div style={{ width: 120, height: 80, overflow: 'hidden', borderRadius: 6 }}>
                                            <img src={p.receipt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="bukti" />
                                        </div>
                                    )}
                                </div>
                            </div>
                            );
                        })}
                    </div>
                )}
            </Card>
            )}

            {/* Add Booking Modal */}
            <Modal
                isOpen={showModal}
                onClose={resetForm}
                title="Booking Baru"
            >
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-md">
                            <div className="grid grid-cols-2 gap-sm">
                                <div style={{ position: 'relative' }}>
                                    <label className="label">Nama Customer *</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.customerName}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setFormData({ ...formData, customerName: val });
                                            setShowCustomerSuggestions(true);
                                        }}
                                        onFocus={() => setShowCustomerSuggestions(true)}
                                        onBlur={() => {
                                            setTimeout(() => setShowCustomerSuggestions(false), 200);
                                        }}
                                        required
                                        placeholder="Cari atau ketik nama"
                                        autoComplete="off"
                                    />
                                    {showCustomerSuggestions && filteredCustomerSuggestions.length > 0 && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '100%',
                                            left: 0,
                                            right: 0,
                                            background: '#1e293b',
                                            border: '1px solid var(--color-border)',
                                            borderRadius: '8px',
                                            maxHeight: '180px',
                                            overflowY: 'auto',
                                            zIndex: 1000,
                                            marginTop: '4px',
                                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
                                        }}>
                                            {filteredCustomerSuggestions.map(cust => (
                                                <div
                                                    key={cust.id}
                                                    onMouseDown={() => {
                                                        setFormData({
                                                            ...formData,
                                                            customerName: cust.name,
                                                            customerPhone: cust.phone || '',
                                                            address: cust.address || '',
                                                            notes: cust.notes || ''
                                                        });
                                                        setShowCustomerSuggestions(false);
                                                    }}
                                                    style={{
                                                        padding: '10px 12px',
                                                        cursor: 'pointer',
                                                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '2px'
                                                    }}
                                                >
                                                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#fff' }}>{cust.name}</span>
                                                    {(cust.phone || cust.address) && (
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                                                            {cust.phone ? `📞 ${cust.phone}` : ''} {cust.address ? `📍 ${cust.address}` : ''}
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="label">No. Telepon / HP</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.customerPhone || ''}
                                        onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                                        placeholder="Contoh: 08123456789"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="label">Gender *</label>
                                <select
                                    className="select"
                                    value={formData.gender}
                                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                    required
                                >
                                    <option value="">-- Pilih --</option>
                                    <option value="Pria">Pria</option>
                                    <option value="Wanita">Wanita</option>
                                    <option value="Couple">Couple</option>
                                </select>
                            </div>

                            <div>
                                <label className="label">Alamat Lengkap</label>
                                <textarea
                                    className="input"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    rows="2"
                                    placeholder="Alamat customer"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-sm mb-sm">
                                <div>
                                    <label className="label">Transport (Rp)</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.transport}
                                        onChange={(e) => {
                                            let val = e.target.value.replace(/[^0-9]/g, '');
                                            if (val) {
                                                val = parseInt(val, 10).toLocaleString('id-ID');
                                            }
                                            setFormData({ ...formData, transport: val });
                                        }}
                                        placeholder="Misal: 50.000"
                                    />
                                </div>
                                <div>
                                    <label className="label">Extra Transport (Rp)</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.extraTransport}
                                        onChange={(e) => {
                                            let val = e.target.value.replace(/[^0-9]/g, '');
                                            if (val) {
                                                val = parseInt(val, 10).toLocaleString('id-ID');
                                            }
                                            setFormData({ ...formData, extraTransport: val });
                                        }}
                                        placeholder="Misal: 50.000"
                                    />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-sm mb-sm">
                                <div>
                                    <label className="label">Extra Charge (Rp)</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.extraCharge}
                                        onChange={(e) => {
                                            let val = e.target.value.replace(/[^0-9]/g, '');
                                            if (val) {
                                                val = parseInt(val, 10).toLocaleString('id-ID');
                                            }
                                            setFormData({ ...formData, extraCharge: val });
                                        }}
                                        placeholder="Misal: 20.000"
                                    />
                                </div>
                                <div>
                                    <label className="label">Payment Method *</label>
                                    <select
                                        className="select"
                                        value={formData.paymentMethod}
                                        onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                                        required
                                    >
                                        <option value="">-- Pilih --</option>
                                        <option value="Transfer">Transfer</option>
                                        <option value="QRIS">QRIS</option>
                                        <option value="Tunai">Tunai</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="label">Paket Layanan (Pilih lebih dari 1) *</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto', background: 'var(--color-bg-secondary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                                    {services.filter(s => s.category !== 'Extra Package').map(service => (
                                        <label key={service.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                            <input 
                                                type="checkbox" 
                                                checked={(formData.serviceIds || []).includes(service.id)}
                                                onChange={(e) => {
                                                    const checked = e.target.checked;
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        serviceIds: checked 
                                                            ? [...(prev.serviceIds || []), service.id]
                                                            : (prev.serviceIds || []).filter(id => id !== service.id)
                                                    }));
                                                }}
                                            />
                                            <span style={{ fontSize: '0.9rem' }}>{service.name} - {formatCurrency(service.price)} ({formatDuration(service.durationMinutes)})</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {services.some(s => s.category === 'Extra Package') && (
                                <div>
                                    <label className="label">Tambahan Extra Package</label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto', background: 'var(--color-bg-secondary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                                        {services.filter(s => s.category === 'Extra Package').map(service => (
                                            <label key={service.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={(formData.serviceIds || []).includes(service.id)}
                                                    onChange={(e) => {
                                                        const checked = e.target.checked;
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            serviceIds: checked 
                                                                ? [...(prev.serviceIds || []), service.id]
                                                                : (prev.serviceIds || []).filter(id => id !== service.id)
                                                        }));
                                                    }}
                                                />
                                                <span style={{ fontSize: '0.9rem' }}>{service.name} - {formatCurrency(service.price)} ({formatDuration(service.durationMinutes)})</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-sm">
                                <div>
                                    <label className="label">Total Harga</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formatCurrency(finalPrice)}
                                        readOnly
                                        style={{ background: 'var(--color-bg)', color: '#10b981', fontWeight: 'bold' }}
                                    />
                                </div>
                                <div>
                                    <label className="label">Durasi Paket (Opsional)</label>
                                    <select
                                        className="select"
                                        value={formData.customDuration}
                                        onChange={(e) => setFormData({ ...formData, customDuration: e.target.value })}
                                    >
                                        <option value="">Auto ({calculatedDuration} mnt)</option>
                                        <option value="60">60 Menit</option>
                                        <option value="90">90 Menit</option>
                                        <option value="120">120 Menit</option>
                                        <option value="150">150 Menit</option>
                                        <option value="180">180 Menit</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-sm">
                                <div>
                                    <label className="label">Keluhan Sakit</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.complaint}
                                        onChange={(e) => setFormData({ ...formData, complaint: e.target.value })}
                                        placeholder="Misal: Pegal bahu"
                                    />
                                </div>
                                <div>
                                    <label className="label">Tekanan</label>
                                    <select
                                        className="select"
                                        value={formData.pressure}
                                        onChange={(e) => setFormData({ ...formData, pressure: e.target.value })}
                                    >
                                        <option value="">-- Pilih --</option>
                                        <option value="Soft">Soft</option>
                                        <option value="Medium">Medium</option>
                                        <option value="Strong">Strong</option>
                                    </select>
                                </div>
                            </div>

                        <div className="grid grid-cols-2 gap-md">
                            <div>
                                <label className="label">Tanggal *</label>
                                <input
                                    type="date"
                                    className="input"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="label">Jam *</label>
                                <select
                                    className="select"
                                    value={formData.time}
                                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                    required
                                >
                                    {timeSlots.map(time => (
                                        <option key={time} value={time}>{time}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="label">Terapis *</label>
                            <select
                                className="select"
                                value={formData.therapistId}
                                onChange={(e) => setFormData({ ...formData, therapistId: e.target.value })}
                                required
                            >
                                <option value="">-- Pilih Terapis --</option>
                                {branchTherapists.map(therapist => {
                                    const isOffDuty = getTherapistStatus(therapist.id, formData.date)?.status === 'off-duty';
                                    const hour = parseInt(formData.time.split(':')[0], 10);
                                    const isOutsideRoster = hour >= 22 || hour < 7;
                                    const isDisabled = isOffDuty && !isOutsideRoster;

                                    return (
                                        <option key={therapist.id} value={therapist.id} disabled={isDisabled}>
                                            {therapist.name} {isDisabled ? '(Off Duty - Hanya bisa dibooking 22:00 - 06:59)' : `(${therapist.specialization})`}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>

                        <div>
                            <label className="label">Catatan</label>
                            <textarea
                                className="input"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                rows="2"
                                placeholder="Catatan tambahan..."
                                style={{ resize: 'vertical' }}
                            />
                        </div>

                        <div className="flex gap-md justify-end">
                            <Button type="button" variant="secondary" onClick={resetForm}>
                                Batal
                            </Button>
                            <Button type="submit" variant="success">
                                Simpan Booking
                            </Button>
                        </div>
                    </div>
                </form>
            </Modal>
            {isMultiDeleteActive && selectedBookingIds.length > 0 && (
                <div style={{
                    position: 'fixed',
                    bottom: 'calc(var(--bottom-nav-height, 60px) + 20px)',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 1000,
                    background: 'rgba(30, 41, 59, 0.85)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '16px',
                    padding: '12px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
                }}>
                    <span style={{ color: '#f8fafc', fontWeight: 600, fontSize: '0.9rem' }}>
                        {selectedBookingIds.length} Booking terpilih
                    </span>
                    <Button 
                        variant="danger" 
                        size="sm"
                        onClick={handleBulkDelete}
                    >
                        🗑️ Hapus Terpilih
                    </Button>
                    <Button 
                        variant="secondary" 
                        size="sm"
                        onClick={() => setSelectedBookingIds([])}
                    >
                        Batal
                    </Button>
                </div>
            )}
        </div>
    );
}
