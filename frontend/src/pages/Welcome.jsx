import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getToken, clearGuestProfile } from '../utils/storage';
import { redirectToGoogle } from '../utils/googleAuth';
import AnimatedLogo from '../components/three/AnimatedLogo';
import MixupLayout from '../components/layout/MixupLayout';
import WorkflowStrip from '../components/workflow/WorkflowStrip';
import '../styles/welcome.css';

const FeatureIcons = {
  brain: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2a2.5 2.5 0 0 1 5 0c1.1 0 2 .9 2 2 1.1 0 2 .9 2 2 0 .7-.4 1.4-1 1.7V9c0 3.3-2.7 6-6 6S5.5 12.3 5.5 9V7.7C4.9 7.4 4.5 6.7 4.5 6c0-1.1.9-2 2-2 0-1.1.9-2 2-2z"/>
      <path d="M9.5 15v1a3 3 0 0 0 6 0v-1"/>
      <path d="M6 9H5a2 2 0 0 0 0 4h1"/>
      <path d="M18 9h1a2 2 0 0 1 0 4h-1"/>
    </svg>
  ),
  tasks: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3"/>
      <path d="M9 12l2 2 4-4"/>
    </svg>
  ),
  writing: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"/>
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
  ),
  lock: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
};

const FEATURES = [
  { icon: FeatureIcons.brain,   title: 'Intelligent Answers', desc: 'Ask anything — science, history, tech, math, coding.' },
  { icon: FeatureIcons.tasks,   title: 'Task Manager',        desc: 'Create tasks, set deadlines, and stay organized.' },
  { icon: FeatureIcons.writing, title: 'AI Writing',          desc: 'Draft emails, essays, summaries, and more instantly.' },
  { icon: FeatureIcons.lock,    title: 'Private & Secure',    desc: 'Your data is encrypted and never shared.' },
];

const Welcome = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('intro');
  const [googleError, setGoogleError] = useState('');
  const [workflowStep, setWorkflowStep] = useState(0);

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
    setWorkflowStep(0);
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
    setWorkflowStep(1);
    navigate('/chat');
  };

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

  return (
    <div className="welcome-page">
      <div className="welcome-particles" aria-hidden="true">
        {[...Array(18)].map((_, i) => <span key={i} className="wparticle" style={{ '--i': i }} />)}
      </div>

      <div className="welcome-split fade-in">
        <div className="welcome-left welcome-left--mixup">
          <MixupLayout
            className="welcome-mixup"
            workflow={<WorkflowStrip activeIndex={workflowStep} />}
          >
            <div className="welcome-left-inner">
              <div className="wl-brand">
                <AnimatedLogo size="sm" /> tom.ai
              </div>
              <div className="wl-hero" style={{ overflow: 'hidden', borderRadius: '24px', padding: 0 }}>
                <video
                  id="welcome-hero-video"
                  src="/videos/tomeyes.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover', 
                    transform: 'scale(1.35) translate(-4%, -4%)', /* Aggressive crop to hide bottom-right logo */
                    display: 'block' 
                  }}
                />
              </div>
              <div className="wl-features">
                {FEATURES.map((f, i) => (
                  <motion.div
                    key={f.title}
                    className="wl-feature-row"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.08 * i, duration: 0.4 }}
                  >
                    <span className="wl-feature-icon">{f.icon}</span>
                    <div>
                      <div className="wl-feature-title">{f.title}</div>
                      <div className="wl-feature-desc">{f.desc}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </MixupLayout>
        </div>

        <motion.div
          className="welcome-right"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="wr-header">
            <span className="wr-logo">
              <AnimatedLogo size="md" />
            </span>
            <h2>Welcome to tom.ai</h2>
            <p>Your intelligent personal assistant — powered by AI.</p>
          </div>

          {googleError && (
            <div className="alert alert-error" role="alert">⚠️ {googleError}</div>
          )}

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

          <div className="auth-divider"><span>or</span></div>

          <Link
            id="welcome-signup-btn"
            to="/signup"
            className="btn btn-primary btn-full btn-lg welcome-cta"
            onClick={() => setWorkflowStep(0)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
            Create Account with Email
          </Link>

          <Link
            id="welcome-login-link"
            to="/login"
            className="btn btn-secondary btn-full"
            onClick={() => setWorkflowStep(0)}
          >
            Sign In
          </Link>

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
        </motion.div>
      </div>
    </div>
  );
};

export default Welcome;
