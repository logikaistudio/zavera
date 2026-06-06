import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAppContext();
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (login(username, password)) {
      navigate('/dashboard');
    } else {
      setError('Username atau password salah.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[100vh]" style={{ background: 'var(--bg-gradient)', paddingTop: '2rem' }}>
      <div className="glass-panel w-full max-w-md p-8 rounded-2xl shadow-xl flex flex-col items-center animate-fade-in" style={{ margin: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
        
        <img 
          src="/zavera-logo.png" 
          alt="Zavera Logo" 
          className="w-32 h-32 object-contain mb-6 drop-shadow-lg"
        />

        <h2 className="text-2xl font-bold text-white mb-2 tracking-wide">Selamat Datang</h2>
        <p className="text-gray-400 text-sm mb-8 text-center">Silakan masuk ke panel admin</p>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 w-full p-3 rounded-xl mb-6 text-sm text-center animate-shake">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="w-full flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider ml-1">Username</label>
            <input 
              type="text" 
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
              placeholder="Masukkan username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider ml-1">Password</label>
            <input 
              type="password" 
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
              placeholder="Masukkan password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className="w-full mt-4 py-3 px-4 rounded-xl font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'linear-gradient(to right, var(--primary), var(--secondary))' }}
          >
            Masuk
          </button>
        </form>

      </div>
    </div>
  );
};

export default Login;
