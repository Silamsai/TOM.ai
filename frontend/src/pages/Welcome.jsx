import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getToken, clearGuestProfile } from '../utils/storage';
import { redirectToGoogle } from '../utils/googleAuth';
import AnimatedLogo from '../components/three/AnimatedLogo';
import '../styles/welcome.css';

const Welcome = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('intro');
  const [googleError, setGoogleError] = useState('');

  useEffect(() => {
    clearGuestProfile();
    if (getToken()) {
      navigate('/chat', { replace: true });
      return;
    }
    const t = setTimeout(() => setPhase('landing'), 2400);
    return () => clearTimeout(t);
  }, [navigate]);

  const handleGoogleLogin = () => {
    setGoogleError('');
    try {
      redirectToGoogle();
    } catch (err) {
      if (err.message === 'GOOGLE_NOT_CONFIGURED') {
        setGoogleError('Google login is not configured yet. Add REACT_APP_GOOGLE_CLIENT_ID to your .env file.');
      } else {
        setGoogleError('Could not connect to Google. Please try again.');
      }
    }
  };

  const handleGuestChat = () => {
    navigate('/chat');
  };

  /* ── Intro splash ── */
  if (phase === 'intro') {
    return (
      <div className="welcome-page">
        <div className="welcome-particles" aria-hidden="true">
          {[...Array(18)].map((_, i) => <span key={i} className="wparticle" style={{ '--i': i }} />)}
        </div>
        <motion.div
          className="welcome-intro fade-in"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="wi-orb" aria-hidden="true" />
          <div className="wi-robot">
            <AnimatedLogo size="lg" />
          </div>
          <h1 className="wi-brand">tom.ai</h1>
          <p className="wi-sub">Your personal AI assistant</p>
          <div className="wi-dots" aria-label="Loading">
            <span /><span /><span />
          </div>
        </motion.div>
      </div>
    );
  }

  /* ── Main landing ── */
  return (
    <div className="welcome-page welcome-page--card">

      {/* Full-screen background video — scaled to crop bottom-right logo */}
      <div className="welcome-video-bg" aria-hidden="true">
        <video
          src="/videos/tomeyes.mp4"
          autoPlay
          loop
          muted
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'top left',
            transform: 'scale(1.18)',
            transformOrigin: 'top left',
          }}
        />
        <div className="welcome-video-overlay" />
        {/* Light beam like reference */}
        <div className="welcome-beam" aria-hidden="true" />
      </div>

      {/* Centered glass card */}
      <motion.div
        className="welcome-card fade-in"
        initial={{ opacity: 0, y: 28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Logo */}
        <div className="wc-logo">
          <img
            src="/images/logo.png"
            alt="tom.ai logo"
            width="56"
            height="56"
            style={{ borderRadius: '16px', objectFit: 'contain' }}
          />
        </div>

        <h1 className="wc-title">Welcome to tom.ai</h1>
        <p className="wc-sub">Your intelligent personal assistant — powered by AI.</p>

        {googleError && (
          <div className="alert alert-error" role="alert" style={{ marginBottom: '12px', fontSize: '13px' }}>
            ⚠️ {googleError}
          </div>
        )}

        <div className="wc-buttons">

          {/* Continue with Google */}
          <button
            id="welcome-google-btn"
            type="button"
            className="wc-btn wc-btn--google"
            onClick={handleGoogleLogin}
          >
            <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Continue with Google
          </button>

          {/* Continue with Email */}
          <Link
            id="welcome-signup-btn"
            to="/signup"
            className="wc-btn wc-btn--email"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
            Continue with Email
          </Link>

          {/* Sign In (existing account) */}
          <Link
            id="welcome-login-link"
            to="/login"
            className="wc-btn wc-btn--signin"
          >
            Sign In
          </Link>

          <div className="wc-divider"><span>or</span></div>

          {/* Guest */}
          <button
            id="welcome-guest-btn"
            type="button"
            className="wc-btn wc-btn--ghost"
            onClick={handleGuestChat}
          >
            Continue as Guest →
          </button>

        </div>

        <p className="wc-note">Free forever · No credit card required</p>
      </motion.div>
    </div>
  );
};

export default Welcome;
