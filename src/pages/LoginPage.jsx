import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { user, companyName } = useAuth();
  const navigate = useNavigate();

  if (user) return <Navigate to="/dashboard" />;

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="flex-center" style={{ height: '100vh', padding: '1rem' }}>
      <div className="glass animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem' }}>
        <h1 className="text-gradient" style={{ marginBottom: '0.25rem', fontSize: '1.75rem' }}>{companyName || 'Welcome'}</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem', fontWeight: 500 }}>System Login</p>
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Email Address</label>
            <input 
              type="email" 
              placeholder="admin@micro.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div style={{ color: 'var(--error)', fontSize: '0.85rem' }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '0.5rem' }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '2px', color: 'var(--text-secondary)', opacity: 0.3 }}>inTerms</span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
