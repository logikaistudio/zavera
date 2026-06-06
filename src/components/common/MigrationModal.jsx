import React, { useState, useEffect } from 'react';
import Button from '../components/common/Button';
import { migrateLocalStorageToSupabase, isSupabaseEnabled } from '../utils/storageSync';

export default function MigrationModal({ onComplete }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState(null);

    // Auto-show if Supabase is available and data hasn't been migrated yet
    useEffect(() => {
        if (isSupabaseEnabled() && !localStorage.getItem('zavera_migration_done')) {
            setIsOpen(true);
        }
    }, []);

    const handleMigrate = async () => {
        setIsLoading(true);
        try {
            const migrationResult = await migrateLocalStorageToSupabase();
            setResult(migrationResult);

            if (migrationResult.success) {
                localStorage.setItem('zavera_migration_done', 'true');
                setTimeout(() => {
                    setIsOpen(false);
                    if (onComplete) onComplete(migrationResult);
                }, 2000);
            }
        } catch (error) {
            setResult({ success: false, error: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <div style={{
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--spacing-2xl)',
                maxWidth: '500px',
                border: '1px solid var(--color-border)'
            }}>
                <h2 style={{ marginBottom: 'var(--spacing-lg)', fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>
                    🔄 Migrasi Data ke Supabase
                </h2>

                {!result && (
                    <>
                        <p style={{ marginBottom: 'var(--spacing-lg)', color: 'var(--color-text-secondary)' }}>
                            Semua data localStorage Anda akan dipindahkan ke Supabase PostgreSQL untuk sinkronisasi real-time.
                        </p>

                        <div style={{
                            background: 'var(--color-bg-secondary)',
                            padding: 'var(--spacing-md)',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: 'var(--spacing-lg)',
                            fontSize: 'var(--font-size-sm)',
                            color: 'var(--color-text-secondary)'
                        }}>
                            ℹ️ Data lokal tetap aman dan akan terus tersimpan. Anda bisa offline dan data akan sinkron otomatis saat online.
                        </div>

                        <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                            <Button
                                onClick={handleMigrate}
                                disabled={isLoading}
                                style={{
                                    flex: 1,
                                    background: 'var(--gradient-success)',
                                    color: 'white',
                                    border: 'none',
                                    padding: 'var(--spacing-md)',
                                    borderRadius: 'var(--radius-md)',
                                    cursor: isLoading ? 'not-allowed' : 'pointer',
                                    fontWeight: 600,
                                    opacity: isLoading ? 0.6 : 1
                                }}
                            >
                                {isLoading ? '⏳ Sedang migrasi...' : '✓ Lanjutkan'}
                            </Button>
                            <Button
                                onClick={() => {
                                    setIsOpen(false);
                                    localStorage.setItem('zavera_migration_skip', 'true');
                                }}
                                disabled={isLoading}
                                style={{
                                    flex: 1,
                                    background: 'var(--color-bg-secondary)',
                                    color: 'var(--color-text-primary)',
                                    border: '1px solid var(--color-border)',
                                    padding: 'var(--spacing-md)',
                                    borderRadius: 'var(--radius-md)',
                                    cursor: 'pointer',
                                    fontWeight: 600
                                }}
                            >
                                Nanti
                            </Button>
                        </div>
                    </>
                )}

                {result && (
                    <div>
                        {result.success ? (
                            <>
                                <div style={{ color: 'var(--color-success)', marginBottom: 'var(--spacing-md)' }}>
                                    ✅ Migrasi berhasil!
                                </div>
                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-md)' }}>
                                    {result.migrated.length} data source berhasil dimigrasikan:
                                </p>
                                <ul style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-md)', paddingLeft: 'var(--spacing-lg)' }}>
                                    {result.migrated.map(key => (
                                        <li key={key} style={{ marginBottom: '4px' }}>✓ {key}</li>
                                    ))}
                                </ul>
                                {result.failed.length > 0 && (
                                    <div style={{ background: '#fee2e2', color: '#dc2626', padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)' }}>
                                        ⚠️ {result.failed.length} item gagal - cek console untuk detail
                                    </div>
                                )}
                            </>
                        ) : (
                            <div style={{ color: 'var(--color-error)' }}>
                                ❌ Migrasi gagal: {result.error}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
