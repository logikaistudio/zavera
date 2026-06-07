import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import Card from '../components/common/Card';
import { StatCard } from '../components/common/Card';
import RevenueChart from '../components/Charts/RevenueChart';
import BranchComparisonChart from '../components/Charts/BranchComparisonChart';
import { formatCurrency, formatDate, getToday } from '../utils/formatters';
import {
    calculateTotalRevenue,
    calculateTotalIncentives,
    calculateNetProfit
} from '../utils/calculations';

export default function Analytics() {
    const { branches, bookings, services, therapists, inventory } = useAppContext();
    const [days, setDays] = useState(7); // Default to 7 days

    // Calculate date range
    const dateRange = useMemo(() => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - days + 1);
        return {
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0]
        };
    }, [days]);

    // Filter completed bookings in date range
    const completedBookings = useMemo(() => {
        return (bookings || []).filter(b =>
            b.status === 'completed' &&
            b.date >= dateRange.startDate &&
            b.date <= dateRange.endDate
        );
    }, [bookings, dateRange]);

    // Overall KPIs
    const kpis = useMemo(() => {
        const revenue = calculateTotalRevenue(completedBookings, services);
        const incentives = calculateTotalIncentives(completedBookings, services, therapists);
        const netProfit = calculateNetProfit(revenue, incentives);

        // Inventory metrics
        const totalInventoryValue = (inventory || []).reduce((sum, item) =>
            sum + (item.currentStock * item.pricePerUnit), 0
        );
        const lowStockCount = (inventory || []).filter(i => i.currentStock < i.minStock).length;

        return {
            totalRevenue: revenue,
            totalIncentives: incentives,
            netProfit,
            totalBookings: completedBookings.length,
            totalInventoryValue,
            lowStockCount,
            totalInventoryItems: (inventory || []).length
        };
    }, [completedBookings, services, therapists, inventory]);

    // Daily revenue data for chart
    const dailyRevenueData = useMemo(() => {
        const dataMap = {};

        // Initialize all dates in range
        const current = new Date(dateRange.startDate);
        const end = new Date(dateRange.endDate);

        while (current <= end) {
            const dateStr = current.toISOString().split('T')[0];
            dataMap[dateStr] = {
                date: formatDate(dateStr, 'short'),
                revenue: 0
            };
            current.setDate(current.getDate() + 1);
        }

        // Fill with actual data
        completedBookings.forEach(booking => {
            const service = services.find(s => s.id === booking.serviceId);
            if (service && dataMap[booking.date]) {
                dataMap[booking.date].revenue += service.price;
            }
        });

        return Object.values(dataMap);
    }, [completedBookings, services, dateRange]);

    // Branch comparison data
    const branchComparisonData = useMemo(() => {
        const branchStats = (branches || []).map(branch => {
            const branchBookings = completedBookings.filter(b => b.branchId === branch.id);
            const revenue = calculateTotalRevenue(branchBookings, services);

            return {
                branch: branch.name.replace('SPAcity ', ''),
                revenue,
                bookings: branchBookings.length
            };
        });

        return branchStats.sort((a, b) => b.revenue - a.revenue);
    }, [branches, completedBookings, services]);

    // Top services
    const topServices = useMemo(() => {
        const serviceStats = {};

        completedBookings.forEach(booking => {
            const service = services.find(s => s.id === booking.serviceId);
            if (service) {
                if (!serviceStats[service.id]) {
                    serviceStats[service.id] = {
                        service,
                        count: 0,
                        revenue: 0
                    };
                }
                serviceStats[service.id].count += 1;
                serviceStats[service.id].revenue += service.price;
            }
        });

        return Object.values(serviceStats)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);
    }, [completedBookings, services]);

    return (
        <div className="container" style={{ padding: 'var(--spacing-lg) var(--spacing-md)' }}>
            {/* Header */}
            <div className="mb-lg">
                <h2 className="heading-2" style={{ marginBottom: 'var(--spacing-xs)' }}>
                    Dashboard Analitik
                </h2>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                    Ringkasan kinerja dari semua cabang SPAcity
                </p>
            </div>

            {/* Period selector */}
            <Card glass className="mb-lg">
                <div className="flex items-center justify-between">
                    <label className="label" style={{ margin: 0 }}>Periode Analisis</label>
                    <div className="flex gap-sm">
                        {[7, 14, 30].map(d => (
                            <button
                                key={d}
                                className={`btn btn-sm ${days === d ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setDays(d)}
                            >
                                {d} Hari
                            </button>
                        ))}
                    </div>
                </div>
            </Card>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 mb-xl">
                <StatCard
                    icon="💰"
                    label="Total Pendapatan"
                    value={formatCurrency(kpis.totalRevenue).replace('Rp', '')}
                    trend={`${kpis.totalBookings} booking`}
                    color="success"
                />
                <StatCard
                    icon="📊"
                    label="Laba Bersih"
                    value={formatCurrency(kpis.netProfit).replace('Rp', '')}
                    trend={`${days} hari terakhir`}
                    color="primary"
                />
                <StatCard
                    icon="📦"
                    label="Nilai Inventory"
                    value={formatCurrency(kpis.totalInventoryValue).replace('Rp', '')}
                    trend={`${kpis.totalInventoryItems} item`}
                    color="accent"
                />
                <StatCard
                    icon="⚠️"
                    label="Stok Rendah"
                    value={kpis.lowStockCount}
                    trend="Perlu restock"
                    color="secondary"
                />
            </div>

            {/* Revenue Trend Chart */}
            <Card glass className="mb-lg">
                <h3 className="heading-3 mb-md">Tren Pendapatan Harian</h3>
                <RevenueChart data={dailyRevenueData} />
            </Card>

            {/* Branch Comparison */}
            <Card glass className="mb-lg">
                <h3 className="heading-3 mb-md">Perbandingan Pendapatan per Cabang</h3>
                <BranchComparisonChart data={branchComparisonData} />
            </Card>

            {/* Two Column Layout */}
            <div className="grid md:grid-cols-2 gap-lg">
                {/* Top Services */}
                <Card glass>
                    <h3 className="heading-3 mb-md">Top 5 Layanan Terlaris</h3>
                    {topServices.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: 'var(--spacing-xl)',
                            color: 'var(--color-text-muted)'
                        }}>
                            <p>Belum ada data layanan</p>
                        </div>
                    ) : (
                        <div className="grid gap-md">
                            {topServices.map((item, index) => (
                                <div
                                    key={item.service.id}
                                    className="card"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--spacing-md)',
                                        padding: 'var(--spacing-md)'
                                    }}
                                >
                                    <div style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '50%',
                                        background: 'var(--gradient-primary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 700,
                                        color: 'white',
                                        flexShrink: 0
                                    }}>
                                        {index + 1}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                                            {item.service.name}
                                        </div>
                                        <div style={{
                                            fontSize: 'var(--font-size-sm)',
                                            color: 'var(--color-text-secondary)'
                                        }}>
                                            {item.count}x terjual
                                        </div>
                                    </div>
                                    <div style={{
                                        fontWeight: 700,
                                        color: 'var(--color-primary-light)',
                                        textAlign: 'right'
                                    }}>
                                        {formatCurrency(item.revenue)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                {/* Inventory Status */}
                <Card glass>
                    <h3 className="heading-3 mb-md">Status Inventory</h3>

                    {/* Summary */}
                    <div className="grid grid-cols-2 gap-md mb-md">
                        <div className="card" style={{
                            background: 'var(--color-bg-tertiary)',
                            textAlign: 'center',
                            padding: 'var(--spacing-md)'
                        }}>
                            <div style={{
                                fontSize: 'var(--font-size-2xl)',
                                fontWeight: 700,
                                color: 'var(--color-text-primary)'
                            }}>
                                {kpis.totalInventoryItems}
                            </div>
                            <div style={{
                                fontSize: 'var(--font-size-sm)',
                                color: 'var(--color-text-secondary)'
                            }}>
                                Total Item
                            </div>
                        </div>

                        <div className="card" style={{
                            background: kpis.lowStockCount > 0
                                ? 'rgba(245, 158, 11, 0.1)'
                                : 'var(--color-bg-tertiary)',
                            borderColor: kpis.lowStockCount > 0 ? 'var(--color-warning)' : 'var(--color-border)',
                            textAlign: 'center',
                            padding: 'var(--spacing-md)'
                        }}>
                            <div style={{
                                fontSize: 'var(--font-size-2xl)',
                                fontWeight: 700,
                                color: kpis.lowStockCount > 0 ? 'var(--color-warning)' : 'var(--color-success)'
                            }}>
                                {kpis.lowStockCount}
                            </div>
                            <div style={{
                                fontSize: 'var(--font-size-sm)',
                                color: 'var(--color-text-secondary)'
                            }}>
                                Stok Rendah
                            </div>
                        </div>
                    </div>

                    {/* Low stock items */}
                    {kpis.lowStockCount > 0 && (
                        <>
                            <div style={{
                                marginBottom: 'var(--spacing-sm)',
                                fontSize: 'var(--font-size-sm)',
                                fontWeight: 600,
                                color: 'var(--color-text-secondary)'
                            }}>
                                Item yang Perlu Restock:
                            </div>
                            <div className="grid gap-sm">
                                {(inventory || [])
                                    .filter(item => item.currentStock < item.minStock)
                                    .slice(0, 5)
                                    .map(item => (
                                        <div
                                            key={item.id}
                                            className="card"
                                            style={{
                                                padding: 'var(--spacing-sm)',
                                                borderLeft: '3px solid var(--color-warning)'
                                            }}
                                        >
                                            <div style={{
                                                fontSize: 'var(--font-size-sm)',
                                                fontWeight: 600,
                                                marginBottom: '2px'
                                            }}>
                                                {item.name}
                                            </div>
                                            <div style={{
                                                fontSize: 'var(--font-size-xs)',
                                                color: 'var(--color-text-muted)'
                                            }}>
                                                Stok: {item.currentStock} {item.unit} (Min: {item.minStock})
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </>
                    )}

                    {kpis.lowStockCount === 0 && (
                        <div style={{
                            textAlign: 'center',
                            padding: 'var(--spacing-lg)',
                            color: 'var(--color-success)'
                        }}>
                            <div style={{ fontSize: '2rem', marginBottom: 'var(--spacing-sm)' }}>✅</div>
                            <div style={{ fontWeight: 600 }}>Semua Stok Aman</div>
                        </div>
                    )}
                </Card>
            </div>

            {/* Profit/Loss Summary */}
            <Card glass style={{ marginTop: 'var(--spacing-lg)' }}>
                <h3 className="heading-3 mb-md">Ringkasan Laba-Rugi</h3>
                <div className="grid md:grid-cols-3 gap-lg">
                    <div>
                        <div style={{
                            fontSize: 'var(--font-size-sm)',
                            color: 'var(--color-text-secondary)',
                            marginBottom: 'var(--spacing-xs)'
                        }}>
                            Total Pendapatan
                        </div>
                        <div style={{
                            fontSize: 'var(--font-size-2xl)',
                            fontWeight: 700,
                            color: 'var(--color-text-primary)'
                        }}>
                            {formatCurrency(kpis.totalRevenue)}
                        </div>
                    </div>

                    <div>
                        <div style={{
                            fontSize: 'var(--font-size-sm)',
                            color: 'var(--color-text-secondary)',
                            marginBottom: 'var(--spacing-xs)'
                        }}>
                            Total Insentif Terapis
                        </div>
                        <div style={{
                            fontSize: 'var(--font-size-2xl)',
                            fontWeight: 700,
                            color: 'var(--color-warning)'
                        }}>
                            {formatCurrency(kpis.totalIncentives)}
                        </div>
                    </div>

                    <div>
                        <div style={{
                            fontSize: 'var(--font-size-sm)',
                            color: 'var(--color-text-secondary)',
                            marginBottom: 'var(--spacing-xs)'
                        }}>
                            Laba Bersih
                        </div>
                        <div style={{
                            fontSize: 'var(--font-size-2xl)',
                            fontWeight: 700,
                            color: 'var(--color-success)'
                        }}>
                            {formatCurrency(kpis.netProfit)}
                        </div>
                    </div>
                </div>

                <div className="card" style={{
                    marginTop: 'var(--spacing-lg)',
                    background: 'var(--color-bg-tertiary)',
                    padding: 'var(--spacing-md)'
                }}>
                    <div style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-xs)' }}>
                        <strong>Margin Laba:</strong> {((kpis.netProfit / kpis.totalRevenue) * 100).toFixed(1)}%
                    </div>
                    <div style={{
                        width: '100%',
                        height: '8px',
                        background: 'var(--color-bg-secondary)',
                        borderRadius: 'var(--radius-full)',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            width: `${(kpis.netProfit / kpis.totalRevenue) * 100}%`,
                            height: '100%',
                            background: 'var(--gradient-success)',
                            transition: 'width 0.3s ease'
                        }} />
                    </div>
                </div>
            </Card>
        </div>
    );
}
