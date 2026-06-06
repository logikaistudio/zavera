import React, { useState } from 'react';
import Card from '../components/common/Card';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useAppContext } from '../context/AppContext';

export default function Pembukuan() {
    const { pembukuan, expenses, setExpenses, hasPermission } = useAppContext();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [form, setForm] = useState({ category: 'operasional', vendor: '', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });

    const submitExpense = (e) => {
        e.preventDefault();
        const entry = { id: `exp-${Date.now()}`, category: form.category, vendor: form.vendor, amount: Number(form.amount) || 0, date: form.date, notes: form.notes };
        setExpenses(prev => [entry, ...prev]);
        setForm({ category: 'operasional', vendor: '', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
    };

    const entries = (pembukuan || []).filter(p => (p.paidAt||'').split('T')[0] === selectedDate);

    return (
        <div className="container" style={{ padding: 'var(--spacing-lg) var(--spacing-md)' }}>
            <Card glass className="mb-lg">
                <h2 className="heading-2">Pembukuan</h2>
                <div style={{ marginTop: 8 }}>
                    <label className="label">Pilih Tanggal</label>
                    <input type="date" className="input" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
                </div>
            </Card>

            {hasPermission('create_finance') && (
                <Card glass className="mb-lg">
                    <h3 className="heading-3">Tambah Pengeluaran</h3>
                    <form onSubmit={submitExpense} style={{ display: 'grid', gap: 8 }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <select className="select" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                                <option value="operasional">Operasional</option>
                                <option value="gaji">Gaji</option>
                                <option value="produk">Produk</option>
                                <option value="sewa">Sewa</option>
                                <option value="lainnya">Lainnya</option>
                            </select>
                            <input className="input" placeholder="Vendor" value={form.vendor} onChange={e => setForm({...form, vendor: e.target.value})} />
                            <input className="input" placeholder="Jumlah" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input type="date" className="input" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                            <input className="input" placeholder="Catatan" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
                            <button className="btn btn-primary" type="submit">Simpan Pengeluaran</button>
                        </div>
                    </form>
                </Card>
            )}

            <Card glass>
                <h3 className="heading-3 mb-md">Pemasukan Diterima - {formatDate(selectedDate, 'medium')}</h3>
                {entries.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--color-text-muted)' }}>
                        <p>Tidak ada penerimaan untuk tanggal ini</p>
                    </div>
                ) : (
                    <div className="grid gap-md">
                        {entries.map(e => (
                            <div key={e.id} className="card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 700 }}>{e.therapistName}</div>
                                        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>{e.minutes} menit • {formatCurrency(e.amount)}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Diterima: {new Date(e.paidAt).toLocaleString()}</div>
                                    </div>
                                    {e.receipt && (
                                        <div style={{ width: 140, height: 90, overflow: 'hidden', borderRadius: 6 }}>
                                            <img src={e.receipt} alt="bukti" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            <Card glass className="mt-lg">
                <h3 className="heading-3 mb-md">Daftar Pengeluaran - {formatDate(selectedDate, 'medium')}</h3>
                {expenses.filter(x => x.date === selectedDate).length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--color-text-muted)' }}>
                        <p>Tidak ada pengeluaran untuk tanggal ini</p>
                    </div>
                ) : (
                    <div className="grid gap-md">
                        {expenses.filter(x => x.date === selectedDate).map(x => (
                            <div key={x.id} className="card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 700 }}>{x.category} • {x.vendor}</div>
                                        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Rp {x.amount.toLocaleString('id-ID')}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{x.notes}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
}
