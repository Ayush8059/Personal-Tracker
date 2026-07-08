import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';
import { handleTiltMove, handleTiltLeave } from '../utils/effects';
import ParticleBackground from '../components/ParticleBackground';
import { ShieldAlert, CheckCircle, Eye, EyeOff } from 'lucide-react';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const cardRef = useRef(null);
  const navigate = useNavigate();

  const handlePasswordUpdate = async (e) => {
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
      setTimeout(() => navigate('/login'), 1500);
      setLoading(false);
      return;
    }

    try {
      const { error: err } = await supabase.auth.updateUser({
        password: password
      });
      if (err) throw err;
      
      setSuccess(true);
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      setError(err.message || 'Failed to update password.');
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
          <h2>New Password</h2>
          <p>Establish credentials for your AetherSpace</p>
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
            <span>Password updated successfully! Directing you back...</span>
          </div>
        )}

        <form onSubmit={handlePasswordUpdate} className="auth-form">
          <div className="input-group" style={{ position: 'relative' }}>
            <label htmlFor="new-password">New Password</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input 
                type={showPassword ? "text" : "password"} 
                id="new-password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ width: '100%', paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="confirm-new-password">Confirm Password</label>
            <input 
              type={showPassword ? "text" : "password"} 
              id="confirm-new-password" 
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
            {loading ? 'Updating Password...' : 'Save New Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
