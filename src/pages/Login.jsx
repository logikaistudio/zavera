import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { isSupabaseEnabled } from '../utils/supabaseClient';

// Inline SVG Icons
const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#9ca3af' }}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const LockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#9ca3af' }}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
  </svg>
);

const EyeIcon = ({ show }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#9ca3af' }}>
    {show ? (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
        <line x1="1" y1="1" x2="23" y2="23"></line>
      </>
    )}
  </svg>
);

const LogInIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'white' }}>
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
    <polyline points="10 17 15 12 10 7"></polyline>
    <line x1="15" y1="12" x2="3" y2="12"></line>
  </svg>
);

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAppContext();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const success = await login(username, password);
    setLoading(false);
    if (success) {
      navigate('/dashboard');
    } else {
      setError('Username atau password salah.');
    }
  };

  return (
    <div 
      style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#09090b', // Almost black
        backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.25), transparent 50%), radial-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px)',
        backgroundSize: '100% 100%, 24px 24px',
        position: 'relative'
      }}
    >
      {/* Container for Logo + Form */}
      <div style={{ width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10 }}>
        
        {/* Header/Logo Area */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px', marginTop: '64px' }}>
          <img 
            src="/zavera-logo.png" 
            alt="Zavera Logo" 
            style={{ 
              width: '300px', 
              height: '300px', 
              objectFit: 'contain',
              marginBottom: '2px',
              filter: 'drop-shadow(0 0 16px rgba(255,255,255,0.15))'
            }}
          />
          <p style={{ color: '#818cf8', fontSize: '30px', fontWeight: '600', letterSpacing: '0.5px' }}>Spa Management Portal</p>
        </div>

        {/* Login Card (Glassmorphism Dark) */}
        <div style={{ 
          backgroundColor: 'rgba(24, 24, 27, 0.65)', 
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '20px', 
          padding: '36px', 
          width: '100%',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 20px rgba(99, 102, 241, 0.1)'
        }}>
          <h2 style={{ color: '#f8fafc', fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>Masuk ke Akun Anda</h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '28px' }}>Masukkan kredensial untuk melanjutkan</p>

          {!isSupabaseEnabled() && (
            <div style={{ 
                backgroundColor: 'rgba(245, 158, 11, 0.1)', 
                color: '#fbbf24', 
                padding: '12px', 
                borderRadius: '10px', 
                fontSize: '13px', 
                marginBottom: '24px', 
                textAlign: 'center', 
                border: '1px solid rgba(245, 158, 11, 0.2)' 
            }}>
              ⚠️ Mode Data Simulasi Aktif (Supabase belum terhubung).
            </div>
          )}

          {error && (
            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#f87171', padding: '12px', borderRadius: '10px', fontSize: '14px', marginBottom: '24px', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            
            {/* Username Field */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Username</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <div style={{ position: 'absolute', left: '16px' }}>
                  <UserIcon />
                </div>
                <input 
                  type="text" 
                  placeholder="Masukkan username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  style={{ 
                    width: '100%', 
                    padding: '14px 16px 14px 46px', 
                    borderRadius: '12px', 
                    border: '1px solid rgba(255, 255, 255, 0.12)', 
                    fontSize: '15px',
                    outline: 'none',
                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                    color: '#f8fafc',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#6366f1';
                    e.target.style.boxShadow = '0 0 0 2px rgba(99, 102, 241, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* Password Field */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Password</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <div style={{ position: 'absolute', left: '16px' }}>
                  <LockIcon />
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ 
                    width: '100%', 
                    padding: '14px 46px 14px 46px', 
                    borderRadius: '12px', 
                    border: '1px solid rgba(255, 255, 255, 0.12)', 
                    fontSize: '15px',
                    outline: 'none',
                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                    color: '#f8fafc',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#6366f1';
                    e.target.style.boxShadow = '0 0 0 2px rgba(99, 102, 241, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <div 
                  style={{ position: 'absolute', right: '16px', cursor: 'pointer', display: 'flex', padding: '4px' }}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <EyeIcon show={showPassword} />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={loading}
              style={{ 
                marginTop: '12px',
                padding: '14px', 
                background: loading ? '#4b5563' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', 
                color: 'white', 
                border: 'none', 
                borderRadius: '12px', 
                fontSize: '15px', 
                fontWeight: '600',
                letterSpacing: '0.5px',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                boxShadow: loading ? 'none' : '0 4px 14px rgba(99, 102, 241, 0.4)'
              }}
            >
              {loading ? 'Memverifikasi...' : <><LogInIcon /> Masuk</>}
            </button>

            {/* Footer text inside card */}
            <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '13px', color: '#94a3b8' }}>
              Lupa password? Hubungi <span style={{ color: '#818cf8', cursor: 'pointer', fontWeight: '500' }}>Super Admin</span>
            </div>

          </form>
        </div>
      </div>

      {/* Global Footer */}
      <div style={{ 
        position: 'absolute', 
        bottom: '24px', 
        fontSize: '13px', 
        color: 'rgba(255, 255, 255, 0.4)',
        textAlign: 'center',
        fontWeight: '500'
      }}>
        © 2026 Zavera • Powered by <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>LogikAi.studio</span>
      </div>
    </div>
  );
};

export default Login;
