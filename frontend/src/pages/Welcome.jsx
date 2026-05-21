import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getToken, clearGuestProfile } from '../utils/storage';
import { redirectToGoogle } from '../utils/googleAuth';
import '../styles/welcome.css';

const FEATURES = [
  { icon: '🧠', title: 'Intelligent Answers', desc: 'Ask anything — science, history, tech, math, coding.' },
  { icon: '📋', title: 'Task Manager', desc: 'Create tasks, set deadlines, and stay organized.' },
  { icon: '✍️', title: 'AI Writing', desc: 'Draft emails, essays, summaries, and more instantly.' },
  { icon: '🔒', title: 'Private & Secure', desc: 'Your data is encrypted and never shared.' },
];

const Welcome = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('intro'); // 'intro' | 'landing'
  const [googleError, setGoogleError] = useState('');

  useEffect(() => {
    // Clear any old guest profile so this page always shows for non-authenticated users
    clearGuestProfile();
    // If user has a real JWT token — go to chat
    if (getToken()) {
      navigate('/chat', { replace: true });
      return;
    }
    // Splash screen then show landing
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
    // Allow guest access directly to chat
    navigate('/chat');
  };

  if (phase === 'intro') {
    return (
      <div className="welcome-page">
        <div className="welcome-particles" aria-hidden="true">
          {[...Array(18)].map((_, i) => <span key={i} className="wparticle" style={{ '--i': i }} />)}
        </div>
        <div className="welcome-intro fade-in">
          <div className="wi-orb" aria-hidden="true" />
          <div className="wi-robot"><img src="/images/logo.png" alt="tom.ai" width="80" height="80" style={{borderRadius:'16px',objectFit:'contain'}} /></div>
          <h1 className="wi-brand">tom.ai</h1>
          <p className="wi-sub">Your personal AI assistant</p>
          <div className="wi-dots" aria-label="Loading">
            <span /><span /><span />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="welcome-page">
      <div className="welcome-particles" aria-hidden="true">
        {[...Array(18)].map((_, i) => <span key={i} className="wparticle" style={{ '--i': i }} />)}
      </div>

      <div className="welcome-split fade-in">
        {/* ── Left: Hero / Features ── */}
        <div className="welcome-left" aria-hidden="true">
          <div className="wl-brand"><img src="/images/logo.png" alt="tom.ai" width="22" height="22" style={{borderRadius:'5px',verticalAlign:'middle',marginRight:'6px'}} /> tom.ai</div>
          <img
            id="welcome-hero-img"
            src="/images/welcome_hero.png"
            alt="tom.ai AI assistant illustration"
            className="wl-hero"
          />
          <div className="wl-features">
            {FEATURES.map(f => (
              <div key={f.title} className="wl-feature-row">
                <span className="wl-feature-icon">{f.icon}</span>
                <div>
                  <div className="wl-feature-title">{f.title}</div>
                  <div className="wl-feature-desc">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Auth Panel ── */}
        <div className="welcome-right">
          <div className="wr-header">
            <span className="wr-logo"><img src="/images/logo.png" alt="tom.ai" width="48" height="48" style={{borderRadius:'12px',objectFit:'contain'}} /></span>
            <h2>Welcome to tom.ai</h2>
            <p>Your intelligent personal assistant — powered by AI.</p>
          </div>

          {googleError && (
            <div className="alert alert-error" role="alert">⚠️ {googleError}</div>
          )}

          {/* Google Sign-In */}
          <button
            id="welcome-google-btn"
            type="button"
            className="btn-google"
            onClick={handleGoogleLogin}
          >
            <svg className="google-icon" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              <path fill="none" d="M0 0h48v48H0z"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="auth-divider"><span>or</span></div>

          {/* Create Account */}
          <Link
            id="welcome-signup-btn"
            to="/signup"
            className="btn btn-primary btn-full btn-lg welcome-cta"
          >
            📧 Create Account with Email
          </Link>

          {/* Already have account */}
          <Link
            id="welcome-login-link"
            to="/login"
            className="btn btn-secondary btn-full"
          >
            Sign In
          </Link>

          {/* Guest option */}
          <div className="wr-guest">
            <button
              id="welcome-guest-btn"
              type="button"
              className="wr-guest-btn"
              onClick={handleGuestChat}
            >
              Continue as guest →
            </button>
          </div>

          <p className="wr-note">
            By signing up, you agree to our terms. Free forever — no credit card required.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
