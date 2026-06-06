import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';

export default function BottomNav() {
    const { rekaps, hasPermission } = useAppContext();
    const navItems = [
        { path: '/analytics', icon: '📊', label: 'Analitik', perm: 'view_analytics' },
        { path: '/services', icon: '💆', label: 'Layanan', perm: 'manage_services' },
        { path: '/scheduling', icon: '📅', label: 'Jadwal', perm: 'manage_scheduling' },
        { path: '/daily-recap', icon: '📈', label: 'Rekap', perm: 'manage_recap' },
        { path: '/pembukuan', icon: '💳', label: 'Pembukuan', perm: 'manage_finance' },
        { path: '/inventory', icon: '📦', label: 'Inventory', perm: 'manage_inventory' },
        { path: '/settings', icon: '⚙️', label: 'Pengaturan' }
    ].filter(item => !item.perm || hasPermission(item.perm));

    const today = new Date().toISOString().split('T')[0];
    const unpaidCount = (rekaps || []).filter(r => r.status === 'unpaid' && (r.createdAt||'').split('T')[0] === today).length;

    return (
        <nav
            className="glass-strong"
            style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                height: 'var(--bottom-nav-height)',
                zIndex: 100,
                borderTop: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center',
                padding: '0 var(--spacing-sm)'
            }}
        >
            {navItems.map(item => (
                <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                        isActive ? 'nav-item active' : 'nav-item'
                    }
                    style={({ isActive }) => ({
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        padding: 'var(--spacing-xs)',
                        textDecoration: 'none',
                        color: isActive ? 'var(--color-primary-light)' : 'var(--color-text-secondary)',
                        transition: 'all var(--transition-base)',
                        borderRadius: 'var(--radius-md)',
                        minWidth: '60px',
                        position: 'relative'
                    })}
                >
                    {({ isActive }) => (
                        <>
                            {isActive && (
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    width: '40px',
                                    height: '3px',
                                    background: 'var(--gradient-primary)',
                                    borderRadius: '0 0 4px 4px'
                                }} />
                            )}
                            <span style={{ fontSize: '1.5rem', position: 'relative' }}>{item.icon}
                                {item.path === '/pembukuan' && unpaidCount > 0 && (
                                    <span style={{ position: 'absolute', top: -6, right: -10, background: '#ef4444', color: '#fff', borderRadius: 12, padding: '2px 6px', fontSize: '0.65rem' }}>{unpaidCount}</span>
                                )}
                            </span>
                            <span style={{
                                fontSize: 'var(--font-size-xs)',
                                fontWeight: isActive ? 600 : 400
                            }}>
                                {item.label}
                            </span>
                        </>
                    )}
                </NavLink>
            ))}
        </nav>
    );
}
