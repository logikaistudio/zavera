import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';

export default function Header() {
    const { branches, selectedBranchId, setSelectedBranchId, selectedBranch, logout, currentUser, roles } = useAppContext();
    const [showBranchMenu, setShowBranchMenu] = useState(false);

    const ROLE_STYLE_MAP = {
        superadmin: { label: 'Super Admin', color: '#f59e0b' },
        admin: { label: 'Admin', color: '#6366f1' },
        manager_cabang: { label: 'Manager Cabang', color: '#8b5cf6' },
        supervisor: { label: 'Supervisor', color: '#ec4899' },
        kasir: { label: 'Kasir', color: '#10b981' },
        terapis: { label: 'Terapis', color: '#3b82f6' }
    };

    const userRoleInfo = useMemo(() => {
        if (!currentUser) return null;
        if (ROLE_STYLE_MAP[currentUser.role]) {
            return ROLE_STYLE_MAP[currentUser.role];
        }
        const contextRole = (roles || []).find(r => r.name === currentUser.role);
        if (contextRole) {
            return { label: contextRole.label, color: contextRole.color };
        }
        return { label: currentUser.role, color: 'var(--color-text-muted)' };
    }, [currentUser, roles]);

    return (
        <header
            className="glass-strong"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                height: 'var(--header-height)',
                zIndex: 100,
                borderBottom: '1px solid var(--color-border)'
            }}
        >
            <div className="container flex items-center justify-between" style={{ height: '100%' }}>
                {/* Logo */}
                <Link to="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <img src="/zavera-logo.png" alt="Zavera" style={{
                        height: '216px',
                        width: 'auto',
                        paddingTop: '48px',
                        paddingBottom: '4px'
                    }} />
                </Link>

                {/* Controls Area */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                    {/* Branch Selector */}
                    <div style={{ position: 'relative' }}>
                        <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setShowBranchMenu(!showBranchMenu)}
                            style={{ minWidth: '200px', justifyContent: 'space-between' }}
                        >
                            <span style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}>
                                {selectedBranch?.name || 'Pilih Cabang'}
                            </span>
                            <span style={{ marginLeft: 'var(--spacing-sm)' }}>▼</span>
                        </button>

                        {showBranchMenu && (
                            <>
                                {/* Backdrop */}
                                <div
                                    style={{
                                        position: 'fixed',
                                        inset: 0,
                                        zIndex: 10
                                    }}
                                    onClick={() => setShowBranchMenu(false)}
                                />

                                {/* Menu */}
                                <div
                                    className="card"
                                    style={{
                                        position: 'absolute',
                                        top: 'calc(100% + var(--spacing-sm))',
                                        right: 0,
                                        minWidth: '280px',
                                        maxHeight: '400px',
                                        overflowY: 'auto',
                                        zIndex: 20,
                                        padding: 'var(--spacing-sm)'
                                    }}
                                >
                                    {branches.map(branch => (
                                        <button
                                            key={branch.id}
                                            className={`btn btn-secondary ${branch.id === selectedBranchId ? 'btn-primary' : ''}`}
                                            onClick={() => {
                                                setSelectedBranchId(branch.id);
                                                setShowBranchMenu(false);
                                            }}
                                            style={{
                                                width: '100%',
                                                justifyContent: 'flex-start',
                                                marginBottom: 'var(--spacing-xs)'
                                            }}
                                        >
                                            <div style={{ textAlign: 'left', width: '100%' }}>
                                                <div style={{ fontWeight: 600 }}>{branch.name}</div>
                                                <div style={{
                                                    fontSize: 'var(--font-size-xs)',
                                                    opacity: 0.7,
                                                    marginTop: '2px'
                                                }}>
                                                    {branch.location} • {branch.hotelPartner}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* User Profile Widget */}
                    {currentUser && (
                        <>
                            <style>{`
                                @media (max-width: 640px) {
                                    .header-user-info {
                                        display: none !important;
                                    }
                                    .header-user-card {
                                        padding: 0.25rem !important;
                                        background: transparent !important;
                                        border-color: transparent !important;
                                    }
                                }
                            `}</style>
                            <div 
                                className="header-user-card"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.375rem 0.875rem',
                                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    borderRadius: 'var(--radius-lg)',
                                    transition: 'all var(--transition-fast)'
                                }}
                            >
                                {/* Avatar */}
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: `linear-gradient(135deg, ${userRoleInfo?.color || 'var(--color-primary)'} 0%, var(--color-bg-tertiary) 100%)`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 700,
                                    color: '#ffffff',
                                    fontSize: 'var(--font-size-sm)',
                                    textTransform: 'uppercase',
                                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                                }}>
                                    {(currentUser.full_name || currentUser.username || 'U').charAt(0).toUpperCase()}
                                </div>
                                
                                {/* Info */}
                                <div className="header-user-info" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.2 }}>
                                    <span style={{ 
                                        color: 'var(--color-text-primary)', 
                                        fontWeight: 600, 
                                        fontSize: 'var(--font-size-sm)' 
                                    }}>
                                        {currentUser.full_name || currentUser.username}
                                    </span>
                                    <span style={{ 
                                        color: userRoleInfo?.color || 'var(--color-text-muted)', 
                                        fontSize: '10px', 
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                        marginTop: '2px'
                                    }}>
                                        {userRoleInfo?.label || currentUser.role}
                                    </span>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Logout Button */}
                    <button 
                        className="btn btn-outline btn-sm" 
                        onClick={() => logout()}
                        style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)' }}
                        onMouseOver={(e) => { e.target.style.backgroundColor = 'var(--color-error)'; e.target.style.color = 'white'; }}
                        onMouseOut={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.color = 'var(--color-error)'; }}
                    >
                        Keluar
                    </button>
                </div>
            </div>
        </header>
    );
}
