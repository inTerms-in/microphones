import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { user, companyName, logoutReason, setLogoutReason } = useAuth();
  const navigate = useNavigate();

  // Show logout reason if redirected from forced logout
  React.useEffect(() => {
    if (logoutReason) {
      setError(logoutReason);
      // We don't clear it immediately so it stays visible on the login page
    }
  }, [logoutReason]);

  if (user) return <Navigate to="/dashboard" />;

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    if (setLogoutReason) setLogoutReason(null); // Clear any previous forced logout reason

    const { data: { user: authUser }, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // NEW PRE-NAV GATEKEEPER: Verify profile before moving to dashboard
    try {
      const { data: prof, error: profError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (profError || !prof) {
        setError('Your account has been deleted.. Please contact administration.');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      if (!prof.is_active || !prof.can_login) {
        setError('Your account has been deactivated. Access denied.');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      // If valid, AuthContext listener will handle the state update, 
      // but we navigate here to ensure smooth flow.
      navigate('/dashboard');
    } catch (err) {
      console.error('Login verification error:', err);
      setError('An error occurred during verification.');
      await supabase.auth.signOut();
      setLoading(false);
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
          <span style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '2px', color: 'var(--text-secondary)', opacity: 0.1 }}>SST v1.0.4</span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
