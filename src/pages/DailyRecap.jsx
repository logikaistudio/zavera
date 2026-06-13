import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import Card from '../components/common/Card';
import { StatCard } from '../components/common/Card';
import { formatCurrency, formatDate, getToday } from '../utils/formatters';
import Button from '../components/common/Button';
import ExportModal from '../components/common/ExportModal';
import Modal from '../components/common/Modal';
import { exportRevenueReport, generateTherapistPeriodSlipPDF } from '../utils/exportPDF';
import { exportRevenueToExcel } from '../utils/exportExcel';
import {
    calculateTotalRevenue,
    calculateTotalIncentives,
    calculateTherapistPerformance,
    calculateProfitSharing
} from '../utils/calculations';

export default function DailyRecap() {
    const { branchBookings, services, therapists, selectedBranch, rekaps } = useAppContext();
    
    // Sub-tab: 'branch' (Rekap Cabang) vs 'therapist' (Rekap Terapis)
    const [recapTab, setRecapTab] = useState('branch');

    // Page state for Rekap Cabang
    const [selectedDate, setSelectedDate] = useState(getToday());
    const [showExportModal, setShowExportModal] = useState(false);
    const [expandedTherapists, setExpandedTherapists] = useState(new Set());

    // Page state for Rekap Terapis
    const [periodType, setPeriodType] = useState('daily'); // 'daily', 'weekly', 'monthly'
    const [recapDate, setRecapDate] = useState(getToday());
    const [recapMonth, setRecapMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [overrides, setOverrides] = useState({});
    const [editingRecapItem, setEditingRecapItem] = useState(null); // { therapistId, wage, incentives, transport, bonus, deduction }
    const [showEditRecapModal, setShowEditRecapModal] = useState(false);
    const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
    const [selectedDetailItem, setSelectedDetailItem] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    const toggleExpand = (id) => {
        setExpandedTherapists(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    // Filter bookings by date and completed status for Branch Recap
    const dateBookings = useMemo(() => {
        return (branchBookings || []).filter(b =>
            b.date === selectedDate && b.status === 'completed'
        );
    }, [branchBookings, selectedDate]);

    // Calculate branch metrics
    const metrics = useMemo(() => {
        const revenue = calculateTotalRevenue(dateBookings, services);
        const incentives = calculateTotalIncentives(dateBookings, services, therapists);
        const therapistPerf = calculateTherapistPerformance(dateBookings, services, therapists);

        return {
            totalBookings: dateBookings.length,
            revenue,
            incentives,
            netProfit: revenue - incentives,
            therapistPerformance: therapistPerf
        };
    }, [dateBookings, services, therapists]);

    // Group bookings by service
    const serviceBreakdown = useMemo(() => {
        const breakdown = {};
        (dateBookings || []).forEach(booking => {
            const bookedServices = services.filter(s => (booking.serviceIds || [booking.serviceId]).includes(s.id));
            bookedServices.forEach(service => {
                if (!breakdown[service.id]) {
                    breakdown[service.id] = {
                        service,
                        count: 0,
                        revenue: 0
                    };
                }
                breakdown[service.id].count += 1;
                breakdown[service.id].revenue += service.price;
            });
        });
        return Object.values(breakdown).sort((a, b) => b.revenue - a.revenue);
    }, [dateBookings, services]);

    const handleExport = (options) => {
        const profitSharing = calculateProfitSharing(
            metrics.netProfit,
            selectedBranch?.profitSharingPercent || 30
        );

        const exportData = {
            ...metrics,
            profitSharing,
            serviceBreakdown,
            totalBookings: metrics.totalBookings,
            totalRevenue: metrics.revenue,
            totalIncentives: metrics.incentives
        };

        if (options.format === 'pdf') {
            exportRevenueReport(exportData, {
                startDate: selectedDate,
                endDate: selectedDate,
                branchName: selectedBranch?.name,
                includeDetails: options.includeDetails
            });
        } else {
            exportRevenueToExcel(exportData, {
                startDate: selectedDate,
                endDate: selectedDate,
                branchName: selectedBranch?.name,
                includeDetails: options.includeDetails
            });
        }
    };

    // Calculate Period Range for Therapist Recap
    const periodRange = useMemo(() => {
        if (periodType === 'daily') {
            return { startDate: recapDate, endDate: recapDate, label: formatDate(recapDate, 'medium') };
        } else if (periodType === 'weekly') {
            const today = new Date(recapDate);
            const day = today.getDay();
            const diff = today.getDate() - day + (day === 0 ? -6 : 1);
            const start = new Date(today.setDate(diff));
            const end = new Date(today.setDate(diff + 6));
            
            const startStr = start.toISOString().split('T')[0];
            const endStr = end.toISOString().split('T')[0];
            return {
                startDate: startStr,
                endDate: endStr,
                label: `${formatDate(startStr, 'short')} - ${formatDate(endStr, 'short')}`
            };
        } else {
            const [year, month] = recapMonth.split('-').map(Number);
            const start = new Date(year, month - 1, 1);
            const end = new Date(year, month, 0);
            
            const startStr = start.toISOString().split('T')[0];
            const endStr = end.toISOString().split('T')[0];
            const monthLabel = new Date(year, month - 1).toLocaleString('id-ID', { month: 'long', year: 'numeric' });
            return {
                startDate: startStr,
                endDate: endStr,
                label: monthLabel
            };
        }
    }, [periodType, recapDate, recapMonth]);

    // Reset overrides when period range changes
    useEffect(() => {
        setOverrides({});
    }, [periodRange, periodType]);

    // Completed bookings in date range for Therapist Recap
    const completedPeriodBookings = useMemo(() => {
        return (branchBookings || []).filter(b => 
            b.status === 'completed' &&
            b.date >= periodRange.startDate &&
            b.date <= periodRange.endDate
        );
    }, [branchBookings, periodRange]);

    // Calculate therapist data for selected period
    const therapistsRecapData = useMemo(() => {
        const activeTherapists = (therapists || []).filter(t => t.branchId === selectedBranch?.id || !t.branchId);
        
        return activeTherapists.map(t => {
            const myBookings = completedPeriodBookings.filter(b => b.therapistId === t.id);
            
            // Calculate Incentives
            let calculatedIncentives = 0;
            myBookings.forEach(booking => {
                const bookedServices = services.filter(s => (booking.serviceIds || [booking.serviceId]).includes(s.id));
                bookedServices.forEach(service => {
                    let incentive = 0;
                    const incType = (service.therapistIncentiveType && service.therapistIncentiveType !== 'default') 
                        ? service.therapistIncentiveType 
                        : t.incentiveType;
                    const incVal = (service.therapistIncentiveType && service.therapistIncentiveType !== 'default') 
                        ? service.therapistIncentiveValue 
                        : t.incentiveValue;

                    if (incType === 'percentage') {
                        incentive = (service.price * (Number(incVal) || 0)) / 100;
                    } else {
                        incentive = Number(incVal) || 0;
                    }
                    calculatedIncentives += incentive;
                });
            });

            // Calculate Transport
            const calculatedTransport = myBookings.reduce((sum, b) => {
                return sum + (Number(b.transport) || 0) + (Number(b.extraTransport) || 0);
            }, 0);

            // Prorated wage calculation
            let baseWage = Number(t.wage) || 0;
            if (t.status === 'freelance') {
                baseWage = 0;
            } else {
                if (periodType === 'daily') {
                    baseWage = Math.round(baseWage / 30);
                } else if (periodType === 'weekly') {
                    baseWage = Math.round(baseWage / 4.33);
                }
            }

            // Sum bonuses & deductions from configuration
            const baseBonus = (t.bonusItems || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
            const baseDeduction = (t.deductionItems || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

            // Fetch any manual override in state
            const override = overrides[t.id] || {};
            
            const finalWage = override.wage !== undefined ? override.wage : baseWage;
            const finalIncentives = override.incentives !== undefined ? override.incentives : calculatedIncentives;
            const finalTransport = override.transport !== undefined ? override.transport : calculatedTransport;
            const finalBonus = override.bonus !== undefined ? override.bonus : baseBonus;
            const finalDeduction = override.deduction !== undefined ? override.deduction : baseDeduction;

            const netTotal = finalWage + finalIncentives + finalTransport + finalBonus - finalDeduction;

            return {
                therapist: t,
                bookingCount: myBookings.length,
                wage: finalWage,
                incentives: finalIncentives,
                transport: finalTransport,
                bonus: finalBonus,
                deduction: finalDeduction,
                netTotal
            };
        });
    }, [completedPeriodBookings, therapists, services, periodType, periodRange, overrides, selectedBranch]);

    const handleEditRecapClick = (item) => {
        setEditingRecapItem({
            therapistId: item.therapist.id,
            therapistName: item.therapist.name,
            wage: item.wage,
            incentives: item.incentives,
            transport: item.transport,
            bonus: item.bonus,
            deduction: item.deduction
        });
        setShowEditRecapModal(true);
    };

    const handleSaveOverride = (e) => {
        e.preventDefault();
        setOverrides(prev => ({
            ...prev,
            [editingRecapItem.therapistId]: {
                wage: Number(editingRecapItem.wage) || 0,
                incentives: Number(editingRecapItem.incentives) || 0,
                transport: Number(editingRecapItem.transport) || 0,
                bonus: Number(editingRecapItem.bonus) || 0,
                deduction: Number(editingRecapItem.deduction) || 0
            }
        }));
        setShowEditRecapModal(false);
    };

    const handlePrintPeriodSlip = (item) => {
        const branch = selectedBranch || (item.therapist.branchId ? { id: item.therapist.branchId, name: 'Zavera Branch' } : null);
        const pdfUrl = generateTherapistPeriodSlipPDF(
            item.therapist,
            {
                wage: item.wage,
                incentives: item.incentives,
                transport: item.transport,
                bonus: item.bonus,
                deduction: item.deduction,
                netTotal: item.netTotal
            },
            branch,
            periodType === 'daily' ? 'Harian' : periodType === 'weekly' ? 'Mingguan' : 'Bulanan',
            periodRange.label
        );
        setPreviewPdfUrl(pdfUrl);
    };

    const handleRowClick = (item) => {
        setSelectedDetailItem(item);
        setShowDetailModal(true);
    };

    const getTherapistDailyBreakdown = (therapistId) => {
        const therapist = therapists.find(t => t.id === therapistId);
        if (!therapist) return [];

        const myBookings = completedPeriodBookings.filter(b => b.therapistId === therapistId);
        
        // Group myBookings by date
        const dateMap = {};
        
        // Get all dates in period range
        const start = new Date(periodRange.startDate);
        const end = new Date(periodRange.endDate);
        const loopDate = new Date(start);
        
        // Populate date map
        while (loopDate <= end) {
            const dateStr = loopDate.toISOString().split('T')[0];
            dateMap[dateStr] = {
                date: dateStr,
                bookings: [],
                incentives: 0,
                transport: 0,
                total: 0
            };
            loopDate.setDate(loopDate.getDate() + 1);
        }

        // Aggregate booking information into daily buckets
        myBookings.forEach(booking => {
            const dateStr = booking.date;
            if (!dateMap[dateStr]) {
                dateMap[dateStr] = {
                    date: dateStr,
                    bookings: [],
                    incentives: 0,
                    transport: 0,
                    total: 0
                };
            }

            const bookedServices = services.filter(s => (booking.serviceIds || [booking.serviceId]).includes(s.id));
            const serviceNames = bookedServices.map(s => s.name).join(' + ');

            let bookingIncentive = 0;
            bookedServices.forEach(service => {
                let incentive = 0;
                const incType = (service.therapistIncentiveType && service.therapistIncentiveType !== 'default') 
                    ? service.therapistIncentiveType 
                    : therapist.incentiveType;
                const incVal = (service.therapistIncentiveType && service.therapistIncentiveType !== 'default') 
                    ? service.therapistIncentiveValue 
                    : therapist.incentiveValue;

                if (incType === 'percentage') {
                    incentive = (service.price * (Number(incVal) || 0)) / 100;
                } else {
                    incentive = Number(incVal) || 0;
                }
                bookingIncentive += incentive;
            });

            const bookingTransport = (Number(booking.transport) || 0) + (Number(booking.extraTransport) || 0);

            dateMap[dateStr].bookings.push({
                booking,
                serviceNames,
                incentives: bookingIncentive,
                transport: bookingTransport
            });

            dateMap[dateStr].incentives += bookingIncentive;
            dateMap[dateStr].transport += bookingTransport;
        });

        // Compute daily total (wage + incentives + transport)
        let dailyWage = Number(therapist.wage) || 0;
        if (therapist.status === 'freelance') {
            dailyWage = 0;
        } else {
            dailyWage = Math.round(dailyWage / 30);
        }

        const breakdownArray = Object.values(dateMap).map(day => {
            const total = dailyWage + day.incentives + day.transport;
            return {
                ...day,
                total
            };
        });

        if (periodType !== 'daily') {
            return breakdownArray.filter(day => day.bookings.length > 0);
        }

        return breakdownArray;
    };

    return (
        <div className="container" style={{ padding: 'var(--spacing-lg) var(--spacing-md)' }}>
            {/* Sub-tabs header */}
            <div className="flex items-center justify-between mb-lg flex-wrap gap-md">
                <div>
                    <h2 className="heading-2" style={{ marginBottom: 'var(--spacing-xs)' }}>
                        {recapTab === 'branch' ? 'Rekap Harian Cabang' : 'Rekap Pendapatan Terapis'}
                    </h2>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                        {recapTab === 'branch' ? 'Laporan kinerja harian operasional cabang' : 'Rekap & slip gaji terapis (Harian, Mingguan, Bulanan)'}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        className={`btn ${recapTab === 'branch' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setRecapTab('branch')}
                    >
                        Rekap Cabang
                    </button>
                    <button
                        className={`btn ${recapTab === 'therapist' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setRecapTab('therapist')}
                    >
                        Rekap Pendapatan Terapis
                    </button>
                </div>
            </div>

            {/* TAB: BRANCH RECAP (Laporan Operasional Cabang) */}
            {recapTab === 'branch' && (
                <>
                    {/* Header Action */}
                    <div className="flex items-center justify-between mb-lg flex-wrap gap-md">
                        <Card glass style={{ flex: 1, padding: 'var(--spacing-md)' }}>
                            <label className="label">Pilih Tanggal</label>
                            <input
                                type="date"
                                className="input"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                style={{ maxWidth: '300px' }}
                            />
                        </Card>
                        <Button onClick={() => setShowExportModal(true)} variant="success">
                            📥 Export Laporan
                        </Button>
                    </div>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 mb-xl">
                        <StatCard
                            icon="📋"
                            label="Total Booking"
                            value={metrics.totalBookings}
                            color="primary"
                        />
                        <StatCard
                            icon="💰"
                            label="Pendapatan"
                            value={formatCurrency(metrics.revenue).replace('Rp', '')}
                            color="success"
                        />
                        <StatCard
                            icon="💸"
                            label="Insentif Terapis"
                            value={formatCurrency(metrics.incentives).replace('Rp', '')}
                            color="accent"
                        />
                        <StatCard
                            icon="📊"
                            label="Laba Bersih"
                            value={formatCurrency(metrics.netProfit).replace('Rp', '')}
                            color="secondary"
                        />
                    </div>

                    {/* Service Breakdown */}
                    <Card glass className="mb-lg">
                        <h3 className="heading-3 mb-md">Breakdown per Layanan</h3>
                        {serviceBreakdown.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--color-text-muted)' }}>
                                <p>Tidak ada data untuk tanggal ini</p>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', fontSize: 'var(--font-size-sm)' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                                            <th style={{ textAlign: 'left', padding: 'var(--spacing-sm)', color: 'var(--color-text-secondary)' }}>Layanan</th>
                                            <th style={{ textAlign: 'center', padding: 'var(--spacing-sm)', color: 'var(--color-text-secondary)' }}>Jumlah</th>
                                            <th style={{ textAlign: 'right', padding: 'var(--spacing-sm)', color: 'var(--color-text-secondary)' }}>Pendapatan</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {serviceBreakdown.map(({ service, count, revenue }) => (
                                            <tr key={service.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                                <td style={{ padding: 'var(--spacing-sm)' }}>{service.name}</td>
                                                <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center', fontWeight: 600 }}>{count}x</td>
                                                <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontWeight: 700, color: 'var(--color-primary-light)' }}>
                                                    {formatCurrency(revenue)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>

                    {/* Therapist Performance */}
                    <Card glass>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-md)', flexWrap: 'wrap', gap: 8 }}>
                            <h3 className="heading-3">Kinerja Terapis</h3>
                            {metrics.therapistPerformance.length > 0 && (
                                <div style={{ display: 'flex', gap: 16, fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                                    <span>👤 {metrics.therapistPerformance.length} terapis aktif</span>
                                    <span>⏱ {(metrics.therapistPerformance.reduce((s, p) => s + p.totalMinutes, 0) / 60).toFixed(1)} jam total</span>
                                </div>
                            )}
                        </div>

                        {metrics.therapistPerformance.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--color-text-muted)' }}>
                                <div style={{ fontSize: '3rem', marginBottom: 8 }}>🧘</div>
                                <p>Tidak ada data terapis untuk tanggal ini</p>
                            </div>
                        ) : (() => {
                            const sorted = [...metrics.therapistPerformance].sort((a, b) => b.netEarnings - a.netEarnings);
                            const totalRevenue = sorted.reduce((s, p) => s + p.netEarnings, 0) || 1;
                            const rankEmoji = ['🥇', '🥈', '🥉'];

                            return (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--spacing-md)' }}>
                                    {sorted.map((perf, idx) => {
                                        const { therapist, bookingCount, totalMinutes, serviceIncentives, wage, totalBonus, totalDeduction, netEarnings, serviceDetailsArray } = perf;
                                        const rekapForTherapist = (rekaps || []).find(r => r.therapistId === therapist.id && (r.createdAt || '').split('T')[0] === selectedDate);
                                        const isPaid = rekapForTherapist?.status === 'paid';
                                        const isTop = idx === 0;
                                        const contribPct = totalRevenue > 0 ? Math.round((netEarnings / totalRevenue) * 100) : 0;
                                        const isExpanded = expandedTherapists.has(therapist.id);
                                        const initials = (therapist.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                                        const hours = (totalMinutes / 60).toFixed(1);

                                        return (
                                            <div key={therapist.id} style={{
                                                background: isTop ? 'linear-gradient(145deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))' : 'rgba(255,255,255,0.03)',
                                                border: isTop ? '1px solid rgba(99,102,241,0.4)' : '1px solid var(--color-border)',
                                                borderRadius: 'var(--radius-xl)',
                                                padding: 'var(--spacing-md)',
                                                boxShadow: isTop ? '0 0 20px rgba(99,102,241,0.15)' : 'none',
                                                position: 'relative',
                                                overflow: 'hidden'
                                            }}>
                                                {isTop && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899)', borderRadius: '12px 12px 0 0' }} />}

                                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                                                    <div style={{ position: 'relative', flexShrink: 0 }}>
                                                        <div style={{ width: 56, height: 75, borderRadius: 10, overflow: 'hidden', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: isTop ? '2px solid rgba(99,102,241,0.6)' : '2px solid var(--color-border)' }}>
                                                            {therapist.photo ? (
                                                                <img src={therapist.photo} alt={therapist.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            ) : (
                                                                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>{initials}</span>
                                                            )}
                                                        </div>
                                                        <div style={{ position: 'absolute', top: -8, left: -8, width: 24, height: 24, borderRadius: '50%', background: idx < 3 ? 'transparent' : 'var(--color-surface-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: idx < 3 ? '1rem' : '0.65rem', fontWeight: 700, border: idx >= 3 ? '1px solid var(--color-border)' : 'none', lineHeight: 1 }}>
                                                            {idx < 3 ? rankEmoji[idx] : `#${idx + 1}`}
                                                        </div>
                                                    </div>

                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{therapist.name}</div>
                                                        {therapist.whatsappNumber && (
                                                            <a href={`https://wa.me/${therapist.whatsappNumber.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: '#25d366', textDecoration: 'none', marginBottom: 6 }}>
                                                                WhatsApp
                                                            </a>
                                                        )}
                                                        <div style={{ marginTop: 2 }}>
                                                            {isPaid ? (
                                                                <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 700, background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>✓ Lunas</span>
                                                            ) : rekapForTherapist ? (
                                                                <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 700, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>⏳ Belum Lunas</span>
                                                            ) : (
                                                                <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 600, background: 'rgba(107,114,128,0.12)', color: '#6b7280' }}>Belum Ada Rekap</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Stats */}
                                                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                                                    <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '6px 8px', textAlign: 'center' }}>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Booking</div>
                                                        <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>{bookingCount}x</div>
                                                    </div>
                                                    <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '6px 8px', textAlign: 'center' }}>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Jam</div>
                                                        <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>{hours} jam</div>
                                                    </div>
                                                    <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '6px 8px', textAlign: 'center' }}>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Pendapatan</div>
                                                        <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>{formatCurrency(netEarnings)}</div>
                                                    </div>
                                                </div>

                                                {/* Details list */}
                                                <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: '10px 12px', fontSize: '0.8rem', marginBottom: 10 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                        <span style={{ color: 'var(--color-text-secondary)' }}>Insentif Layanan</span>
                                                        <span style={{ fontWeight: 600 }}>{formatCurrency(serviceIncentives)}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                        <span style={{ color: 'var(--color-text-secondary)' }}>Gaji Tetap</span>
                                                        <span style={{ fontWeight: 600 }}>{formatCurrency(wage)}</span>
                                                    </div>
                                                    {totalBonus > 0 && (
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#10b981' }}>
                                                            <span>Bonus</span>
                                                            <span>+{formatCurrency(totalBonus)}</span>
                                                        </div>
                                                    )}
                                                    {totalDeduction > 0 && (
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#ef4444' }}>
                                                            <span>Potongan</span>
                                                            <span>-{formatCurrency(totalDeduction)}</span>
                                                        </div>
                                                    )}
                                                    <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '8px 0' }} />
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                                                        <span>Total Bersih</span>
                                                        <span style={{ color: 'var(--color-primary-light)' }}>{formatCurrency(netEarnings)}</span>
                                                    </div>
                                                </div>

                                                {serviceDetailsArray && serviceDetailsArray.length > 0 && (
                                                    <>
                                                        <button
                                                            onClick={() => toggleExpand(therapist.id)}
                                                            className="btn btn-sm btn-outline"
                                                            style={{ width: '100%', fontSize: '0.78rem', justifyContent: 'center' }}
                                                        >
                                                            {isExpanded ? '▼ Sembunyikan' : `▲ Detail (${serviceDetailsArray.length} layanan)`}
                                                        </button>
                                                        {isExpanded && (
                                                            <div style={{ marginTop: 8, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                                                                <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
                                                                    <thead>
                                                                        <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                                                                            <th style={{ padding: '6px 8px', textAlign: 'left' }}>Layanan</th>
                                                                            <th style={{ padding: '6px 8px', textAlign: 'center' }}>Qty</th>
                                                                            <th style={{ padding: '6px 8px', textAlign: 'right' }}>Insentif</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {serviceDetailsArray.map((detail, i) => (
                                                                            <tr key={i} style={{ borderTop: '1px solid var(--color-border)' }}>
                                                                                <td style={{ padding: '6px 8px' }}>{detail.serviceName}</td>
                                                                                <td style={{ padding: '6px 8px', textAlign: 'center' }}>{detail.count}x</td>
                                                                                <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--color-primary-light)', fontWeight: 700 }}>{formatCurrency(detail.totalIncentive)}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                    </Card>
                </>
            )}

            {/* TAB: THERAPIST PERIOD RECAP (Laporan Pendapatan Terapis) */}
            {recapTab === 'therapist' && (
                <>
                    {/* Period Selector Card */}
                    <Card glass className="mb-lg">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-md items-end">
                            <div>
                                <label className="label">Tipe Periode</label>
                                <select
                                    className="select"
                                    value={periodType}
                                    onChange={(e) => setPeriodType(e.target.value)}
                                >
                                    <option value="daily">Harian</option>
                                    <option value="weekly">Mingguan</option>
                                    <option value="monthly">Bulanan</option>
                                </select>
                            </div>

                            {periodType !== 'monthly' ? (
                                <div className="md:col-span-2">
                                    <label className="label">Pilih Tanggal</label>
                                    <input
                                        type="date"
                                        className="input"
                                        value={recapDate}
                                        onChange={(e) => setRecapDate(e.target.value)}
                                    />
                                </div>
                            ) : (
                                <div className="md:col-span-2">
                                    <label className="label">Pilih Bulan</label>
                                    <input
                                        type="month"
                                        className="input"
                                        value={recapMonth}
                                        onChange={(e) => setRecapMonth(e.target.value)}
                                    />
                                </div>
                            )}

                            <div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: 8 }}>
                                    Rentang Tanggal:
                                </div>
                                <div style={{ fontWeight: 700, color: 'var(--color-primary-light)', fontSize: '0.9rem' }}>
                                    {periodRange.label}
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Therapist Period Recap Table */}
                    <Card glass>
                        <h3 className="heading-3 mb-md">Daftar Rekap Pendapatan Terapis ({periodRange.label})</h3>
                        {therapistsRecapData.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--color-text-muted)' }}>
                                <p>Tidak ada terapis terdaftar</p>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', fontSize: 'var(--font-size-sm)', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
                                            <th style={{ padding: 'var(--spacing-sm)', color: 'var(--color-text-secondary)' }}>Terapis</th>
                                            <th style={{ padding: 'var(--spacing-sm)', color: 'var(--color-text-secondary)', textAlign: 'center' }}>Booking</th>
                                            <th style={{ padding: 'var(--spacing-sm)', color: 'var(--color-text-secondary)', textAlign: 'right' }}>Upah / Gaji</th>
                                            <th style={{ padding: 'var(--spacing-sm)', color: 'var(--color-text-secondary)', textAlign: 'right' }}>Insentif</th>
                                            <th style={{ padding: 'var(--spacing-sm)', color: 'var(--color-text-secondary)', textAlign: 'right' }}>Transport</th>
                                            <th style={{ padding: 'var(--spacing-sm)', color: 'var(--color-text-secondary)', textAlign: 'right' }}>Bonus</th>
                                            <th style={{ padding: 'var(--spacing-sm)', color: 'var(--color-text-secondary)', textAlign: 'right' }}>Potongan</th>
                                            <th style={{ padding: 'var(--spacing-sm)', color: 'var(--color-text-secondary)', textAlign: 'right', fontWeight: 700 }}>Total Bersih</th>
                                            <th style={{ padding: 'var(--spacing-sm)', color: 'var(--color-text-secondary)', textAlign: 'center' }}>Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {therapistsRecapData.map((item) => (
                                            <tr 
                                                key={item.therapist.id} 
                                                style={{ borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }}
                                                className="hoverable-row"
                                                onClick={() => handleRowClick(item)}
                                            >
                                                <td style={{ padding: 'var(--spacing-sm)' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: '0.8rem', overflow: 'hidden' }}>
                                                            {item.therapist.photo ? (
                                                                <img src={item.therapist.photo} alt={item.therapist.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            ) : (
                                                                item.therapist.name.charAt(0)
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: 600 }}>{item.therapist.name}</div>
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{item.therapist.status === 'freelance' ? 'Freelance' : 'Karyawan Tetap'}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center', fontWeight: 600 }}>
                                                    {item.bookingCount}x
                                                </td>
                                                <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right' }}>
                                                    {formatCurrency(item.wage)}
                                                </td>
                                                <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right', color: 'var(--color-primary-light)' }}>
                                                    {formatCurrency(item.incentives)}
                                                </td>
                                                <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right' }}>
                                                    {formatCurrency(item.transport)}
                                                </td>
                                                <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right', color: 'var(--color-success)' }}>
                                                    +{formatCurrency(item.bonus)}
                                                </td>
                                                <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right', color: 'var(--color-error)' }}>
                                                    -{formatCurrency(item.deduction)}
                                                </td>
                                                <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontWeight: 800, color: 'var(--color-primary-light)', fontSize: '0.95rem' }}>
                                                    {formatCurrency(item.netTotal)}
                                                </td>
                                                <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                                        <Button
                                                            size="sm"
                                                            variant="secondary"
                                                            onClick={(e) => { e.stopPropagation(); handleEditRecapClick(item); }}
                                                        >
                                                            ✏️ Edit
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={(e) => { e.stopPropagation(); handlePrintPeriodSlip(item); }}
                                                        >
                                                            🖨️ Slip
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </>
            )}

            {/* Modal: Edit overrides for Therapist period recap */}
            <Modal
                isOpen={showEditRecapModal}
                onClose={() => setShowEditRecapModal(false)}
                title={`Sesuaikan Pendapatan - ${editingRecapItem?.therapistName}`}
            >
                {editingRecapItem && (
                    <form onSubmit={handleSaveOverride}>
                        <div className="grid gap-md">
                            <div>
                                <label className="label">Gaji Pokok / Upah Tetap (IDR)</label>
                                <input
                                    type="number"
                                    className="input"
                                    value={editingRecapItem.wage}
                                    onChange={(e) => setEditingRecapItem({ ...editingRecapItem, wage: parseInt(e.target.value) || 0 })}
                                    min="0"
                                    step="10000"
                                />
                            </div>

                            <div>
                                <label className="label">Total Insentif Layanan (IDR)</label>
                                <input
                                    type="number"
                                    className="input"
                                    value={editingRecapItem.incentives}
                                    onChange={(e) => setEditingRecapItem({ ...editingRecapItem, incentives: parseInt(e.target.value) || 0 })}
                                    min="0"
                                    step="1000"
                                />
                            </div>

                            <div>
                                <label className="label">Biaya Transportasi (IDR)</label>
                                <input
                                    type="number"
                                    className="input"
                                    value={editingRecapItem.transport}
                                    onChange={(e) => setEditingRecapItem({ ...editingRecapItem, transport: parseInt(e.target.value) || 0 })}
                                    min="0"
                                    step="1000"
                                />
                            </div>

                            <div>
                                <label className="label">Bonus Tambahan (IDR)</label>
                                <input
                                    type="number"
                                    className="input"
                                    value={editingRecapItem.bonus}
                                    onChange={(e) => setEditingRecapItem({ ...editingRecapItem, bonus: parseInt(e.target.value) || 0 })}
                                    min="0"
                                    step="1000"
                                />
                            </div>

                            <div>
                                <label className="label">Potongan (IDR)</label>
                                <input
                                    type="number"
                                    className="input"
                                    value={editingRecapItem.deduction}
                                    onChange={(e) => setEditingRecapItem({ ...editingRecapItem, deduction: parseInt(e.target.value) || 0 })}
                                    min="0"
                                    step="1000"
                                />
                            </div>

                            <div style={{ background: 'var(--color-bg-tertiary)', padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                                <span>Estimasi Total Bersih:</span>
                                <span style={{ color: 'var(--color-primary-light)' }}>
                                    {formatCurrency(
                                        Number(editingRecapItem.wage) +
                                        Number(editingRecapItem.incentives) +
                                        Number(editingRecapItem.transport) +
                                        Number(editingRecapItem.bonus) -
                                        Number(editingRecapItem.deduction)
                                    )}
                                </span>
                            </div>

                            <div className="flex gap-md justify-end">
                                <Button type="button" variant="secondary" onClick={() => setShowEditRecapModal(false)}>
                                    Batal
                                </Button>
                                <Button type="submit" variant="success">
                                    Simpan Penyesuaian
                                </Button>
                            </div>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Modal: PDF Slip Preview */}
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

            {/* Modal: Detail Pendapatan Terapis Harian */}
            <Modal
                isOpen={showDetailModal}
                onClose={() => {
                    setShowDetailModal(false);
                    setSelectedDetailItem(null);
                }}
                title={`Detail Pendapatan - ${selectedDetailItem?.therapist.name}`}
            >
                {selectedDetailItem && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>Periode:</div>
                            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-primary-light)' }}>{periodRange.label} ({periodType.toUpperCase()})</div>
                        </div>

                        <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                            <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                                        <th style={{ padding: '8px 12px', color: 'var(--color-text-secondary)' }}>Tanggal</th>
                                        <th style={{ padding: '8px 12px', color: 'var(--color-text-secondary)', textAlign: 'center' }}>Sesi</th>
                                        <th style={{ padding: '8px 12px', color: 'var(--color-text-secondary)', textAlign: 'right' }}>Insentif</th>
                                        <th style={{ padding: '8px 12px', color: 'var(--color-text-secondary)', textAlign: 'right' }}>Transport</th>
                                        <th style={{ padding: '8px 12px', color: 'var(--color-text-secondary)', textAlign: 'right', fontWeight: 700 }}>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {getTherapistDailyBreakdown(selectedDetailItem.therapist.id).map((day, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                            <td style={{ padding: '8px 12px' }}>
                                                <div style={{ fontWeight: 600 }}>{formatDate(day.date, 'short')}</div>
                                            </td>
                                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                                <div style={{ fontWeight: 600 }}>{day.bookings.length}x</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={day.bookings.map(b => b.serviceNames).join(', ')}>
                                                    {day.bookings.map(b => b.serviceNames).join(', ')}
                                                </div>
                                            </td>
                                            <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--color-primary-light)' }}>
                                                {formatCurrency(day.incentives)}
                                            </td>
                                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                                                {formatCurrency(day.transport)}
                                            </td>
                                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>
                                                {formatCurrency(day.total)}
                                            </td>
                                        </tr>
                                    ))}
                                    {getTherapistDailyBreakdown(selectedDetailItem.therapist.id).length === 0 && (
                                        <tr>
                                            <td colSpan="5" style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                                Tidak ada booking selesai pada periode ini.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Summary breakdown in modal */}
                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.85rem' }}>
                                <div>Gaji Pokok / Upah Tetap:</div>
                                <div style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(selectedDetailItem.wage)}</div>
                                
                                <div>Total Insentif Layanan:</div>
                                <div style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-primary-light)' }}>{formatCurrency(selectedDetailItem.incentives)}</div>
                                
                                <div>Biaya Transportasi:</div>
                                <div style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(selectedDetailItem.transport)}</div>
                                
                                <div>Bonus Tambahan:</div>
                                <div style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-success)' }}>+{formatCurrency(selectedDetailItem.bonus)}</div>
                                
                                <div>Potongan:</div>
                                <div style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-error)' }}>-{formatCurrency(selectedDetailItem.deduction)}</div>
                                
                                <div style={{ gridColumn: 'span 2', height: '1px', background: 'var(--color-border)', margin: '4px 0' }} />
                                
                                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Pendapatan Bersih:</div>
                                <div style={{ textAlign: 'right', fontWeight: 800, color: 'var(--color-primary-light)', fontSize: '0.95rem' }}>{formatCurrency(selectedDetailItem.netTotal)}</div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <Button variant="secondary" onClick={() => { setShowDetailModal(false); setSelectedDetailItem(null); }}>
                                Tutup
                            </Button>
                            <Button variant="primary" onClick={() => { setShowDetailModal(false); handlePrintPeriodSlip(selectedDetailItem); }}>
                                🖨️ Cetak Slip
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Export Modal */}
            <ExportModal
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                onExport={handleExport}
                type="revenue"
            />
        </div>
    );
}
