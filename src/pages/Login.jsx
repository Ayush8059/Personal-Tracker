import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';
import { handleTiltMove, handleTiltLeave } from '../utils/effects';
import ParticleBackground from '../components/ParticleBackground';
import { ShieldAlert, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const cardRef = useRef(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!isSupabaseConfigured) {
      localStorage.setItem('aethertrack_guest_session', JSON.stringify({
        user: { id: 'guest-user-uuid', email: email || 'guest@aethertrack.local' }
      }));
      navigate('/');
      setLoading(false);
      return;
    }

    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (err) throw err;
      navigate('/');
    } catch (err) {
      const isNetworkError = err.message === 'Failed to fetch' || err.message?.includes('fetch');
      setError(
        isNetworkError 
          ? 'Connection Error: Could not reach Supabase. Please verify your internet connection or .env settings.' 
          : err.message || 'Failed to sign in.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <ParticleBackground />
      <div 
        className="auth-card glass-card tilt-effect"
        ref={cardRef}
        onMouseMove={(e) => handleTiltMove(e, cardRef.current, 3)}
        onMouseLeave={() => handleTiltLeave(cardRef.current)}
      >
        <div className="auth-header">
          <div className="logo">
            <i className="fa-solid fa-cubes-three-d"></i>
          </div>
          <h2>Sign In</h2>
          <p>Access your private 3D Life Grid</p>
        </div>

        {error && (
          <div className="auth-error-banner">
            <ShieldAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="auth-form">
          <div className="input-group">
            <label htmlFor="login-email">Email Address</label>
            <input 
              type="email" 
              id="login-email" 
              placeholder="name@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="login-password">Password</label>
              <Link to="/forgot-password" style={{ fontSize: '0.75rem', color: 'var(--cyan-accent)', textDecoration: 'none', marginLeft: 'auto', marginBottom: '2px' }}>
                Forgot Password?
              </Link>
            </div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input 
                type={showPassword ? "text" : "password"} 
                id="login-password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ width: '100%', paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className="auth-btn"
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In to Workspace'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            New explorer?{' '}
            <Link to="/signup" className="auth-link">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
