import React, { useState, useMemo } from 'react';
import Card from '../components/common/Card';
import { StatCard } from '../components/common/Card';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useAppContext } from '../context/AppContext';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';
import { generateTherapistSlipPDF, exportReceipt } from '../utils/exportPDF';
import { calculateTherapistIncome } from '../utils/calculations';

export default function Pembukuan() {
    const {
        pembukuan, setPembukuan,
        expenses, setExpenses,
        rekaps, setRekaps,
        therapists, branchBookings, services,
        selectedBranch,
        hasPermission,
        addApproval,
        currentUser
    } = useAppContext();

    const [filterType, setFilterType] = useState('daily');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [form, setForm] = useState({ id: null, category: 'operasional', vendor: '', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
    const [isEditingExpense, setIsEditingExpense] = useState(false);
    // Modal states
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [previewRekapId, setPreviewRekapId] = useState(null);
    const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'unpaid', 'paid', 'expense'

    // Income edit modal states
    const [editIncomeModalOpen, setEditIncomeModalOpen] = useState(false);
    const [incomeForm, setIncomeForm] = useState({ id: null, type: '', rekapId: null, therapistName: '', minutes: 0, amount: 0, transactionDate: new Date().toISOString().split('T')[0] });

    // Pay confirmation modal states
    const [payModalOpen, setPayModalOpen] = useState(false);
    const [payModalRow, setPayModalRow] = useState(null);
    const [payModalDate, setPayModalDate] = useState(new Date().toISOString().split('T')[0]);

    const handleStatusChange = (row, newStatus, transactionDate = null) => {
        if (newStatus === 'paid' && !hasPermission('delete_finance')) {
            // Kasir creates approval request instead of direct change
            addApproval({
                type: 'set_paid',
                title: `Pelunasan Transaksi - ${row.therapistName || 'Tamu'}`,
                amount: row.amount,
                requesterId: currentUser?.id,
                requesterName: currentUser?.full_name || currentUser?.username || 'Kasir',
                requestedAt: new Date().toISOString(),
                status: 'pending',
                payload: { rowId: row.id }
            });
            alert('Pengajuan pelunasan berhasil dikirim ke Approval Center untuk disetujui.');
            return;
        }

        if (!hasPermission('delete_finance') && newStatus === 'unpaid') {
            alert('Anda tidak memiliki akses untuk membatalkan pelunasan transaksi.');
            return;
        }

        if (newStatus === 'paid') {
            try {
                const now = new Date().toISOString();
                setRekaps(prev => prev.map(x => x.id === row.id ? { ...x, status: 'paid', paidAt: now, receipt: null } : x));
                const r = (rekaps || []).find(x => x.id === row.id);
                const paidAtIso = transactionDate
                    ? new Date(transactionDate + 'T00:00:00').toISOString()
                    : now;
                const entry = {
                    id: `pb-${Date.now()}`,
                    rekapId: row.id,
                    transactionRef: r?.transactionRef || null,
                    therapistId: r?.therapistId,
                    therapistName: r?.therapistName,
                    minutes: r?.minutes,
                    amount: r?.amount,
                    paidAt: paidAtIso,
                    transactionDate: transactionDate || now.split('T')[0],
                    receipt: null
                };
                setPembukuan(prev => [entry, ...prev]);
            } catch (err) {
                console.error(err);
            }
        } else if (newStatus === 'unpaid') {
            try {
                const rekapId = row.raw?.rekapId || row.id;
                if (rekapId) {
                    setRekaps(prev => prev.map(x => x.id === rekapId ? { ...x, status: 'unpaid', paidAt: null, receipt: null } : x));
                }
                setPembukuan(prev => prev.filter(x => x.id !== row.id && x.rekapId !== rekapId));
            } catch (err) {
                console.error(err);
            }
        }
    };

    // Submit expense
    const submitExpense = (e) => {
        e.preventDefault();
        if (!form.amount || Number(form.amount) <= 0) return;
        
        if (isEditingExpense && form.id) {
            setExpenses(prev => prev.map(x => x.id === form.id ? {
                ...x,
                category: form.category,
                vendor: form.vendor,
                amount: Number(form.amount) || 0,
                date: form.date,
                notes: form.notes
            } : x));
            setIsEditingExpense(false);
        } else {
            const entry = {
                id: `exp-${Date.now()}`,
                category: form.category,
                vendor: form.vendor,
                amount: Number(form.amount) || 0,
                date: form.date,
                notes: form.notes
            };
            setExpenses(prev => [entry, ...prev]);
        }
        
        setForm({ id: null, category: 'operasional', vendor: '', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
    };

    const handleDeleteExpense = (id) => {
        if (!hasPermission('delete_finance')) {
            alert('Anda tidak memiliki akses untuk menghapus data keuangan.');
            return;
        }
        if (confirm('Yakin ingin menghapus pengeluaran ini?')) {
            setExpenses(prev => prev.filter(x => x.id !== id));
        }
    };

    const handleDeleteIncome = (row) => {
        if (!hasPermission('delete_finance')) {
            alert('Anda tidak memiliki akses untuk menghapus data keuangan.');
            return;
        }
        if (confirm('Yakin ingin menghapus data pemasukan ini?')) {
            if (row.status === 'unpaid') {
                setRekaps(prev => prev.filter(x => x.id !== row.id));
            } else if (row.status === 'paid') {
                const rekapId = row.raw?.rekapId;
                if (rekapId) {
                    setRekaps(prev => prev.filter(x => x.id !== rekapId));
                }
                setPembukuan(prev => prev.filter(x => x.id !== row.id));
            }
        }
    };

    const handleEditIncome = (row) => {
        if (!hasPermission('create_finance')) {
             alert('Anda tidak memiliki akses untuk mengubah data keuangan.');
             return;
        }
        setIncomeForm({
            id: row.id,
            type: row.status, // 'unpaid' or 'paid'
            rekapId: row.status === 'paid' ? row.raw?.rekapId : row.id,
            therapistName: row.label,
            minutes: row.raw?.minutes || 0,
            amount: row.amount || 0,
        });
        setEditIncomeModalOpen(true);
    };

    const submitEditIncome = (e) => {
        e.preventDefault();
        
        if (incomeForm.type === 'unpaid') {
            setRekaps(prev => prev.map(x => x.id === incomeForm.id ? {
                ...x,
                therapistName: incomeForm.therapistName,
                minutes: Number(incomeForm.minutes) || 0,
                amount: Number(incomeForm.amount) || 0,
            } : x));
        } else if (incomeForm.type === 'paid') {
            setPembukuan(prev => prev.map(x => x.id === incomeForm.id ? {
                ...x,
                therapistName: incomeForm.therapistName,
                minutes: Number(incomeForm.minutes) || 0,
                amount: Number(incomeForm.amount) || 0,
            } : x));
            if (incomeForm.rekapId) {
                setRekaps(prev => prev.map(x => x.id === incomeForm.rekapId ? {
                    ...x,
                    therapistName: incomeForm.therapistName,
                    minutes: Number(incomeForm.minutes) || 0,
                    amount: Number(incomeForm.amount) || 0,
                } : x));
            }
        }
        
        setEditIncomeModalOpen(false);
    };

    const handleEditExpense = (expense) => {
        setForm({
            id: expense.id,
            category: expense.category,
            vendor: expense.vendor,
            amount: expense.amount,
            date: expense.date,
            notes: expense.notes
        });
        setIsEditingExpense(true);
        // Scroll to form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const applyDateFilter = (type) => {
        const today = new Date();
        if (type === 'daily') {
            const dateStr = today.toISOString().split('T')[0];
            setStartDate(dateStr);
            setEndDate(dateStr);
        } else if (type === 'weekly') {
            const first = today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1);
            const start = new Date(today.setDate(first));
            const end = new Date(today.setDate(first + 6));
            setStartDate(start.toISOString().split('T')[0]);
            setEndDate(end.toISOString().split('T')[0]);
        } else if (type === 'monthly') {
            const start = new Date(today.getFullYear(), today.getMonth(), 1);
            const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            start.setHours(0,0,0,0);
            end.setHours(23,59,59,999);
            // using local time to ISO date string format
            const startStr = `${start.getFullYear()}-${String(start.getMonth()+1).padStart(2, '0')}-01`;
            const endStr = `${end.getFullYear()}-${String(end.getMonth()+1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
            setStartDate(startStr);
            setEndDate(endStr);
        }
        setFilterType(type);
    };

    // Build unified ledger rows
    const ledgerRows = useMemo(() => {
        const rows = [];

        // Unpaid rekaps (no date filter - always show all pending)
        (rekaps || []).filter(r => r.status === 'unpaid').forEach(r => {
            rows.push({
                id: r.id,
                type: 'income',
                status: 'unpaid',
                label: r.therapistName || 'Terapis',
                detail: `${r.minutes || 0} menit`,
                amount: r.amount || 0,
                date: r.createdAt || '',
                sortDate: r.createdAt || '',
                raw: r
            });
        });

        // Paid pembukuan entries (filter by date range)
        (pembukuan || []).filter(p => {
            const d = (p.transactionDate || p.paidAt || '').split('T')[0];
            return d >= startDate && d <= endDate;
        }).forEach(p => {
            rows.push({
                id: p.id,
                type: 'income',
                status: 'paid',
                label: p.therapistName || 'Terapis',
                detail: `${p.minutes || 0} menit`,
                amount: p.amount || 0,
                date: p.transactionDate ? p.transactionDate + 'T00:00:00.000Z' : p.paidAt || '',
                sortDate: p.transactionDate || p.paidAt || '',
                receipt: p.receipt,
                raw: p
            });
        });

        // Expenses (filter by date range)
        (expenses || []).filter(x => {
            const d = x.date || '';
            return d >= startDate && d <= endDate;
        }).forEach(x => {
            rows.push({
                id: x.id,
                type: 'expense',
                status: 'expense',
                label: `${x.category || 'Pengeluaran'}`,
                detail: x.vendor ? `${x.vendor}${x.notes ? ' • ' + x.notes : ''}` : (x.notes || ''),
                amount: x.amount || 0,
                date: x.date || '',
                sortDate: x.date || '',
                raw: x
            });
        });

        // Sort: unpaid first, then by date descending
        rows.sort((a, b) => {
            if (a.status === 'unpaid' && b.status !== 'unpaid') return -1;
            if (a.status !== 'unpaid' && b.status === 'unpaid') return 1;
            return (b.sortDate || '').localeCompare(a.sortDate || '');
        });

        return rows;
    }, [rekaps, pembukuan, expenses, startDate, endDate]);

    // Filter rows by tab
    const filteredRows = useMemo(() => {
        if (activeTab === 'unpaid') return ledgerRows.filter(r => r.status === 'unpaid');
        if (activeTab === 'paid') return ledgerRows.filter(r => r.status === 'paid');
        if (activeTab === 'expense') return ledgerRows.filter(r => r.status === 'expense');
        return ledgerRows;
    }, [ledgerRows, activeTab]);

    // Summary calculations
    const summary = useMemo(() => {
        const unpaidTotal = (rekaps || []).filter(r => r.status === 'unpaid').reduce((s, r) => s + (r.amount || 0), 0);
        
        const paidTotal = (pembukuan || []).filter(p => {
            const d = (p.transactionDate || p.paidAt || '').split('T')[0];
            return d >= startDate && d <= endDate;
        }).reduce((s, p) => s + (p.amount || 0), 0);
        
        const expenseTotal = (expenses || []).filter(x => {
            const d = x.date || '';
            return d >= startDate && d <= endDate;
        }).reduce((s, x) => s + (x.amount || 0), 0);
        
        return {
            unpaidTotal,
            paidTotal,
            expenseTotal,
            netBalance: paidTotal - expenseTotal
        };
    }, [rekaps, pembukuan, expenses, startDate, endDate]);

    // Counts for tab badges
    const unpaidCount = (rekaps || []).filter(r => r.status === 'unpaid').length;

    // Handle print receipt (struk customer)
    const handlePrintReceipt = (row) => {
        const rekapId = row.raw?.rekapId || row.id;
        const booking = (branchBookings || []).find(b => b.id === rekapId);
        if (!booking) {
            alert('Data transaksi booking asli tidak ditemukan.');
            return;
        }
        
        const therapist = (therapists || []).find(t => t.id === booking.therapistId);
        const bookingServices = (booking.serviceIds || []).map(id => (services || []).find(s => s.id === id)).filter(Boolean);
        
        exportReceipt(booking, bookingServices, therapist || { name: booking.therapistName || 'Terapis' }, selectedBranch);
    };

    // Tab button style helper
    const tabStyle = (tab) => ({
        padding: '8px 16px',
        borderRadius: 8,
        border: 'none',
        cursor: 'pointer',
        fontWeight: activeTab === tab ? 700 : 500,
        fontSize: '0.85rem',
        background: activeTab === tab ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)',
        color: activeTab === tab ? '#fff' : 'var(--color-text-secondary)',
        transition: 'all 0.2s ease',
        position: 'relative'
    });

    // Status badge renderer
    const renderStatusBadge = (status) => {
        if (status === 'unpaid') {
            return <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 700, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>⏳ Belum Lunas</span>;
        }
        if (status === 'paid') {
            return <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 700, background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>✓ Lunas</span>;
        }
        if (status === 'expense') {
            return <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 700, background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>↗ Keluar</span>;
        }
        return null;
    };

    return (
        <div className="container" style={{ padding: 'var(--spacing-lg) var(--spacing-md)' }}>
            {/* Header */}
            <Card glass className="mb-lg">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="heading-2" style={{ marginBottom: 'var(--spacing-xs)' }}>Pembukuan</h2>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                            Buku Besar Keuangan — Pusat Kendali Arus Kas
                        </p>
                    </div>
                </div>
                <div style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)', flexWrap: 'wrap' }}>
                        <Button size="sm" variant={filterType === 'daily' ? 'primary' : 'outline'} onClick={() => applyDateFilter('daily')}>Hari Ini</Button>
                        <Button size="sm" variant={filterType === 'weekly' ? 'primary' : 'outline'} onClick={() => applyDateFilter('weekly')}>Minggu Ini</Button>
                        <Button size="sm" variant={filterType === 'monthly' ? 'primary' : 'outline'} onClick={() => applyDateFilter('monthly')}>Bulan Ini</Button>
                        <Button size="sm" variant={filterType === 'custom' ? 'primary' : 'outline'} onClick={() => setFilterType('custom')}>Pilih Range</Button>
                    </div>
                    {filterType === 'custom' && (
                        <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap', alignItems: 'center' }}>
                            <div>
                                <label className="label" style={{ display: 'block', fontSize: '0.8rem' }}>Mulai Tanggal</label>
                                <input type="date" className="input" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ width: 160 }} />
                            </div>
                            <div>
                                <label className="label" style={{ display: 'block', fontSize: '0.8rem' }}>Sampai Tanggal</label>
                                <input type="date" className="input" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ width: 160 }} />
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 mb-xl">
                <StatCard
                    icon="⏳"
                    label="Tagihan Belum Lunas"
                    value={formatCurrency(summary.unpaidTotal).replace('Rp', '')}
                    color="accent"
                />
                <StatCard
                    icon="💰"
                    label="Uang Masuk (Lunas)"
                    value={formatCurrency(summary.paidTotal).replace('Rp', '')}
                    color="success"
                />
                <StatCard
                    icon="💸"
                    label="Pengeluaran"
                    value={formatCurrency(summary.expenseTotal).replace('Rp', '')}
                    color="danger"
                />
                <StatCard
                    icon="📊"
                    label="Saldo Bersih"
                    value={formatCurrency(summary.netBalance).replace('Rp', '')}
                    color={summary.netBalance >= 0 ? 'primary' : 'danger'}
                />
            </div>

            {/* Tambah/Edit Pengeluaran Form */}
            {hasPermission('create_finance') && (
                <Card glass className="mb-lg" id="expense-form">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 className="heading-3">{isEditingExpense ? 'Edit Pengeluaran' : 'Tambah Pengeluaran'}</h3>
                        {isEditingExpense && (
                            <Button size="sm" variant="outline" onClick={() => {
                                setIsEditingExpense(false);
                                setForm({ id: null, category: 'operasional', vendor: '', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
                            }}>Batal Edit</Button>
                        )}
                    </div>
                    <form onSubmit={submitExpense} style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <select className="select" value={form.category} onChange={e => setForm({...form, category: e.target.value})} style={{ minWidth: 130 }}>
                                <option value="operasional">Operasional</option>
                                <option value="gaji">Gaji</option>
                                <option value="produk">Produk</option>
                                <option value="sewa">Sewa</option>
                                <option value="lainnya">Lainnya</option>
                            </select>
                            <input className="input" placeholder="Vendor" value={form.vendor} onChange={e => setForm({...form, vendor: e.target.value})} style={{ flex: 1, minWidth: 100 }} />
                            <input className="input" placeholder="Jumlah" type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} style={{ width: 120 }} />
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <input type="date" className="input" value={form.date} onChange={e => setForm({...form, date: e.target.value})} style={{ width: 160 }} />
                            <input className="input" placeholder="Catatan" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} style={{ flex: 1, minWidth: 120 }} />
                            <button className="btn btn-primary" type="submit" style={{ background: isEditingExpense ? '#f59e0b' : '' }}>
                                {isEditingExpense ? 'Simpan Perubahan' : 'Simpan Pengeluaran'}
                            </button>
                        </div>
                    </form>
                </Card>
            )}

            {/* Ledger Table */}
            <Card glass>
                <h3 className="heading-3 mb-md">Buku Besar Keuangan</h3>

                {/* Tab Filters */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                    <button style={tabStyle('all')} onClick={() => setActiveTab('all')}>
                        Semua ({ledgerRows.length})
                    </button>
                    <button style={tabStyle('unpaid')} onClick={() => setActiveTab('unpaid')}>
                        ⏳ Belum Lunas ({unpaidCount})
                    </button>
                    <button style={tabStyle('paid')} onClick={() => setActiveTab('paid')}>
                        ✓ Lunas
                    </button>
                    <button style={tabStyle('expense')} onClick={() => setActiveTab('expense')}>
                        ↗ Pengeluaran
                    </button>
                </div>

                {filteredRows.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--color-text-muted)' }}>
                        <p>Tidak ada data untuk filter ini.</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', fontSize: 'var(--font-size-sm)', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                                    <th style={{ textAlign: 'left', padding: 'var(--spacing-sm)', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>Tipe</th>
                                    <th style={{ textAlign: 'left', padding: 'var(--spacing-sm)', color: 'var(--color-text-secondary)' }}>Keterangan</th>
                                    <th style={{ textAlign: 'right', padding: 'var(--spacing-sm)', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>Nominal</th>
                                    <th style={{ textAlign: 'center', padding: 'var(--spacing-sm)', color: 'var(--color-text-secondary)' }}>Status</th>
                                    <th style={{ textAlign: 'center', padding: 'var(--spacing-sm)', color: 'var(--color-text-secondary)' }}>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRows.map(row => (
                                    <tr key={row.id} style={{
                                        borderBottom: '1px solid var(--color-border)',
                                        borderLeft: row.status === 'unpaid' ? '4px solid #f59e0b' : row.status === 'paid' ? '4px solid #10b981' : '4px solid #ef4444',
                                        backgroundColor: row.status === 'unpaid' ? 'rgba(245,158,11,0.03)' : 'transparent'
                                    }}>
                                        <td style={{ padding: 'var(--spacing-sm)', whiteSpace: 'nowrap' }}>
                                            <span style={{ fontSize: '1.1rem' }}>
                                                {row.type === 'income' ? '💰' : '💸'}
                                            </span>
                                            <span style={{ marginLeft: 6, fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                                                {row.type === 'income' ? 'Masuk' : 'Keluar'}
                                            </span>
                                        </td>
                                        <td style={{ padding: 'var(--spacing-sm)' }}>
                                            <div style={{ fontWeight: 600 }}>{row.label}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{row.detail}</div>
                                            {row.date && (
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                                    {new Date(row.date).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{
                                            padding: 'var(--spacing-sm)',
                                            textAlign: 'right',
                                            fontWeight: 700,
                                            color: row.type === 'income' ? 'var(--color-primary-light)' : '#ef4444',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {row.type === 'expense' ? '-' : '+'}{formatCurrency(row.amount)}
                                        </td>
                                        <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>
                                            {row.type === 'income' ? (
                                                <select
                                                    value={row.status}
                                                    onChange={(e) => handleStatusChange(row, e.target.value)}
                                                    style={{
                                                        display: 'inline-block',
                                                        padding: '4px 20px 4px 10px',
                                                        borderRadius: 12,
                                                        fontSize: '0.75rem',
                                                        fontWeight: 700,
                                                        background: row.status === 'paid' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                                                        color: row.status === 'paid' ? '#10b981' : '#f59e0b',
                                                        border: row.status === 'paid' ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(245,158,11,0.3)',
                                                        cursor: 'pointer',
                                                        outline: 'none',
                                                        appearance: 'none',
                                                        WebkitAppearance: 'none',
                                                        MozAppearance: 'none',
                                                        textAlign: 'center',
                                                        backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='none' stroke='${row.status === 'paid' ? '%2310b981' : '%23f59e0b'}' stroke-width='2.5' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'><path d='M19 9l-7 7-7-7' stroke-linecap='round' stroke-linejoin='round'></path></svg>")`,
                                                        backgroundRepeat: 'no-repeat',
                                                        backgroundPosition: 'right 6px center',
                                                        backgroundSize: '10px'
                                                    }}
                                                >
                                                    <option value="unpaid" style={{ background: '#1e293b', color: '#f59e0b' }}>⏳ Belum Lunas</option>
                                                    <option value="paid" style={{ background: '#1e293b', color: '#10b981' }}>✓ Lunas</option>
                                                </select>
                                            ) : (
                                                renderStatusBadge(row.status)
                                            )}
                                        </td>
                                        <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>
                                            <div style={{ 
                                                display: 'flex', 
                                                flexWrap: 'wrap',
                                                gap: '8px', 
                                                justifyContent: 'flex-start',
                                                alignItems: 'center',
                                                margin: '0 auto',
                                                width: 'max-content',
                                                maxWidth: '280px'
                                            }}>
                                                {/* Unpaid: Upload Bukti & Tandai Lunas */}
                                                {row.status === 'unpaid' && (
                                                    <>
                                                        <input type="file" accept="image/*" id={`receipt-${row.id}`} style={{ display: 'none' }} onChange={async (e) => {
                                                            const f = e.target.files && e.target.files[0];
                                                            if (!f) return;
                                                            const reader = new FileReader();
                                                            reader.onload = () => {
                                                                setPreviewImage(reader.result);
                                                                setPreviewRekapId(row.id);
                                                                setPreviewModalOpen(true);
                                                            };
                                                            reader.readAsDataURL(f);
                                                        }} />
                                                        <label htmlFor={`receipt-${row.id}`} style={{ cursor: 'pointer' }}>
                                                            <span style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                                padding: '6px 12px',
                                                                borderRadius: '8px',
                                                                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                                                color: '#fff',
                                                                fontSize: '0.75rem',
                                                                fontWeight: 600,
                                                                whiteSpace: 'nowrap',
                                                                boxShadow: '0 2px 4px rgba(59,130,246,0.2)'
                                                            }}>📤 Upload</span>
                                                        </label>
                                                        <button
                                                            onClick={() => handleStatusChange(row, 'paid')}
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                                padding: '6px 12px',
                                                                borderRadius: '8px',
                                                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                                                color: '#fff',
                                                                border: 'none',
                                                                fontSize: '0.75rem',
                                                                fontWeight: 600,
                                                                cursor: 'pointer',
                                                                whiteSpace: 'nowrap',
                                                                boxShadow: '0 2px 4px rgba(16,185,129,0.2)'
                                                            }}
                                                        >✓ Lunas</button>
                                                    </>
                                                )}
                                                {/* Paid: Cetak Slip, Lihat Bukti, & Set Belum Lunas */}
                                                {row.status === 'paid' && (
                                                    <>
                                                        <button
                                                            onClick={() => handlePrintReceipt(row)}
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                                padding: '6px 12px',
                                                                borderRadius: '8px',
                                                                background: '#374151',
                                                                color: '#fff',
                                                                border: 'none',
                                                                fontSize: '0.75rem',
                                                                fontWeight: 600,
                                                                cursor: 'pointer',
                                                                whiteSpace: 'nowrap',
                                                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                                            }}
                                                        >🖨️ Cetak</button>
                                                        {row.receipt ? (
                                                            <button
                                                                onClick={() => { setPreviewImage(row.receipt); setPreviewRekapId(null); setPreviewModalOpen(true); }}
                                                                style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px',
                                                                    padding: '6px 12px',
                                                                    borderRadius: '8px',
                                                                    background: 'rgba(255,255,255,0.05)',
                                                                    color: 'var(--color-text-primary)',
                                                                    border: '1px solid var(--color-border)',
                                                                    fontSize: '0.75rem',
                                                                    fontWeight: 600,
                                                                    cursor: 'pointer',
                                                                    whiteSpace: 'nowrap'
                                                                }}
                                                            >🖼 Bukti</button>
                                                        ) : (
                                                            <div></div>
                                                        )}
                                                        <button
                                                            onClick={() => handleStatusChange(row, 'unpaid')}
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                                padding: '6px 12px',
                                                                borderRadius: '8px',
                                                                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                                                color: '#fff',
                                                                border: 'none',
                                                                fontSize: '0.75rem',
                                                                fontWeight: 600,
                                                                cursor: 'pointer',
                                                                whiteSpace: 'nowrap',
                                                                boxShadow: '0 2px 4px rgba(245,158,11,0.2)'
                                                            }}
                                                        >↩️ Batal Lunas</button>
                                                    </>
                                                )}
                                                {/* Edit and Delete for Income */}
                                                {row.type === 'income' && hasPermission('delete_finance') && (
                                                    <>
                                                        <button
                                                            onClick={() => handleEditIncome(row)}
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                                padding: '6px 12px',
                                                                borderRadius: '8px',
                                                                background: 'rgba(59,130,246,0.1)',
                                                                color: '#3b82f6',
                                                                border: '1px solid rgba(59,130,246,0.2)',
                                                                fontSize: '0.75rem',
                                                                fontWeight: 600,
                                                                cursor: 'pointer',
                                                                whiteSpace: 'nowrap'
                                                            }}
                                                        >✏️ Edit</button>
                                                        <button
                                                            onClick={() => handleDeleteIncome(row)}
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                                padding: '6px 12px',
                                                                borderRadius: '8px',
                                                                background: 'rgba(239,68,68,0.1)',
                                                                color: '#ef4444',
                                                                border: '1px solid rgba(239,68,68,0.2)',
                                                                fontSize: '0.75rem',
                                                                fontWeight: 600,
                                                                cursor: 'pointer',
                                                                whiteSpace: 'nowrap'
                                                            }}
                                                        >🗑️ Hapus</button>
                                                    </>
                                                )}
                                                {/* Expense: Edit and Delete */}
                                                {row.status === 'expense' && hasPermission('delete_finance') && (
                                                    <>
                                                        <button
                                                            onClick={() => handleEditExpense(row.raw)}
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                                padding: '6px 12px',
                                                                borderRadius: '8px',
                                                                background: 'rgba(59,130,246,0.1)',
                                                                color: '#3b82f6',
                                                                border: '1px solid rgba(59,130,246,0.2)',
                                                                fontSize: '0.75rem',
                                                                fontWeight: 600,
                                                                cursor: 'pointer',
                                                                whiteSpace: 'nowrap'
                                                            }}
                                                        >✏️ Edit</button>
                                                        <button
                                                            onClick={() => handleDeleteExpense(row.id)}
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                                padding: '6px 12px',
                                                                borderRadius: '8px',
                                                                background: 'rgba(239,68,68,0.1)',
                                                                color: '#ef4444',
                                                                border: '1px solid rgba(239,68,68,0.2)',
                                                                fontSize: '0.75rem',
                                                                fontWeight: 600,
                                                                cursor: 'pointer',
                                                                whiteSpace: 'nowrap'
                                                            }}
                                                        >🗑️ Hapus</button>
                                                    </>
                                                )}
                                                {row.status === 'expense' && !hasPermission('delete_finance') && (
                                                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>—</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Konfirmasi Pembayaran Modal */}
            <Modal isOpen={previewModalOpen} onClose={() => { setPreviewModalOpen(false); setPreviewImage(null); setPreviewRekapId(null); }}>
                <div style={{ padding: 16 }}>
                    <h3 className="heading-3">{previewRekapId ? 'Konfirmasi Pembayaran' : 'Bukti Transfer'}</h3>
                    {previewImage && (
                        <div style={{ marginTop: 12 }}>
                            <div style={{ width: '100%', maxHeight: 400, overflow: 'hidden', borderRadius: 8, background: 'rgba(0,0,0,0.2)' }}>
                                <img src={previewImage} alt="bukti" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            </div>
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
                        <Button variant="secondary" onClick={() => { setPreviewModalOpen(false); setPreviewImage(null); setPreviewRekapId(null); }}>
                            {previewRekapId ? 'Batal' : 'Tutup'}
                        </Button>
                        {previewRekapId && (
                            <Button variant="primary" onClick={() => {
                                if (!previewRekapId) return;
                                try {
                                    const now2 = new Date().toISOString();
                                    setRekaps(prev => prev.map(x => x.id === previewRekapId ? { ...x, status: 'paid', paidAt: now2, receipt: previewImage } : x));
                                    const r = (rekaps || []).find(x => x.id === previewRekapId);
                                    const entry = {
                                        id: `pb-${Date.now()}`,
                                        rekapId: previewRekapId,
                                        transactionRef: r?.transactionRef || null,
                                        therapistId: r?.therapistId,
                                        therapistName: r?.therapistName,
                                        minutes: r?.minutes,
                                        amount: r?.amount,
                                        paidAt: now2,
                                        transactionDate: now2.split('T')[0],
                                        receipt: previewImage
                                    };
                                    setPembukuan(prev => [entry, ...prev]);
                                } catch (e) { console.error(e); }
                                setPreviewModalOpen(false);
                                setPreviewImage(null);
                                setPreviewRekapId(null);
                            }}>
                                ✓ Simpan Pembayaran
                            </Button>
                        )}
                    </div>
                </div>
            </Modal>

            {/* Pay Confirmation Modal */}
            <Modal
                isOpen={payModalOpen}
                onClose={() => { setPayModalOpen(false); setPayModalRow(null); }}
                title="Konfirmasi Pelunasan"
            >
                {payModalRow && (
                    <div style={{ padding: 'var(--spacing-md)' }}>
                        <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 10, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                            <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: 4 }}>{payModalRow.label}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{payModalRow.detail}</div>
                            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#10b981', marginTop: 6 }}>{formatCurrency(payModalRow.amount)}</div>
                            {payModalRow.raw?.transactionRef && (
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 4 }}>Ref: {payModalRow.raw.transactionRef}</div>
                            )}
                        </div>
                        <div className="mb-md">
                            <label className="label">Tanggal Transaksi</label>
                            <input
                                type="date"
                                className="input"
                                value={payModalDate}
                                onChange={e => setPayModalDate(e.target.value)}
                                max={new Date().toISOString().split('T')[0]}
                            />
                            <small style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Default: hari ini. Ubah jika transaksi terjadi di tanggal lain.</small>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <Button variant="secondary" onClick={() => { setPayModalOpen(false); setPayModalRow(null); }}>Batal</Button>
                            <Button variant="success" onClick={() => {
                                handleStatusChange(payModalRow, 'paid', payModalDate);
                                setPayModalOpen(false);
                                setPayModalRow(null);
                            }}>✓ Konfirmasi Lunas</Button>
                        </div>
                    </div>
                )}
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

            {/* Edit Income Modal */}
            <Modal isOpen={editIncomeModalOpen} onClose={() => setEditIncomeModalOpen(false)} title="Edit Pemasukan">
                <form onSubmit={submitEditIncome} style={{ padding: 'var(--spacing-md)' }}>
                    <div className="mb-md">
                        <label className="label">Keterangan / Nama Terapis</label>
                        <input className="input" value={incomeForm.therapistName} onChange={e => setIncomeForm({ ...incomeForm, therapistName: e.target.value })} required />
                    </div>
                    <div className="mb-md">
                        <label className="label">Durasi (Menit)</label>
                        <input type="number" className="input" value={incomeForm.minutes} onChange={e => setIncomeForm({ ...incomeForm, minutes: e.target.value })} required />
                    </div>
                    <div className="mb-md">
                        <label className="label">Nominal</label>
                        <input type="number" className="input" value={incomeForm.amount} onChange={e => setIncomeForm({ ...incomeForm, amount: e.target.value })} required />
                    </div>
                    <div className="mb-md">
                        <label className="label">Tanggal Transaksi</label>
                        <input type="date" className="input" value={incomeForm.transactionDate} onChange={e => setIncomeForm({ ...incomeForm, transactionDate: e.target.value })} />
                        <small style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Ubah jika perlu menyesuaikan tanggal pencatatan.</small>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <Button type="button" variant="secondary" onClick={() => setEditIncomeModalOpen(false)}>Batal</Button>
                        <Button type="submit" variant="primary">Simpan Perubahan</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
