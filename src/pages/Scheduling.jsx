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
        // supervisor / timing
        setTherapistStatus,
        getTherapistStatus,
        startService,
        finishService,
        getServiceRemainingMinutes,
        getDailyServiceTotals
    } = useAppContext();
    const [supervisorMode, setSupervisorMode] = useState(false);
    const [now, setNow] = useState(new Date());
    const [remainingSecondsMap, setRemainingSecondsMap] = useState({});
    const [selectedSlotKeys, setSelectedSlotKeys] = useState({});
    const [totalSecondsMap, setTotalSecondsMap] = useState({});
    const [manualCompletedMinutes, setManualCompletedMinutes] = useState(() => {
        try { return JSON.parse(localStorage.getItem('spacity_manual_completed_minutes') || '{}'); } catch(e) { return {}; }
    });
    const [rekaps, setRekaps] = useState(() => {
        try { return JSON.parse(localStorage.getItem('spacity_rekaps') || '[]'); } catch (e) { return []; }
    });
    const [pembukuan, setPembukuan] = useState(() => {
        try { return JSON.parse(localStorage.getItem('spacity_pembukuan') || '[]'); } catch (e) { return []; }
    });
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [previewRekapId, setPreviewRekapId] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState(getToday());
    const [formData, setFormData] = useState({
        serviceId: '',
        therapistId: '',
        customerName: '',
        date: getToday(),
        time: '09:00',
        status: 'confirmed',
        notes: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        addBooking(formData);
        resetForm();
    };

    const resetForm = () => {
        setFormData({
            serviceId: '',
            therapistId: '',
            customerName: '',
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
        const service = services.find(s => s.id === booking.serviceId);
        const therapist = therapists.find(t => t.id === booking.therapistId);
        if (service && therapist && selectedBranch) {
            exportReceipt(booking, service, therapist, selectedBranch);
        }
    };

    // Filter bookings by selected date (exclude canceled)
    const dateBookings = branchBookings
        .filter(b => b.date === selectedDate && b.status !== 'canceled')
        .sort((a, b) => a.time.localeCompare(b.time));

    // Generate time slots from 08:00 to 24:00 (30-minute slots)
    const startHour = 8;
    const endHour = 24; // include 24:00 as last boundary
    const timeSlots = [];
    for (let hour = startHour; hour < endHour; hour++) {
        timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
        timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    // final boundary
    timeSlots.push(`${endHour.toString().padStart(2, '0')}:00`);

    // Use 30-minute slots for schedule table
    const slotLengthMinutes = 30;
    const slots = [...timeSlots];
    const tableMinWidth = Math.max(900, slots.length * 72);

    // Per-slot overrides stored locally: { "therapistId|date|slot": status }
    const [slotStatuses, setSlotStatuses] = useState(() => {
        try {
            const raw = localStorage.getItem('spacity_slot_statuses');
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    });
    const [bookingSlotPrevStatus, setBookingSlotPrevStatus] = useState({});

    useEffect(() => {
        try {
            localStorage.setItem('spacity_slot_statuses', JSON.stringify(slotStatuses));
        } catch (e) {}
    }, [slotStatuses]);

    useEffect(() => {
        try { localStorage.setItem('spacity_rekaps', JSON.stringify(rekaps)); } catch (e) {}
    }, [rekaps]);

    useEffect(() => {
        try { localStorage.setItem('spacity_pembukuan', JSON.stringify(pembukuan)); } catch (e) {}
    }, [pembukuan]);

    const slotKey = (therapistId, date, slot) => `${therapistId}|${date}|${slot}`;

    const cycleStatus = (current) => {
        const order = ['on-duty', 'service', 'off-duty'];
        const idx = order.indexOf(current);
        return order[(idx + 1) % order.length];
    };

    const toggleSlotStatus = (therapistId, date, slot) => {
        const key = slotKey(therapistId, date, slot);
        // determine effective status: slot override wins, otherwise check therapist/bookings
        const override = slotStatuses[key];
        if (override === 'completed') return; // do not change done
        if (override === 'book') return; // booked slots only removable via cancel
        const slotStart = parseTimeToMinutes(slot);
        const slotEnd = slotStart + slotLengthMinutes;
        const tStatus = getTherapistStatus(therapistId, date)?.status || null;
        let effective = override || 'on-duty';
        if (!override) {
            if (tStatus === 'off-duty') effective = 'off-duty';
            const therapistBookings = branchBookings.filter(b => b.therapistId === therapistId && b.date === date);
            for (const b of therapistBookings) {
                const svc = services.find(s => s.id === b.serviceId);
                const duration = svc ? svc.durationMinutes : 60;
                const bStart = parseTimeToMinutes(b.time);
                const bEnd = bStart + duration;
                if (bStart < slotEnd && bEnd > slotStart) {
                    effective = (b.status === 'completed') ? 'completed' : 'service';
                    break;
                }
            }
        }
        // do not allow changing if effective status is completed or there is an active in-service booking overlapping
        if (effective === 'completed') return;
        // if any overlapping booking is currently in-service, block changes
        const overlappingInService = branchBookings.some(b => {
            if (b.therapistId !== therapistId || b.date !== date) return false;
            if (b.status !== 'in-service') return false;
            const svc = services.find(s => s.id === b.serviceId);
            const duration = svc ? svc.durationMinutes : 60;
            const bStart = parseTimeToMinutes(b.time);
            const bEnd = bStart + duration;
            return (bStart < slotEnd && bEnd > slotStart);
        });
        if (overlappingInService) return;
        const current = slotStatuses[key] || 'on-duty';
        const next = cycleStatus(current);
        setSlotStatuses({ ...slotStatuses, [key]: next });
    };

    const toggleSelectedSlot = (therapistId, date, slot) => {
        const key = slotKey(therapistId, date, slot);
        setSelectedSlotKeys(prev => {
            const next = { ...prev };
            if (next[key]) delete next[key];
            else next[key] = true;
            try { localStorage.setItem('spacity_selected_slots', JSON.stringify(next)); } catch (e) {}
            return next;
        });
    };

    const startServiceForSelected = (therapistId) => {
        // gather selected keys for this therapist
        let keys = Object.keys(selectedSlotKeys).filter(k => k.startsWith(`${therapistId}|`));
        // fallback: read persisted selection from localStorage (helps when state hasn't flushed yet)
        if (keys.length === 0) {
            try {
                const raw = JSON.parse(localStorage.getItem('spacity_selected_slots') || '{}');
                keys = Object.keys(raw).filter(k => k.startsWith(`${therapistId}|`));
            } catch (e) { keys = []; }
        }
        // Start only works when there are selected slots
        if (keys.length === 0) return;

        // validate selected slots are contiguous and each is 'service' or 'book'
        const indices = keys.map(k => {
            const parts = k.split('|');
            const slot = parts[2];
            return slots.indexOf(slot);
        }).sort((a,b)=>a-b);
        // contiguous check
        for (let i = 1; i < indices.length; i++) {
            if (indices[i] !== indices[i-1] + 1) return; // not contiguous
        }

        // validate statuses
        for (const k of keys) {
            const parts = k.split('|');
            const slot = parts[2];
            const eff = getStatusForTherapistAtSlot(therapistId, selectedDate, slot);
            if (!(eff === 'service' || eff === 'book')) return; // only allow when service/book
        }

        // ensure therapist doesn't already have an in-service booking
        const alreadyInService = branchBookings.some(b => b.therapistId === therapistId && b.date === selectedDate && b.status === 'in-service');
        if (alreadyInService) return;

        // set selected slots to 'service'
        const nextStatuses = { ...slotStatuses };
        keys.forEach(k => { nextStatuses[k] = 'service'; });
        setSlotStatuses(nextStatuses);
        // start any overlapping bookings for these slots
        const keysSet = new Set(keys);
        // only start bookings whose all slots are included in selection
        const bookingIdsToStart = new Set();
        branchBookings.forEach(b => {
            if (b.therapistId !== therapistId || b.date !== selectedDate) return;
            const svc = services.find(s => s.id === b.serviceId);
            const duration = svc ? svc.durationMinutes : 60;
            const start = parseTimeToMinutes(b.time);
            const slotCount = Math.max(1, Math.ceil(duration / slotLengthMinutes));
            const bookingSlotKeys = [];
            for (let i = 0; i < slotCount; i++) {
                const hh = Math.floor((start + i * slotLengthMinutes) / 60).toString().padStart(2, '0');
                const mm = ((start + i * slotLengthMinutes) % 60).toString().padStart(2, '0');
                bookingSlotKeys.push(slotKey(b.therapistId, b.date, `${hh}:${mm}`));
            }
            const allSelected = bookingSlotKeys.every(k => keysSet.has(k));
            if (allSelected) bookingIdsToStart.add(b.id);
        });
        console.log('Scheduling.startServiceForSelected bookingIdsToStart=', Array.from(bookingIdsToStart));
        bookingIdsToStart.forEach(id => {
            try { startService(id); console.log('Started booking', id); } catch (err) { console.error('Error starting booking', id, err); }
        });
        // set remaining seconds based on number of selected slots
        const totalSeconds = keys.length * slotLengthMinutes * 60;
        setRemainingSecondsMap(prev => ({ ...prev, [therapistId]: totalSeconds }));
        setTotalSecondsMap(prev => ({ ...prev, [therapistId]: totalSeconds }));
    };

    const stopServiceForSelected = (therapistId) => {
        let keys = Object.keys(selectedSlotKeys).filter(k => k.startsWith(`${therapistId}|`));
        // if nothing explicitly selected, use slots already marked as 'service'
        if (keys.length === 0) {
            keys = Object.keys(slotStatuses).filter(k => k.startsWith(`${therapistId}|${selectedDate}|`) && slotStatuses[k] === 'service');
        }
        // fallback: if none selected, stop current in-service booking for therapist
        if (keys.length === 0) {
            const b = branchBookings.find(bk => bk.therapistId === therapistId && bk.date === selectedDate && bk.status === 'in-service');
            if (b) {
                const svc = services.find(s => s.id === b.serviceId);
                const duration = svc ? svc.durationMinutes : 60;
                const startMin = parseTimeToMinutes(b.time);
                const slotCount = Math.max(1, Math.ceil(duration / slotLengthMinutes));
                keys = [];
                for (let i=0;i<slotCount;i++) {
                    const hh = Math.floor((startMin + i*slotLengthMinutes)/60).toString().padStart(2,'0');
                    const mm = ((startMin + i*slotLengthMinutes)%60).toString().padStart(2,'0');
                    keys.push(`${therapistId}|${selectedDate}|${hh}:${mm}`);
                }
            }
        }
        if (keys.length === 0) return;
        const nextStatuses = { ...slotStatuses };
        keys.forEach(k => { nextStatuses[k] = 'completed'; });
        setSlotStatuses(nextStatuses);
        setRemainingSecondsMap(prev => ({ ...prev, [therapistId]: 0 }));
        setTotalSecondsMap(prev => ({ ...prev, [therapistId]: 0 }));
        // clear selection for these keys
        setSelectedSlotKeys(prev => {
            const next = { ...prev };
            keys.forEach(k => delete next[k]);
            try { localStorage.setItem('spacity_selected_slots', JSON.stringify(next)); } catch (e) {}
            return next;
        });
        // finish any overlapping bookings for these slots
        const keysSet = new Set(keys);
        const bookingIdsToFinish = new Set();
        branchBookings.forEach(b => {
            if (b.therapistId !== therapistId || b.date !== selectedDate) return;
            const svc = services.find(s => s.id === b.serviceId);
            const duration = svc ? svc.durationMinutes : 60;
            const start = parseTimeToMinutes(b.time);
            const slotCount = Math.max(1, Math.ceil(duration / slotLengthMinutes));
            const bookingSlotKeys = [];
            for (let i = 0; i < slotCount; i++) {
                const hh = Math.floor((start + i * slotLengthMinutes) / 60).toString().padStart(2, '0');
                const mm = ((start + i * slotLengthMinutes) % 60).toString().padStart(2, '0');
                bookingSlotKeys.push(slotKey(b.therapistId, b.date, `${hh}:${mm}`));
            }
            const allSelected = bookingSlotKeys.every(k => keysSet.has(k));
            if (allSelected) bookingIdsToFinish.add(b.id);
        });
        console.log('Scheduling.stopServiceForSelected bookingIdsToFinish=', Array.from(bookingIdsToFinish));
        bookingIdsToFinish.forEach(id => {
            try { finishService(id); console.log('Finished booking', id); } catch (err) { console.error('Error finishing booking', id, err); }
        });
        // create rekap entry for completed slots
        try {
            const therapist = therapists.find(x => x.id === therapistId);
            const minutes = keys.length * slotLengthMinutes;
            // compute amount based on overlapping bookings (pro-rate if partial)
            let amount = 0;
            branchBookings.forEach(b => {
                if (b.therapistId !== therapistId || b.date !== selectedDate) return;
                const svc = services.find(s => s.id === b.serviceId);
                const duration = svc ? svc.durationMinutes : 60;
                const start = parseTimeToMinutes(b.time);
                const slotCount = Math.max(1, Math.ceil(duration / slotLengthMinutes));
                const bookingSlotKeys = [];
                for (let i = 0; i < slotCount; i++) {
                    const hh = Math.floor((start + i * slotLengthMinutes) / 60).toString().padStart(2, '0');
                    const mm = ((start + i * slotLengthMinutes) % 60).toString().padStart(2, '0');
                    bookingSlotKeys.push(slotKey(b.therapistId, b.date, `${hh}:${mm}`));
                }
                const overlapCount = bookingSlotKeys.filter(k => keysSet.has(k)).length;
                if (overlapCount > 0 && svc) {
                    const portion = overlapCount / bookingSlotKeys.length;
                    amount += Math.round((svc.price || 0) * portion);
                }
            });
            // if no bookings overlapped, amount stays 0
            const rekap = {
                id: `rk-${Date.now()}`,
                therapistId: therapistId,
                therapistName: therapist?.name || '',
                minutes,
                amount,
                status: 'unpaid',
                createdAt: new Date().toISOString()
            };
            setRekaps(prev => [rekap, ...prev]);
        } catch (e) { console.error('rekap create error', e); }
        // add manual completed minutes
        const addMinutes = keys.length * slotLengthMinutes;
        const mKey = `${therapistId}|${selectedDate}`;
        const nextManual = { ...manualCompletedMinutes };
        nextManual[mKey] = (nextManual[mKey] || 0) + addMinutes;
        setManualCompletedMinutes(nextManual);
        try { localStorage.setItem('spacity_manual_completed_minutes', JSON.stringify(nextManual)); } catch (e) {}
    };

    const parseTimeToMinutes = (timeStr) => {
        const [hh, mm] = timeStr.split(':').map(Number);
        return hh * 60 + (mm || 0);
    };

    const getStatusForTherapistAtSlot = (therapistId, date, slotTime) => {
        // slot-level override wins
        const key = slotKey(therapistId, date, slotTime);
        if (slotStatuses[key]) return slotStatuses[key];

        const tStatus = getTherapistStatus(therapistId, date)?.status || null;
        if (tStatus === 'off-duty') return 'off-duty';

        const slotStart = parseTimeToMinutes(slotTime);
        const slotEnd = slotStart + slotLengthMinutes;

        const therapistBookings = branchBookings.filter(b => b.therapistId === therapistId && b.date === date);
        for (const b of therapistBookings) {
            const svc = services.find(s => s.id === b.serviceId);
            const duration = svc ? svc.durationMinutes : 60;
            const bStart = parseTimeToMinutes(b.time);
            const bEnd = bStart + duration;
            if (bStart < slotEnd && bEnd > slotStart) {
                return (b.status === 'completed') ? 'completed' : 'service';
            }
        }

        // If therapist marked in-service, only treat slots as 'service'
        // when there is an actual in-service booking that overlaps this slot.
        if (tStatus === 'in-service') {
            const hasInServiceOverlap = branchBookings.some(b => {
                if (b.therapistId !== therapistId || b.date !== date) return false;
                if (b.status !== 'in-service') return false;
                const svc = services.find(s => s.id === b.serviceId);
                const duration = svc ? svc.durationMinutes : 60;
                const bStart = parseTimeToMinutes(b.time);
                const bEnd = bStart + duration;
                return (bStart < slotEnd && bEnd > slotStart);
            });
            if (hasInServiceOverlap) return 'service';
        }
        return 'on-duty';
    };

    // Live clock and countdown updater
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        // keep slot 'book' overlays in sync with bookings for selectedDate
        const activeBookings = branchBookings.filter(b => b.date === selectedDate && (b.status === 'confirmed' || b.status === 'in-service'));
        const activeIds = new Set(activeBookings.map(b => b.id));
        const nextPrev = { ...bookingSlotPrevStatus };
        const nextStatuses = { ...slotStatuses };

        // add book overlays for newly added bookings
        activeBookings.forEach(b => {
            if (nextPrev[b.id]) return; // already handled
            nextPrev[b.id] = {};
            const svc = services.find(s => s.id === b.serviceId);
            const duration = svc ? svc.durationMinutes : 60;
            const start = parseTimeToMinutes(b.time);
            const slotCount = Math.max(1, Math.ceil(duration / slotLengthMinutes));
            for (let i = 0; i < slotCount; i++) {
                const hh = Math.floor((start + i * slotLengthMinutes) / 60).toString().padStart(2, '0');
                const mm = ((start + i * slotLengthMinutes) % 60).toString().padStart(2, '0');
                const key = slotKey(b.therapistId, b.date, `${hh}:${mm}`);
                nextPrev[b.id][key] = slotStatuses[key] ?? null;
                // set visual: 'service' when in-service, otherwise 'book' for confirmed
                nextStatuses[key] = b.status === 'in-service' ? 'service' : 'book';
            }
        });

        // remove overlays for bookings that are gone/canceled
        Object.keys(bookingSlotPrevStatus).forEach(id => {
            if (activeIds.has(id)) return;
            const map = bookingSlotPrevStatus[id] || {};
            // find booking record to check final status
            const origBooking = branchBookings.find(bb => bb.id === id);
            const becameCompleted = origBooking && origBooking.status === 'completed';
            // for each slot, restore previous only if no other active booking covers it
            Object.keys(map).forEach(key => {
                // parse key to get therapistId and slot
                const parts = key.split('|');
                const tId = parts[0];
                const date = parts[1];
                const slot = parts[2];
                // check other active bookings
                let overlapped = false;
                activeBookings.forEach(b => {
                    if (b.therapistId !== tId || b.date !== date) return;
                    const svc = services.find(s => s.id === b.serviceId);
                    const duration = svc ? svc.durationMinutes : 60;
                    const start = parseTimeToMinutes(b.time);
                    const slotCount = Math.max(1, Math.ceil(duration / slotLengthMinutes));
                    for (let i = 0; i < slotCount; i++) {
                        const hh = Math.floor((start + i * slotLengthMinutes) / 60).toString().padStart(2, '0');
                        const mm = ((start + i * slotLengthMinutes) % 60).toString().padStart(2, '0');
                        const k = slotKey(b.therapistId, b.date, `${hh}:${mm}`);
                        if (k === key) overlapped = true;
                    }
                });
                if (!overlapped) {
                    if (becameCompleted) {
                        nextStatuses[key] = 'completed';
                    } else {
                        const prev = map[key];
                        if (prev === null) delete nextStatuses[key];
                        else nextStatuses[key] = prev;
                    }
                }
            });
            delete nextPrev[id];
        });

        // apply
        setBookingSlotPrevStatus(nextPrev);
        setSlotStatuses(nextStatuses);

        // Update remaining seconds map for therapists with active service
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
                map[t.id] = remainingSecondsMap[t.id] || 0;
                totals[t.id] = totalSecondsMap[t.id] || 0;
            }
        });
        setRemainingSecondsMap(prev => ({ ...map, ...prev }));
        setTotalSecondsMap(prev => ({ ...totals, ...prev }));
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
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <label className="label" style={{ margin: 0 }}>Supervisor</label>
                        <input type="checkbox" checked={supervisorMode} onChange={(e) => setSupervisorMode(e.target.checked)} />
                    </div>
                </div>
                <input
                    type="date"
                    className="input"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    style={{ maxWidth: '300px' }}
                />
                <div style={{ marginTop: 8 }}>
                    <Button onClick={() => setShowModal(true)}>+ Booking Baru</Button>
                </div>
            </Card>

            {/* Hourly schedule table */}
            <Card glass className="mb-lg">
                <h3 className="heading-3 mb-md">Schedule per Slot (30 menit) - {formatDate(selectedDate, 'medium')}</h3>
                <div style={{ background: '#ffffff', padding: 8, borderRadius: 8, border: '1px solid rgba(0,0,0,0.06)', display: 'inline-flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div style={{ width: 16, height: 16, background: '#c7e6ff', borderRadius: 4, border: '1px solid rgba(0,0,0,0.06)' }} />
                        <div style={{ fontSize: '0.9rem', color: '#0f172a' }}>On Duty</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div style={{ width: 16, height: 16, background: '#fddb9a', borderRadius: 4, border: '1px solid rgba(0,0,0,0.06)' }} />
                        <div style={{ fontSize: '0.9rem', color: '#0f172a' }}>Service</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div style={{ width: 16, height: 16, background: '#c7f0d3', borderRadius: 4, border: '1px solid rgba(0,0,0,0.06)' }} />
                        <div style={{ fontSize: '0.9rem', color: '#0f172a' }}>Completed</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div style={{ width: 16, height: 16, background: '#f5c2c2', borderRadius: 4, border: '1px solid rgba(0,0,0,0.06)' }} />
                        <div style={{ fontSize: '0.9rem', color: '#0f172a' }}>Off Duty</div>
                    </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table className="table" style={{ minWidth: tableMinWidth, borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left', padding: '8px', minWidth: '220px' }}>Terapis</th>
                                <th style={{ textAlign: 'center', padding: '8px', minWidth: '80px' }}>Total</th>
                                {slots.map(slot => (
                                    <th key={slot} style={{ padding: '8px', textAlign: 'center' }}>{slot}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {therapists.map(t => (
                                <tr key={t.id}>
                                    <td style={{ padding: '8px', borderTop: '1px solid var(--color-border)', verticalAlign: 'top' }}>
                                        <div style={{ fontWeight: 600 }}>{t.name}</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{t.specialization}</div>
                                        {/* Remaining time for active service */}
                                        {(() => {
                                            const remSec = remainingSecondsMap[t.id] || 0;
                                            const totalSec = totalSecondsMap[t.id] || 0;
                                            const pct = totalSec > 0 ? Math.round((remSec / totalSec) * 100) : 0;
                                            const pad = (s) => { const m = Math.floor(s / 60); const sec = s % 60; return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`; };
                                            return (
                                                <div style={{ marginTop: 6, fontSize: '0.85rem', color: '#0f172a' }}>
                                                    {totalSec > 0 ? (
                                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                            <div style={{ height: 10, width: 160, background: '#e5e7eb', borderRadius: 6, overflow: 'hidden' }}>
                                                                <div style={{ height: '100%', width: `${pct}%`, background: '#10b981', transition: 'width 1s linear' }} />
                                                            </div>
                                                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{pad(remSec)}</div>
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: 'var(--color-text-secondary)' }}>No active service</span>
                                                    )}
                                                </div>
                                            );
                                        })()}

                                        {/* Start/Stop controls for selected slots */}
                                        <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                                                Selected: {Object.keys(selectedSlotKeys).filter(k => k.startsWith(`${t.id}|`)).length}
                                            </div>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button onClick={() => startServiceForSelected(t.id)} style={{ fontSize: '0.8rem', padding: '6px 8px', borderRadius: 6, background: '#0369a1', color: '#fff', border: 'none' }}>Start</button>
                                                <button onClick={() => stopServiceForSelected(t.id)} style={{ fontSize: '0.8rem', padding: '6px 8px', borderRadius: 6, background: '#ef4444', color: '#fff', border: 'none' }}>Stop</button>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Total services column */}
                                    <td style={{ padding: '8px', borderTop: '1px solid var(--color-border)', verticalAlign: 'middle', textAlign: 'center', minWidth: 100 }}>
                                        {(() => {
                                            const myBookings = branchBookings.filter(b => b.therapistId === t.id && b.date === selectedDate);
                                            const count = myBookings.length;
                                            const bookingMinutes = myBookings.reduce((s, b) => {
                                                const svc = services.find(x => x.id === b.serviceId);
                                                return s + (svc?.durationMinutes || 0);
                                            }, 0);
                                            const mKey = `${t.id}|${selectedDate}`;
                                            const manual = manualCompletedMinutes[mKey] || 0;
                                            const minutes = bookingMinutes + manual;
                                            return (
                                                <div>
                                                    <div style={{ fontWeight: 700 }}>{count}</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{minutes} menit</div>
                                                </div>
                                            );
                                        })()}
                                    </td>

                                    {slots.map(slot => {
                                        const status = getStatusForTherapistAtSlot(t.id, selectedDate, slot);
                                        // Darker backgrounds for better contrast, including 'book'
                                        const bg = status === 'off-duty' ? '#f5c2c2' : status === 'service' ? '#fddb9a' : status === 'completed' ? '#c7f0d3' : status === 'book' ? '#e0e7ff' : '#c7e6ff';
                                        const text = status === 'off-duty' ? 'Off Duty' : status === 'service' ? 'Service' : status === 'completed' ? 'Completed' : status === 'book' ? 'Booked' : 'Duty';
                                        const label = status === 'off-duty' ? 'OFF' : status === 'service' ? 'Service' : status === 'completed' ? 'Done' : status === 'book' ? 'Book' : 'Duty';
                                        const dotColor = status === 'off-duty' ? '#9b1c1c' : status === 'service' ? '#b45309' : status === 'completed' ? '#0b7a3d' : status === 'book' ? '#1e40af' : '#0369a1';

                                        // find booking overlapping this slot to display brief info
                                        const bookingForSlot = branchBookings.find(b => {
                                            if (b.therapistId !== t.id || b.date !== selectedDate) return false;
                                            const svc = services.find(s => s.id === b.serviceId);
                                            const duration = svc ? svc.durationMinutes : 60;
                                            const bStart = parseTimeToMinutes(b.time);
                                            const bEnd = bStart + duration;
                                            const sStart = parseTimeToMinutes(slot);
                                            const sEnd = sStart + slotLengthMinutes;
                                            return (bStart < sEnd && bEnd > sStart);
                                        });

                                        const key = slotKey(t.id, selectedDate, slot);
                                        const selected = !!selectedSlotKeys[key];
                                        return (
                                            <td key={slot} style={{ padding: '6px', textAlign: 'center', borderTop: '1px solid var(--color-border)' }}
                                                onClick={(e) => {
                                                        if (!supervisorMode) return;
                                                        if (e.ctrlKey || e.metaKey) {
                                                            toggleSelectedSlot(t.id, selectedDate, slot);
                                                        } else {
                                                            const eff = getStatusForTherapistAtSlot(t.id, selectedDate, slot);
                                                            if (eff === 'service' || eff === 'book') {
                                                                toggleSelectedSlot(t.id, selectedDate, slot);
                                                            } else {
                                                                toggleSlotStatus(t.id, selectedDate, slot);
                                                            }
                                                        }
                                                    }}
                                            >
                                                <div title={(supervisorMode ? 'Klik untuk pilih/ubah status' : '') + text} aria-label={text} style={{ background: bg, padding: '10px', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, width: 110, height: 90, boxSizing: 'border-box', justifyContent: 'center', color: '#0f172a', border: selected ? '2px solid #0369a1' : '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <span style={{ width: 10, height: 10, borderRadius: 6, background: dotColor, display: 'inline-block' }} />
                                                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: (status === 'service' || status === 'completed') ? '#000' : '#0f172a' }}>{label}</span>
                                                    </div>
                                                    {bookingForSlot && (
                                                        <div style={{ fontSize: '0.75rem', color: '#000', marginTop: 6, width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {services.find(s => s.id === bookingForSlot.serviceId)?.name || ''}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Bookings List */}
            <Card glass>
                <h3 className="heading-3 mb-md">
                    Booking untuk {formatDate(selectedDate, 'medium')}
                </h3>

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
                                    style={{ borderLeft: `4px solid var(--color-${booking.status === 'completed' ? 'success' : 'primary'})` }}
                                >
                                    <div className="flex justify-between items-start">
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
                                            {booking.status === 'completed' && (
                                                <Button
                                                    variant="primary"
                                                    size="sm"
                                                    onClick={() => handlePrintReceipt(booking)}
                                                >
                                                    🖨️ Cetak
                                                </Button>
                                            )}
                                            {booking.status === 'confirmed' && (
                                                <>
                                                    <Button
                                                        variant="success"
                                                        size="sm"
                                                        onClick={() => handleStatusChange(booking.id, 'completed')}
                                                    >
                                                        Selesai
                                                    </Button>
                                                    <Button
                                                        variant="danger"
                                                        size="sm"
                                                        onClick={() => handleCancelBooking(booking.id)}
                                                        style={{ marginTop: 6 }}
                                                    >
                                                        Batal Booking
                                                    </Button>
                                                </>
                                            )}
                                            {/* Supervisor controls for starting/finishing service and viewing remaining time */}
                                            {supervisorMode && booking.status === 'confirmed' && (
                                                <Button
                                                    variant="primary"
                                                    size="sm"
                                                    onClick={() => startService(booking.id)}
                                                >
                                                    ▶️ Mulai Service
                                                </Button>
                                            )}
                                            {supervisorMode && booking.status === 'in-service' && (
                                                <>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                                                        Sisa waktu: {getServiceRemainingMinutes(booking)} menit
                                                    </div>
                                                    <Button
                                                        variant="success"
                                                        size="sm"
                                                        onClick={() => finishService(booking.id)}
                                                    >
                                                        ⏹️ Selesai Service
                                                    </Button>
                                                </>
                                            )}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleDelete(booking.id)}
                                            >
                                                Hapus
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Card>

            {/* Supervisor therapist status panel */}
            {supervisorMode && (
                <Card glass className="mt-lg">
                    <h3 className="heading-3 mb-md">Supervisor - Pengaturan Terapis</h3>
                    <div className="grid gap-md">
                        {therapists.map(t => {
                            const status = getTherapistStatus(t.id, selectedDate)?.status || 'on-duty';
                            const totals = getDailyServiceTotals(selectedDate, t.id);
                            return (
                                <div key={t.id} className="card">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <strong>{t.name}</strong>
                                            <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>{t.specialization}</div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Total layanan hari ini: {totals.totalCount}</div>
                                        </div>

                                        <div className="flex items-center gap-sm">
                                            <select className="select" value={status} onChange={(e) => setTherapistStatus(t.id, e.target.value, selectedDate)}>
                                                <option value="on-duty">On Duty</option>
                                                <option value="off-duty">Off Duty</option>
                                                <option value="in-service">In Service</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            )}

            {/* Rekap & Pembukuan */}
            <Card glass className="mt-lg">
                <h3 className="heading-3 mb-md">Rekap Selesai (Belum Lunas)</h3>
                {rekaps.length === 0 ? (
                    <div style={{ padding: 12, color: 'var(--color-text-muted)' }}>Belum ada rekap.</div>
                ) : (
                    <div className="grid gap-md">
                        {rekaps.map(r => (
                            <div key={r.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 700 }}>{r.therapistName}</div>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>{r.minutes} menit • Rp {r.amount.toLocaleString('id-ID')}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Status: {r.status}</div>
                                </div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <input type="file" accept="image/*" id={`receipt-${r.id}`} style={{ display: 'none' }} onChange={async (e) => {
                                        const f = e.target.files && e.target.files[0];
                                        if (!f) return;
                                        const reader = new FileReader();
                                        reader.onload = () => {
                                            const dataUrl = reader.result;
                                            setPreviewImage(dataUrl);
                                            setPreviewRekapId(r.id);
                                            setPreviewModalOpen(true);
                                        };
                                        reader.readAsDataURL(f);
                                    }} />
                                    <label htmlFor={`receipt-${r.id}`} style={{ cursor: 'pointer' }}>
                                        <button style={{ padding: '6px 10px', borderRadius: 6, background: '#10b981', color: '#fff', border: 'none' }}>Mark Paid (Upload Bukti)</button>
                                    </label>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            <Modal isOpen={previewModalOpen} onClose={() => { setPreviewModalOpen(false); setPreviewImage(null); setPreviewRekapId(null); }}>
                <div style={{ padding: 12 }}>
                    <h3 className="heading-3">Konfirmasi Pembayaran</h3>
                    {previewImage && (
                        <div style={{ marginTop: 8 }}>
                            <div style={{ width: '100%', maxHeight: 360, overflow: 'hidden', borderRadius: 8 }}>
                                <img src={previewImage} alt="bukti" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            </div>
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
                        <button onClick={() => { setPreviewModalOpen(false); setPreviewImage(null); setPreviewRekapId(null); }} style={{ padding: '8px 12px', borderRadius: 6 }}>Batal</button>
                        <button onClick={() => {
                            if (!previewRekapId) return;
                            try {
                                setRekaps(prev => prev.map(x => x.id === previewRekapId ? { ...x, status: 'paid', paidAt: new Date().toISOString(), receipt: previewImage } : x));
                                const r = rekaps.find(x => x.id === previewRekapId);
                                const entry = { id: `pb-${Date.now()}`, rekapId: previewRekapId, therapistId: r?.therapistId, therapistName: r?.therapistName, minutes: r?.minutes, amount: r?.amount, paidAt: new Date().toISOString(), receipt: previewImage };
                                setPembukuan(prev => [entry, ...prev]);
                                setPreviewModalOpen(false);
                                setPreviewImage(null);
                                setPreviewRekapId(null);
                            } catch (e) { console.error(e); }
                        }} style={{ padding: '8px 12px', borderRadius: 6, background: '#10b981', color: '#fff', border: 'none' }}>Konfirmasi & Simpan</button>
                    </div>
                </div>
            </Modal>

            <Card glass className="mt-lg">
                <h3 className="heading-3 mb-md">Pembukuan</h3>
                {pembukuan.length === 0 ? (
                    <div style={{ padding: 12, color: 'var(--color-text-muted)' }}>Belum ada pembukuan.</div>
                ) : (
                    <div className="grid gap-md">
                        {pembukuan.map(p => (
                            <div key={p.id} className="card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 700 }}>{p.therapistName}</div>
                                        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>{p.minutes} menit • Rp {p.amount.toLocaleString('id-ID')}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Diterima: {new Date(p.paidAt).toLocaleString()}</div>
                                    </div>
                                    {p.receipt && (
                                        <div style={{ width: 120, height: 80, overflow: 'hidden', borderRadius: 6 }}>
                                            <img src={p.receipt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="bukti" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* Add Booking Modal */}
            <Modal
                isOpen={showModal}
                onClose={resetForm}
                title="Booking Baru"
            >
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-md">
                        <div>
                            <label className="label">Nama Customer *</label>
                            <input
                                type="text"
                                className="input"
                                value={formData.customerName}
                                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                                required
                                placeholder="Nama lengkap customer"
                            />
                        </div>

                        <div>
                            <label className="label">Layanan *</label>
                            <select
                                className="select"
                                value={formData.serviceId}
                                onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
                                required
                            >
                                <option value="">-- Pilih Layanan --</option>
                                {services.map(service => (
                                    <option key={service.id} value={service.id}>
                                        {service.name} - {formatCurrency(service.price)} ({formatDuration(service.durationMinutes)})
                                    </option>
                                ))}
                            </select>
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
                                {therapists.map(therapist => (
                                    <option key={therapist.id} value={therapist.id}>
                                        {therapist.name} ({therapist.specialization})
                                    </option>
                                ))}
                            </select>
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
        </div>
    );
}
