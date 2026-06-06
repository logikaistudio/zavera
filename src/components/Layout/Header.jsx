import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';

export default function Header() {
    const { branches, selectedBranchId, setSelectedBranchId, selectedBranch } = useAppContext();
    const [showBranchMenu, setShowBranchMenu] = useState(false);

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
                        paddingTop: '12px',
                        paddingBottom: '12px'
                    }} />
                </Link>

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
            </div>
        </header>
    );
}
