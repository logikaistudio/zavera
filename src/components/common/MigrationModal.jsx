import React, { useState, useEffect } from 'react';
import { isSupabaseEnabled } from '../../utils/supabaseClient';
import { migrateLocalStorageToSupabase } from '../../utils/storageSync';

export default function MigrationModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [isMigrating, setIsMigrating] = useState(false);
    const [migrationResult, setMigrationResult] = useState(null);

    useEffect(() => {
        // Show if Supabase is enabled and hasn't been migrated yet (for this session)
        if (isSupabaseEnabled() && !sessionStorage.getItem('spacity_migrated')) {
            setIsOpen(true);
        }
    }, []);

    const handleMigrate = async () => {
        setIsMigrating(true);
        try {
            const result = await migrateLocalStorageToSupabase();
            setMigrationResult(result);
            if (result.success) {
                sessionStorage.setItem('spacity_migrated', 'true');
            }
        } catch (error) {
            setMigrationResult({ success: false, error: error.message });
        } finally {
            setIsMigrating(false);
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
                background: 'var(--color-bg-primary)',
                borderRadius: '8px',
                padding: '32px',
                maxWidth: '500px',
                textAlign: 'center',
                boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
            }}>
                <h2 style={{ marginBottom: '16px', fontSize: '1.5rem', fontWeight: 600 }}>🔄 Sinkronisasi Supabase</h2>
                
                {!migrationResult ? (
                    <>
                        <p style={{ marginBottom: '24px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                            Aplikasi kini terhubung dengan database Supabase. Klik tombol di bawah untuk menyinkronkan data lokal Anda (dari browser ini) ke database cloud.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button 
                                onClick={() => setIsOpen(false)}
                                disabled={isMigrating}
                                style={{
                                    padding: '10px 20px',
                                    background: 'var(--color-bg-secondary)',
                                    color: 'var(--color-text-primary)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: '6px',
                                    cursor: isMigrating ? 'not-allowed' : 'pointer',
                                    fontWeight: 500
                                }}
                            >
                                Lewati
                            </button>
                            <button 
                                onClick={handleMigrate}
                                disabled={isMigrating}
                                style={{
                                    padding: '10px 20px',
                                    background: 'var(--color-primary)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: isMigrating ? 'not-allowed' : 'pointer',
                                    fontWeight: 500
                                }}
                            >
                                {isMigrating ? 'Menyinkronkan...' : 'Sinkronisasikan Sekarang'}
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        {migrationResult.success ? (
                            <div style={{ color: 'var(--color-success)', marginBottom: '24px' }}>
                                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✅</div>
                                <p style={{ fontWeight: 500, fontSize: '1.1rem' }}>Data berhasil disinkronkan!</p>
                                <p style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '8px' }}>
                                    {migrationResult.migrated.length} tabel data telah dipindahkan ke Supabase.
                                </p>
                            </div>
                        ) : (
                            <div style={{ color: 'var(--color-error)', marginBottom: '24px' }}>
                                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>❌</div>
                                <p style={{ fontWeight: 500, fontSize: '1.1rem' }}>Sinkronisasi Gagal</p>
                                <p style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '8px' }}>
                                    {migrationResult.error}
                                </p>
                            </div>
                        )}
                        <button 
                            onClick={() => setIsOpen(false)}
                            style={{
                                padding: '10px 24px',
                                background: 'var(--color-primary)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: 500
                            }}
                        >
                            Tutup
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
