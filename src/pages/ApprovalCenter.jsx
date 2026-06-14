import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { formatDate, formatTime, formatCurrency } from '../utils/formatters';
import Modal from '../components/common/Modal';

export default function ApprovalCenter() {
    const { 
        approvals, 
        updateApproval, 
        rekaps, setRekaps, 
        setPembukuan, 
        currentUser,
        hasPermission,
        bookings,
        services,
        therapists
    } = useAppContext();

    const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'history'
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

    const getTransactionAmount = (approval) => {
        if (approval.amount && approval.amount > 0) return approval.amount;
        const rowId = approval.payload?.rowId;
        if (rowId) {
            const rekap = rekaps.find(r => r.id === rowId);
            if (rekap) return rekap.amount || 0;
        }
        return 0;
    };

    const handleCardClick = (approval) => {
        const rowId = approval.payload?.rowId;
        if (!rowId) return;
        
        // Find rekap
        const rekap = rekaps.find(r => r.id === rowId);
        if (!rekap) return;
        
        // Find booking
        const booking = bookings.find(b => b.id === rekap.bookingId);
        if (!booking) {
            alert('Data booking tidak ditemukan.');
            return;
        }
        
        setSelectedBooking(booking);
        setIsBookingModalOpen(true);
    };

    const pendingApprovals = (approvals || []).filter(a => a.status === 'pending');
    const historyApprovals = (approvals || []).filter(a => a.status !== 'pending').sort((a, b) => new Date(b.approvedAt || b.requestedAt) - new Date(a.approvedAt || a.requestedAt));

    const handleApprove = (approval) => {
        if (!hasPermission('delete_finance')) {
            alert('Anda tidak memiliki akses untuk menyetujui transaksi.');
            return;
        }

        if (confirm(`Yakin ingin menyetujui ${approval.title}?`)) {
            const now = new Date().toISOString();
            
            // Execute the action (Set Paid)
            if (approval.type === 'set_paid') {
                const rowId = approval.payload?.rowId;
                const txDate = approval.payload?.transactionDate;
                if (rowId) {
                    const paidAtIso = txDate
                        ? new Date(txDate + 'T00:00:00').toISOString()
                        : now;

                    setRekaps(prev => prev.map(x => x.id === rowId ? { ...x, status: 'paid', paidAt: paidAtIso, receipt: null } : x));
                    const r = (rekaps || []).find(x => x.id === rowId);
                    if (r) {
                        const entry = {
                            id: `pb-${Date.now()}`,
                            rekapId: rowId,
                            bookingCode: r?.bookingCode || null,
                            transactionRef: r?.transactionRef || null,
                            therapistId: r?.therapistId,
                            therapistName: r?.therapistName,
                            minutes: r?.minutes,
                            amount: r?.amount,
                            paidAt: paidAtIso,
                            receipt: null
                        };
                        setPembukuan(prev => [entry, ...prev]);
                    }
                }
            }

            // Mark as approved
            updateApproval(approval.id, {
                status: 'approved',
                approverName: currentUser?.full_name || currentUser?.username || 'Admin',
                approvedAt: now
            });
        }
    };

    const handleReject = (approval) => {
        if (!hasPermission('delete_finance')) {
            alert('Anda tidak memiliki akses untuk menolak transaksi.');
            return;
        }

        if (confirm(`Yakin ingin MENOLAK ${approval.title}?`)) {
            updateApproval(approval.id, {
                status: 'rejected',
                approverName: currentUser?.full_name || currentUser?.username || 'Admin',
                approvedAt: new Date().toISOString()
            });
        }
    };

    return (
        <div className="container" style={{ padding: 'var(--spacing-lg) var(--spacing-md)', paddingBottom: 'calc(var(--bottom-nav-height) + var(--spacing-xl))' }}>
            <div className="flex items-center justify-between mb-lg">
                <div>
                    <h2 className="heading-2" style={{ marginBottom: 'var(--spacing-xs)' }}>
                        Approval Center
                    </h2>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                        Pusat persetujuan pelunasan transaksi.
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-sm mb-lg overflow-x-auto" style={{ paddingBottom: '4px' }}>
                <button
                    className={`btn ${activeTab === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveTab('pending')}
                    style={{ whiteSpace: 'nowrap', position: 'relative' }}
                >
                    Menunggu Persetujuan
                    {pendingApprovals.length > 0 && (
                        <span style={{ 
                            marginLeft: '8px', 
                            background: activeTab === 'pending' ? 'rgba(255,255,255,0.2)' : '#ef4444', 
                            color: activeTab === 'pending' ? 'inherit' : 'white',
                            padding: '2px 8px', 
                            borderRadius: '12px', 
                            fontSize: '0.75rem' 
                        }}>
                            {pendingApprovals.length}
                        </span>
                    )}
                </button>
                <button
                    className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveTab('history')}
                    style={{ whiteSpace: 'nowrap' }}
                >
                    Riwayat Approval
                </button>
            </div>

            {/* Content: Pending */}
            {activeTab === 'pending' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 'var(--spacing-md)' }}>
                    {pendingApprovals.length === 0 ? (
                        <div className="card text-center" style={{ gridColumn: '1 / -1', padding: 'var(--spacing-xl)', color: 'var(--color-text-muted)' }}>
                            <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-md)' }}>✅</div>
                            <p>Tidak ada pengajuan persetujuan saat ini.</p>
                        </div>
                    ) : (
                        pendingApprovals.map(approval => (
                            <div key={approval.id} className="card" style={{ borderLeft: '4px solid var(--color-warning)', padding: 'var(--spacing-sm)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                <div 
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => handleCardClick(approval)}
                                    title="Klik untuk melihat detail booking"
                                >
                                    <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px', lineHeight: 1.2 }}>
                                        {approval.title}
                                    </h4>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                                        <div><strong>Dari:</strong> {approval.requesterName}</div>
                                        <div>{formatDate(approval.requestedAt)} {formatTime(approval.requestedAt)}</div>
                                        {approval.payload?.transactionDate && (
                                            <div style={{ marginTop: '2px', color: 'var(--color-warning)', fontWeight: 600 }}>
                                                Tgl Transaksi: {formatDate(approval.payload.transactionDate)}
                                            </div>
                                        )}
                                        <div className="mt-xs">
                                            <span style={{ color: 'var(--color-primary-light)', fontWeight: 700, fontSize: '0.85rem' }}>
                                                {formatCurrency(getTransactionAmount(approval))}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '4px', marginTop: '12px' }}>
                                    <button 
                                        className="btn btn-sm" 
                                        style={{ flex: 1, padding: '4px', fontSize: '0.7rem', background: 'transparent', color: '#ef4444', border: '1px solid #ef4444' }}
                                        onClick={() => handleReject(approval)}
                                    >
                                        ✖ Tolak
                                    </button>
                                    <button 
                                        className="btn btn-sm" 
                                        style={{ flex: 1, padding: '4px', fontSize: '0.7rem', background: '#10b981', color: 'white', border: 'none' }}
                                        onClick={() => handleApprove(approval)}
                                    >
                                        ✓ Setujui
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Content: History */}
            {activeTab === 'history' && (
                <div className="card table-container" style={{ overflowX: 'auto' }}>
                    <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                                <th style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--color-text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>Tanggal & Waktu</th>
                                <th style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Judul</th>
                                <th style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--color-text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>Pemohon</th>
                                <th style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--color-text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>Approver</th>
                                <th style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--color-text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>Jumlah</th>
                                <th style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--color-text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {historyApprovals.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: 'var(--spacing-lg)', color: 'var(--color-text-muted)' }}>
                                        Belum ada riwayat approval.
                                    </td>
                                </tr>
                            ) : (
                                historyApprovals.map(approval => (
                                    <tr 
                                        key={approval.id} 
                                        style={{ borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }}
                                        onClick={() => handleCardClick(approval)}
                                        title="Klik untuk melihat detail booking"
                                    >
                                        <td style={{ padding: '8px 10px', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                                            <div style={{ fontWeight: 500, fontSize: '0.8rem' }}>{formatDate(approval.approvedAt || approval.requestedAt)}</div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                                                {formatTime(approval.approvedAt || approval.requestedAt)}
                                            </div>
                                        </td>
                                        <td style={{ padding: '8px 10px', verticalAlign: 'middle', fontSize: '0.8rem' }}>{approval.title}</td>
                                        <td style={{ padding: '8px 10px', whiteSpace: 'nowrap', verticalAlign: 'middle', fontSize: '0.8rem' }}>{approval.requesterName}</td>
                                        <td style={{ padding: '8px 10px', whiteSpace: 'nowrap', verticalAlign: 'middle', fontSize: '0.8rem' }}>{approval.approverName || '-'}</td>
                                        <td style={{ padding: '8px 10px', fontWeight: 600, whiteSpace: 'nowrap', verticalAlign: 'middle', fontSize: '0.8rem' }}>
                                            {formatCurrency(getTransactionAmount(approval))}
                                        </td>
                                        <td style={{ padding: '8px 10px', verticalAlign: 'middle' }}>
                                            <span style={{
                                                display: 'inline-block',
                                                padding: '3px 8px',
                                                borderRadius: '10px',
                                                fontSize: '0.72rem',
                                                fontWeight: 600,
                                                whiteSpace: 'nowrap',
                                                background: approval.status === 'approved' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                                color: approval.status === 'approved' ? '#10b981' : '#ef4444',
                                                border: approval.status === 'approved' ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.3)'
                                            }}>
                                                {approval.status === 'approved' ? '✓ Disetujui' : '✖ Ditolak'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
            {/* View Booking Modal */}
            <Modal
                isOpen={isBookingModalOpen}
                onClose={() => setIsBookingModalOpen(false)}
                title={selectedBooking ? `Detail Booking - ${selectedBooking.bookingCode || 'Tanpa Kode'}` : 'Detail Booking'}
            >
                {selectedBooking && (() => {
                    const bookedServices = services.filter(s => (selectedBooking.serviceIds || [selectedBooking.serviceId]).includes(s.id));
                    const therapist = therapists.find(t => t.id === selectedBooking.therapistId);
                    return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Kode Booking</div>
                                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-primary-light)' }}>{selectedBooking.bookingCode || '-'}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Status</div>
                                    <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                                        <span style={{
                                            display: 'inline-block',
                                            padding: '2px 8px',
                                            borderRadius: '8px',
                                            fontSize: '0.75rem',
                                            background: selectedBooking.status === 'completed' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                                            color: selectedBooking.status === 'completed' ? '#10b981' : '#6366f1'
                                        }}>
                                            {selectedBooking.status.toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--spacing-sm)' }}>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Tanggal</div>
                                    <div style={{ fontSize: '0.9rem' }}>{formatDate(selectedBooking.date)}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Waktu / Jam</div>
                                    <div style={{ fontSize: '0.9rem' }}>{formatTime(selectedBooking.time)} WIB</div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--spacing-sm)' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Pelanggan</div>
                                <div style={{ fontSize: '1rem', fontWeight: 600 }}>{selectedBooking.customerName}</div>
                                {selectedBooking.customerPhone && (
                                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>📞 {selectedBooking.customerPhone}</div>
                                )}
                                {selectedBooking.gender && (
                                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>👤 Gender: {selectedBooking.gender}</div>
                                )}
                                {selectedBooking.address && (
                                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>📍 Alamat: {selectedBooking.address}</div>
                                )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--spacing-sm)' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Layanan & Terapis</div>
                                <div style={{ fontSize: '0.9rem' }}>
                                    <strong>Terapis:</strong> {therapist?.name || '-'}
                                </div>
                                <div style={{ fontSize: '0.9rem', marginTop: '4px' }}>
                                    <strong>Daftar Layanan:</strong>
                                    <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                                        {bookedServices.map((s, idx) => (
                                            <li key={s.id || idx} style={{ fontSize: '0.85rem' }}>
                                                {s.name} - <span style={{ color: 'var(--color-primary-light)' }}>{formatCurrency(s.price)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--spacing-sm)' }}>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Metode Pembayaran</div>
                                    <div style={{ fontSize: '0.9rem' }}>{selectedBooking.paymentMethod || 'Cash'}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Total Biaya</div>
                                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-success)' }}>
                                        {formatCurrency(selectedBooking.totalPrice)}
                                    </div>
                                </div>
                            </div>

                            {selectedBooking.notes && (
                                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--spacing-sm)' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Catatan</div>
                                    <div style={{ fontSize: '0.85rem', fontStyle: 'italic', marginTop: '2px' }}>"{selectedBooking.notes}"</div>
                                </div>
                            )}
                        </div>
                    );
                })()}
            </Modal>
        </div>
    );
}
