import React, { useState, useMemo } from 'react';
import Card from '../components/common/Card';
import { StatCard } from '../components/common/Card';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useAppContext } from '../context/AppContext';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';
import { generateTherapistSlipPDF } from '../utils/exportPDF';
import { calculateTherapistIncome } from '../utils/calculations';

export default function Pembukuan() {
    const {
        pembukuan, setPembukuan,
        expenses, setExpenses,
        rekaps, setRekaps,
        therapists, branchBookings, services,
        selectedBranch,
        hasPermission
    } = useAppContext();

    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [form, setForm] = useState({ category: 'operasional', vendor: '', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });

    // Modal states
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [previewRekapId, setPreviewRekapId] = useState(null);
    const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'unpaid', 'paid', 'expense'

    // Handle status change directly (Lunas / Belum Lunas)
    const handleStatusChange = (row, newStatus) => {
        if (newStatus === 'paid') {
            try {
                setRekaps(prev => prev.map(x => x.id === row.id ? { ...x, status: 'paid', paidAt: new Date().toISOString(), receipt: null } : x));
                const r = (rekaps || []).find(x => x.id === row.id);
                const entry = {
                    id: `pb-${Date.now()}`,
                    rekapId: row.id,
                    therapistId: r?.therapistId,
                    therapistName: r?.therapistName,
                    minutes: r?.minutes,
                    amount: r?.amount,
                    paidAt: new Date().toISOString(),
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
        const entry = {
            id: `exp-${Date.now()}`,
            category: form.category,
            vendor: form.vendor,
            amount: Number(form.amount) || 0,
            date: form.date,
            notes: form.notes
        };
        setExpenses(prev => [entry, ...prev]);
        setForm({ category: 'operasional', vendor: '', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
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

        // Paid pembukuan entries (filter by selected date)
        (pembukuan || []).filter(p => (p.paidAt || '').split('T')[0] === selectedDate).forEach(p => {
            rows.push({
                id: p.id,
                type: 'income',
                status: 'paid',
                label: p.therapistName || 'Terapis',
                detail: `${p.minutes || 0} menit`,
                amount: p.amount || 0,
                date: p.paidAt || '',
                sortDate: p.paidAt || '',
                receipt: p.receipt,
                raw: p
            });
        });

        // Expenses (filter by selected date)
        (expenses || []).filter(x => x.date === selectedDate).forEach(x => {
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
    }, [rekaps, pembukuan, expenses, selectedDate]);

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
        const paidTotal = (pembukuan || []).filter(p => (p.paidAt || '').split('T')[0] === selectedDate).reduce((s, p) => s + (p.amount || 0), 0);
        const expenseTotal = (expenses || []).filter(x => x.date === selectedDate).reduce((s, x) => s + (x.amount || 0), 0);
        return {
            unpaidTotal,
            paidTotal,
            expenseTotal,
            netBalance: paidTotal - expenseTotal
        };
    }, [rekaps, pembukuan, expenses, selectedDate]);

    // Counts for tab badges
    const unpaidCount = (rekaps || []).filter(r => r.status === 'unpaid').length;

    // Handle print slip
    const handlePrintSlip = (row) => {
        const therapist = (therapists || []).find(t => t.id === row.raw?.therapistId);
        if (!therapist) return;
        const income = calculateTherapistIncome(therapist, branchBookings, services);
        const pdfBlobUrl = generateTherapistSlipPDF(therapist, income, selectedBranch);
        setPreviewPdfUrl(pdfBlobUrl);
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
                    <label className="label">Pilih Tanggal</label>
                    <input type="date" className="input" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{ maxWidth: 300 }} />
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

            {/* Tambah Pengeluaran Form */}
            {hasPermission('create_finance') && (
                <Card glass className="mb-lg">
                    <h3 className="heading-3">Tambah Pengeluaran</h3>
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
                            <button className="btn btn-primary" type="submit">Simpan Pengeluaran</button>
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
                                            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
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
                                                                display: 'inline-block',
                                                                padding: '5px 10px',
                                                                borderRadius: 6,
                                                                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                                                color: '#fff',
                                                                fontSize: '0.75rem',
                                                                fontWeight: 600,
                                                                whiteSpace: 'nowrap'
                                                            }}>📤 Upload Bukti</span>
                                                        </label>
                                                        <button
                                                            onClick={() => handleStatusChange(row, 'paid')}
                                                            style={{
                                                                padding: '5px 10px',
                                                                borderRadius: 6,
                                                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                                                color: '#fff',
                                                                border: 'none',
                                                                fontSize: '0.75rem',
                                                                fontWeight: 600,
                                                                cursor: 'pointer',
                                                                whiteSpace: 'nowrap'
                                                            }}
                                                        >✓ Set Lunas</button>
                                                    </>
                                                )}
                                                {/* Paid: Cetak Slip, Lihat Bukti, & Set Belum Lunas */}
                                                {row.status === 'paid' && (
                                                    <>
                                                        <button
                                                            onClick={() => handlePrintSlip(row)}
                                                            style={{
                                                                padding: '5px 10px',
                                                                borderRadius: 6,
                                                                background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))',
                                                                color: '#fff',
                                                                border: 'none',
                                                                fontSize: '0.75rem',
                                                                fontWeight: 600,
                                                                cursor: 'pointer',
                                                                whiteSpace: 'nowrap'
                                                            }}
                                                        >📄 Cetak Slip</button>
                                                        {row.receipt && (
                                                            <button
                                                                onClick={() => { setPreviewImage(row.receipt); setPreviewRekapId(null); setPreviewModalOpen(true); }}
                                                                style={{
                                                                    padding: '5px 10px',
                                                                    borderRadius: 6,
                                                                    background: 'rgba(255,255,255,0.08)',
                                                                    color: 'var(--color-text-secondary)',
                                                                    border: '1px solid var(--color-border)',
                                                                    fontSize: '0.75rem',
                                                                    fontWeight: 600,
                                                                    cursor: 'pointer',
                                                                    whiteSpace: 'nowrap'
                                                                }}
                                                            >🖼 Bukti</button>
                                                        )}
                                                        <button
                                                            onClick={() => handleStatusChange(row, 'unpaid')}
                                                            style={{
                                                                padding: '5px 10px',
                                                                borderRadius: 6,
                                                                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                                                color: '#fff',
                                                                border: 'none',
                                                                fontSize: '0.75rem',
                                                                fontWeight: 600,
                                                                cursor: 'pointer',
                                                                whiteSpace: 'nowrap'
                                                            }}
                                                        >⏳ Set Belum Lunas</button>
                                                    </>
                                                )}
                                                {/* Expense: no action for now */}
                                                {row.status === 'expense' && (
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
                                    setRekaps(prev => prev.map(x => x.id === previewRekapId ? { ...x, status: 'paid', paidAt: new Date().toISOString(), receipt: previewImage } : x));
                                    const r = (rekaps || []).find(x => x.id === previewRekapId);
                                    const entry = {
                                        id: `pb-${Date.now()}`,
                                        rekapId: previewRekapId,
                                        therapistId: r?.therapistId,
                                        therapistName: r?.therapistName,
                                        minutes: r?.minutes,
                                        amount: r?.amount,
                                        paidAt: new Date().toISOString(),
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
