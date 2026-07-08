import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';
import { handleTiltMove, handleTiltLeave } from '../utils/effects';
import ParticleBackground from '../components/ParticleBackground';
import { ShieldAlert, CheckCircle, Mail } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const cardRef = useRef(null);

  const handleResetRequest = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    if (!isSupabaseConfigured) {
      // Local Mode mockup success
      setSuccess(true);
      setLoading(false);
      return;
    }

    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (err) throw err;
      setSuccess(true);
    } catch (err) {
      const isNetworkError = err.message === 'Failed to fetch' || err.message?.includes('fetch');
      setError(
        isNetworkError 
          ? 'Connection Error: Could not reach Supabase. Please verify your internet connection.' 
          : err.message || 'Failed to send recovery email.'
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
          <h2>Reset Password</h2>
          <p>Recover access to your 3D Life Grid</p>
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
                ? 'Recovery link dispatched! Please check your email inbox.' 
                : 'Demo Mode: Reset link simulated successfully!'}
            </span>
          </div>
        )}

        <form onSubmit={handleResetRequest} className="auth-form">
          <div className="input-group">
            <label htmlFor="recovery-email">Email Address</label>
            <input 
              type="email" 
              id="recovery-email" 
              placeholder="name@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className="auth-btn"
            disabled={loading || success}
          >
            {loading ? 'Processing request...' : 'Send Recovery Link'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Remembered details?{' '}
            <Link to="/login" className="auth-link">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
