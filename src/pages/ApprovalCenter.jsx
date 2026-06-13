import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { formatDate, formatTime, formatCurrency } from '../utils/formatters';

export default function ApprovalCenter() {
    const { 
        approvals, 
        updateApproval, 
        rekaps, setRekaps, 
        setPembukuan, 
        currentUser,
        hasPermission
    } = useAppContext();

    const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'history'

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
                if (rowId) {
                    setRekaps(prev => prev.map(x => x.id === rowId ? { ...x, status: 'paid', paidAt: now, receipt: null } : x));
                    const r = (rekaps || []).find(x => x.id === rowId);
                    if (r) {
                        const entry = {
                            id: `pb-${Date.now()}`,
                            rekapId: rowId,
                            therapistId: r?.therapistId,
                            therapistName: r?.therapistName,
                            minutes: r?.minutes,
                            amount: r?.amount,
                            paidAt: now,
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
                <div className="grid gap-md">
                    {pendingApprovals.length === 0 ? (
                        <div className="card text-center" style={{ padding: 'var(--spacing-xl)', color: 'var(--color-text-muted)' }}>
                            <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-md)' }}>✅</div>
                            <p>Tidak ada pengajuan persetujuan saat ini.</p>
                        </div>
                    ) : (
                        pendingApprovals.map(approval => (
                            <div key={approval.id} className="card" style={{ borderLeft: '4px solid var(--color-warning)' }}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>
                                            {approval.title}
                                        </h4>
                                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                                            <div><strong>Pemohon:</strong> {approval.requesterName}</div>
                                            <div><strong>Waktu:</strong> {formatDate(approval.requestedAt)} {formatTime(approval.requestedAt)}</div>
                                            <div className="mt-xs">
                                                <strong>Nilai:</strong> <span style={{ color: 'var(--color-primary-light)', fontWeight: 600 }}>Rp {formatCurrency(approval.amount)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-sm">
                                        <button 
                                            className="btn btn-sm" 
                                            style={{ background: 'transparent', color: '#ef4444', border: '1px solid #ef4444' }}
                                            onClick={() => handleReject(approval)}
                                        >
                                            ✖ Reject
                                        </button>
                                        <button 
                                            className="btn btn-sm" 
                                            style={{ background: '#10b981', color: 'white', border: 'none' }}
                                            onClick={() => handleApprove(approval)}
                                        >
                                            ✓ Approve
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Content: History */}
            {activeTab === 'history' && (
                <div className="card table-container" style={{ overflowX: 'auto' }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Tanggal & Waktu</th>
                                <th>Judul</th>
                                <th>Pemohon</th>
                                <th>Approver</th>
                                <th>Jumlah</th>
                                <th>Status Akhir</th>
                            </tr>
                        </thead>
                        <tbody>
                            {historyApprovals.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center" style={{ padding: 'var(--spacing-lg)' }}>
                                        Belum ada riwayat approval.
                                    </td>
                                </tr>
                            ) : (
                                historyApprovals.map(approval => (
                                    <tr key={approval.id}>
                                        <td>
                                            <div style={{ fontWeight: 500 }}>{formatDate(approval.approvedAt || approval.requestedAt)}</div>
                                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                                                {formatTime(approval.approvedAt || approval.requestedAt)}
                                            </div>
                                        </td>
                                        <td>{approval.title}</td>
                                        <td>{approval.requesterName}</td>
                                        <td>{approval.approverName || '-'}</td>
                                        <td style={{ fontWeight: 600 }}>Rp {formatCurrency(approval.amount)}</td>
                                        <td>
                                            <span style={{
                                                padding: '4px 8px',
                                                borderRadius: '12px',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                background: approval.status === 'approved' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                color: approval.status === 'approved' ? '#10b981' : '#ef4444'
                                            }}>
                                                {approval.status === 'approved' ? 'Disetujui' : 'Ditolak'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
