import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';
import { handleTiltMove, handleTiltLeave } from '../utils/effects';
import ParticleBackground from '../components/ParticleBackground';
import { ShieldAlert, CheckCircle, Eye, EyeOff } from 'lucide-react';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const cardRef = useRef(null);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (password !== confirmPassword) {
      return setError('Passwords do not match.');
    }

    if (password.length < 6) {
      return setError('Password should be at least 6 characters.');
    }

    setLoading(true);

    if (!isSupabaseConfigured) {
      setSuccess(true);
      localStorage.setItem('aethertrack_guest_session', JSON.stringify({
        user: { id: 'guest-user-uuid', email: email || 'guest@aethertrack.local' }
      }));
      setTimeout(() => navigate('/'), 1200);
      setLoading(false);
      return;
    }

    try {
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
      });
      if (err) throw err;
      
      setSuccess(true);
      if (data?.session) {
        setTimeout(() => navigate('/'), 2000);
      }
    } catch (err) {
      const isNetworkError = err.message === 'Failed to fetch' || err.message?.includes('fetch');
      setError(
        isNetworkError 
          ? 'Connection Error: Could not reach Supabase. Please verify your internet connection or .env settings.' 
          : err.message || 'Registration failed.'
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
          <h2>Join AetherTrack</h2>
          <p>Begin your gamified tracking journey</p>
        </div>

        {error && (
          <div className="auth-error-banner">
            <ShieldAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="auth-error-banner" style={{ background: 'rgba(0,230,118,0.1)', borderColor: 'rgba(0,230,118,0.3)', color: '#a7ffeb' }}>
            <CheckCircle size={16} />
            <span>
              {isSupabaseConfigured 
                ? 'Account created! Please check your email inbox to verify.' 
                : 'Demo Mode: Signup successful! Redirecting...'}
            </span>
          </div>
        )}

        <form onSubmit={handleSignup} className="auth-form">
          <div className="input-group">
            <label htmlFor="signup-email">Email Address</label>
            <input 
              type="email" 
              id="signup-email" 
              placeholder="name@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group" style={{ position: 'relative' }}>
            <label htmlFor="signup-password">Password (min 6 chars)</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input 
                type={showPassword ? "text" : "password"} 
                id="signup-password" 
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

          <div className="input-group">
            <label htmlFor="signup-confirm-password">Confirm Password</label>
            <input 
              type={showPassword ? "text" : "password"} 
              id="signup-confirm-password" 
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className="auth-btn"
            disabled={loading || success}
          >
            {loading ? 'Creating Account...' : 'Register Account'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="auth-link">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
