import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import Card from '../components/common/Card';
import { StatCard } from '../components/common/Card';
import { formatCurrency, formatDate, getToday } from '../utils/formatters';
import Button from '../components/common/Button';
import ExportModal from '../components/common/ExportModal';
import { exportRevenueReport } from '../utils/exportPDF';
import { exportRevenueToExcel } from '../utils/exportExcel';
import {
    calculateTotalRevenue,
    calculateTotalIncentives,
    calculateTherapistPerformance,
    calculateProfitSharing
} from '../utils/calculations';

export default function DailyRecap() {
    const { branchBookings, services, therapists, selectedBranch, rekaps } = useAppContext();
    const [selectedDate, setSelectedDate] = useState(getToday());
    const [showExportModal, setShowExportModal] = useState(false);
    const [expandedTherapists, setExpandedTherapists] = useState(new Set());

    const toggleExpand = (id) => {
        setExpandedTherapists(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    // Filter bookings by date and completed status
    const dateBookings = useMemo(() => {
        return (branchBookings || []).filter(b =>
            b.date === selectedDate && b.status === 'completed'
        );
    }, [branchBookings, selectedDate]);

    // Calculate metrics
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
            const service = services.find(s => s.id === booking.serviceId);
            if (service) {
                if (!breakdown[service.id]) {
                    breakdown[service.id] = {
                        service,
                        count: 0,
                        revenue: 0
                    };
                }
                breakdown[service.id].count += 1;
                breakdown[service.id].revenue += service.price;
            }
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

    return (
        <div className="container" style={{ padding: 'var(--spacing-lg) var(--spacing-md)' }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-lg">
                <div>
                    <h2 className="heading-2" style={{ marginBottom: 'var(--spacing-xs)' }}>
                        Rekap Harian
                    </h2>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                        Laporan kinerja harian cabang
                    </p>
                </div>
                <Button onClick={() => setShowExportModal(true)} variant="success">
                    📥 Export Laporan
                </Button>
            </div>

            {/* Date Selector */}
            <Card glass className="mb-lg">
                <label className="label">Pilih Tanggal</label>
                <input
                    type="date"
                    className="input"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    style={{ maxWidth: '300px' }}
                />
            </Card>

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
                    <div style={{
                        textAlign: 'center',
                        padding: 'var(--spacing-xl)',
                        color: 'var(--color-text-muted)'
                    }}>
                        <p>Tidak ada data untuk tanggal ini</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', fontSize: 'var(--font-size-sm)' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                                    <th style={{ textAlign: 'left', padding: 'var(--spacing-sm)', color: 'var(--color-text-secondary)' }}>
                                        Layanan
                                    </th>
                                    <th style={{ textAlign: 'center', padding: 'var(--spacing-sm)', color: 'var(--color-text-secondary)' }}>
                                        Jumlah
                                    </th>
                                    <th style={{ textAlign: 'right', padding: 'var(--spacing-sm)', color: 'var(--color-text-secondary)' }}>
                                        Pendapatan
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {serviceBreakdown.map(({ service, count, revenue }) => (
                                    <tr key={service.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                        <td style={{ padding: 'var(--spacing-sm)' }}>
                                            {service.name}
                                        </td>
                                        <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center', fontWeight: 600 }}>
                                            {count}x
                                        </td>
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

            {/* Therapist Performance — Card Grid */}
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
                    // Sort by netEarnings descending for ranking
                    const sorted = [...metrics.therapistPerformance].sort((a, b) => b.netEarnings - a.netEarnings);
                    const totalRevenue = sorted.reduce((s, p) => s + p.netEarnings, 0) || 1;
                    const rankEmoji = ['🥇', '🥈', '🥉'];

                    return (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                            gap: 'var(--spacing-md)'
                        }}>
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
                                        background: isTop
                                            ? 'linear-gradient(145deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))'
                                            : 'rgba(255,255,255,0.03)',
                                        border: isTop
                                            ? '1px solid rgba(99,102,241,0.4)'
                                            : '1px solid var(--color-border)',
                                        borderRadius: 'var(--radius-xl)',
                                        padding: 'var(--spacing-md)',
                                        boxShadow: isTop ? '0 0 20px rgba(99,102,241,0.15)' : 'none',
                                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}>
                                        {/* Top performer glow strip */}
                                        {isTop && (
                                            <div style={{
                                                position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                                                background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899)',
                                                borderRadius: '12px 12px 0 0'
                                            }} />
                                        )}

                                        {/* Header row: photo + name + status */}
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                                            {/* Ranking badge */}
                                            <div style={{
                                                position: 'relative',
                                                flexShrink: 0,
                                            }}>
                                                {/* Photo / Avatar */}
                                                <div style={{
                                                    width: 56,
                                                    height: 75,
                                                    borderRadius: 10,
                                                    overflow: 'hidden',
                                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    border: isTop ? '2px solid rgba(99,102,241,0.6)' : '2px solid var(--color-border)',
                                                    flexShrink: 0,
                                                }}>
                                                    {therapist.photo ? (
                                                        <img src={therapist.photo} alt={therapist.name}
                                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>{initials}</span>
                                                    )}
                                                </div>
                                                {/* Rank pill */}
                                                <div style={{
                                                    position: 'absolute',
                                                    top: -8, left: -8,
                                                    width: 24, height: 24,
                                                    borderRadius: '50%',
                                                    background: idx < 3 ? 'transparent' : 'var(--color-surface-elevated)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: idx < 3 ? '1rem' : '0.65rem',
                                                    fontWeight: 700,
                                                    color: idx < 3 ? undefined : 'var(--color-text-muted)',
                                                    border: idx >= 3 ? '1px solid var(--color-border)' : 'none',
                                                    lineHeight: 1
                                                }}>
                                                    {idx < 3 ? rankEmoji[idx] : `#${idx + 1}`}
                                                </div>
                                            </div>

                                            {/* Name, WA, Status */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {therapist.name}
                                                </div>
                                                {therapist.whatsappNumber ? (
                                                    <a href={`https://wa.me/${therapist.whatsappNumber.replace(/[^0-9]/g, '')}`}
                                                        target="_blank" rel="noopener noreferrer"
                                                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: '#25d366', textDecoration: 'none', marginBottom: 6 }}>
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="#25d366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.934-1.426A9.952 9.952 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18c-1.657 0-3.205-.5-4.489-1.356l-.322-.2-3.33.962.987-3.254-.21-.337A7.956 7.956 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"/></svg>
                                                        {therapist.whatsappNumber}
                                                    </a>
                                                ) : (
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 6 }}>—</div>
                                                )}
                                                {/* Status badge */}
                                                {isPaid ? (
                                                    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 700, background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>✓ Lunas</span>
                                                ) : rekapForTherapist ? (
                                                    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 700, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>⏳ Belum Lunas</span>
                                                ) : (
                                                    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 600, background: 'rgba(107,114,128,0.12)', color: '#6b7280' }}>Belum Ada Rekap</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Quick stats row */}
                                        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                                            {[
                                                { icon: '📋', label: 'Booking', val: `${bookingCount}x` },
                                                { icon: '⏱', label: 'Jam', val: `${hours} jam` },
                                                { icon: '💰', label: 'Pendapatan', val: formatCurrency(netEarnings).replace('Rp', 'Rp ') }
                                            ].map(({ icon, label, val }) => (
                                                <div key={label} style={{
                                                    flex: 1, minWidth: 70,
                                                    background: 'rgba(255,255,255,0.04)',
                                                    border: '1px solid var(--color-border)',
                                                    borderRadius: 8,
                                                    padding: '6px 8px',
                                                    textAlign: 'center'
                                                }}>
                                                    <div style={{ fontSize: '0.9rem' }}>{icon}</div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{label}</div>
                                                    <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>{val}</div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Progress bar — contribution */}
                                        <div style={{ marginBottom: 14 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Kontribusi Pendapatan</span>
                                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: isTop ? '#818cf8' : 'var(--color-text-secondary)' }}>{contribPct}%</span>
                                            </div>
                                            <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                                                <div style={{
                                                    height: '100%',
                                                    width: `${contribPct}%`,
                                                    borderRadius: 999,
                                                    background: isTop
                                                        ? 'linear-gradient(90deg, #6366f1, #8b5cf6)'
                                                        : 'linear-gradient(90deg, #06b6d4, #3b82f6)',
                                                    transition: 'width 0.6s ease'
                                                }} />
                                            </div>
                                        </div>

                                        {/* Income breakdown */}
                                        <div style={{
                                            background: 'rgba(0,0,0,0.2)',
                                            borderRadius: 10,
                                            padding: '10px 12px',
                                            marginBottom: 10,
                                            fontSize: '0.8rem'
                                        }}>
                                            {[
                                                { icon: '💸', label: 'Insentif Layanan', val: formatCurrency(serviceIncentives), color: 'var(--color-primary-light)' },
                                                { icon: '🏦', label: 'Gaji Tetap', val: formatCurrency(wage), color: 'var(--color-text-secondary)' },
                                                ...(totalBonus > 0 ? [{ icon: '🎁', label: 'Bonus', val: `+${formatCurrency(totalBonus)}`, color: '#10b981' }] : []),
                                                ...(totalDeduction > 0 ? [{ icon: '✂️', label: 'Potongan', val: `-${formatCurrency(totalDeduction)}`, color: '#ef4444' }] : []),
                                            ].map(({ icon, label, val, color }) => (
                                                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0' }}>
                                                    <span style={{ color: 'var(--color-text-muted)' }}>{icon} {label}</span>
                                                    <span style={{ fontWeight: 600, color }}>{val}</span>
                                                </div>
                                            ))}
                                            <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '8px 0' }} />
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>💵 Total Bersih</span>
                                                <span style={{
                                                    fontWeight: 800,
                                                    fontSize: '0.95rem',
                                                    color: isTop ? '#818cf8' : 'var(--color-primary-light)'
                                                }}>{formatCurrency(netEarnings)}</span>
                                            </div>
                                        </div>

                                        {/* Accordion toggle */}
                                        {serviceDetailsArray && serviceDetailsArray.length > 0 && (
                                            <>
                                                <button
                                                    onClick={() => toggleExpand(therapist.id)}
                                                    style={{
                                                        width: '100%',
                                                        padding: '7px 10px',
                                                        borderRadius: 8,
                                                        border: '1px solid var(--color-border)',
                                                        background: 'rgba(255,255,255,0.04)',
                                                        color: 'var(--color-text-secondary)',
                                                        cursor: 'pointer',
                                                        fontSize: '0.78rem',
                                                        fontWeight: 600,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: 6,
                                                        transition: 'background 0.2s'
                                                    }}
                                                >
                                                    <span style={{ transition: 'transform 0.2s', display: 'inline-block', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                                                    {isExpanded ? 'Sembunyikan' : `Lihat ${serviceDetailsArray.length} Detail Layanan`}
                                                </button>

                                                {isExpanded && (
                                                    <div style={{
                                                        marginTop: 8,
                                                        borderRadius: 8,
                                                        overflow: 'hidden',
                                                        border: '1px solid var(--color-border)'
                                                    }}>
                                                        <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse' }}>
                                                            <thead>
                                                                <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                                                                    <th style={{ padding: '6px 8px', textAlign: 'left', color: 'var(--color-text-muted)', fontWeight: 600 }}>Layanan</th>
                                                                    <th style={{ padding: '6px 8px', textAlign: 'center', color: 'var(--color-text-muted)', fontWeight: 600 }}>Qty</th>
                                                                    <th style={{ padding: '6px 8px', textAlign: 'center', color: 'var(--color-text-muted)', fontWeight: 600 }}>Durasi</th>
                                                                    <th style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--color-text-muted)', fontWeight: 600 }}>Omzet</th>
                                                                    <th style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--color-text-muted)', fontWeight: 600 }}>Insentif</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {serviceDetailsArray.map((detail, i) => (
                                                                    <tr key={i} style={{ borderTop: '1px solid var(--color-border)' }}>
                                                                        <td style={{ padding: '6px 8px' }}>{detail.serviceName}</td>
                                                                        <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 600 }}>{detail.count}x</td>
                                                                        <td style={{ padding: '6px 8px', textAlign: 'center', color: 'var(--color-text-muted)' }}>{detail.totalMinutes}m</td>
                                                                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>{formatCurrency(detail.totalRevenue)}</td>
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
