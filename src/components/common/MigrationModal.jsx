import React, { useState, useEffect } from 'react';
import { isSupabaseEnabled } from '../../utils/supabaseClient';

export default function MigrationModal({ onComplete }) {
    const [isOpen, setIsOpen] = useState(false);

    // Auto-show if Supabase is available
    useEffect(() => {
        console.log('MigrationModal: Supabase enabled?', isSupabaseEnabled());
        if (isSupabaseEnabled()) {
            setIsOpen(true);
        }
    }, []);

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
                background: '#fff',
                borderRadius: '8px',
                padding: '24px',
                maxWidth: '500px',
                textAlign: 'center'
            }}>
                <h2>🔄 Supabase Integration Active</h2>
                <p>Data akan tersinkron dengan Supabase PostgreSQL secara otomatis.</p>
                <button 
                    onClick={() => setIsOpen(false)}
                    style={{
                        padding: '10px 20px',
                        marginTop: '16px',
                        background: '#007bff',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    OK
                </button>
            </div>
        </div>
    );
}
