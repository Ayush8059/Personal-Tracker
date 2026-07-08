import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './utils/supabaseClient';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import './styles/App.css';

// Authentication Guard Component
function AuthGuard({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    // 1. Check local bypass guest session first
    const guestSession = localStorage.getItem('aethertrack_guest_session');
    if (guestSession) {
      try {
        setSession(JSON.parse(guestSession));
        setLoading(false);
      } catch (e) {
        localStorage.removeItem('aethertrack_guest_session');
      }
    }

    // 2. Query active Supabase session
    supabase.auth.getSession().then(({ data: { session: sbSession } }) => {
      if (active) {
        if (sbSession) setSession(sbSession);
        setLoading(false);
      }
    }).catch(() => {
      if (active) setLoading(false);
    });

    // 3. Listen to auth state shifts
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, sbSession) => {
      if (!active) return;
      
      const stillGuest = localStorage.getItem('aethertrack_guest_session');
      if (stillGuest) {
        try {
          setSession(JSON.parse(stillGuest));
        } catch (e) {
          setSession(sbSession);
        }
      } else {
        setSession(sbSession);
      }
      
      setLoading(false);
    });

    return () => {
      active = false;
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-primary)' }}>
        <p style={{ color: 'var(--cyan-accent)', fontFamily: 'Outfit', fontSize: '1.2rem' }}>Authorizing Space...</p>
      </div>
    );
  }

  return session ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Auth routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        {/* Protected Dashboard Workspace */}
        <Route 
          path="/" 
          element={
            <AuthGuard>
              <Dashboard />
            </AuthGuard>
          } 
        />

        {/* Fallback routing redirects to root */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
