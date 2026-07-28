import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { exchangeGoogleCode, connectGoogleCallback } from '../services/api';
import { setToken, setUser } from '../utils/storage';
import { AlertCircle, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';
import InteractiveLogo from '../components/InteractiveLogo';
import '../styles/pages.css';

/**
 * GoogleCallback
 * Handles the redirect from Google after the user approves OAuth.
 * Two flows:
 *   1. Sign-in flow: exchanges code for JWT, stores user
 *   2. Connect flow: exchanges code for service tokens (Gmail/Calendar/Tasks)
 */
const GoogleCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');
  const [errorMessage, setErrorMessage] = useState('');
  const hasRun = useRef(false);

  const stateParam = searchParams.get('state') || '';
  const isConnectFlow =
    stateParam.startsWith('connect_') ||
    localStorage.getItem('tom_connect_pending') === 'true';
  const isGmailConnection =
    stateParam.startsWith('gmail_') ||
    localStorage.getItem('tom_gmail_pending') === 'true';

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      setStatus('error');
      setErrorMessage(
        error === 'access_denied'
          ? 'You cancelled the Google sign-in. You can try again anytime.'
          : `Google returned an error: ${error}`
      );
      localStorage.removeItem('tom_connect_pending');
      localStorage.removeItem('tom_gmail_pending');
      return;
    }

    if (!code) {
      setStatus('error');
      setErrorMessage('No authorization code received from Google. Please try again.');
      return;
    }

    // Prevent React 18 Strict Mode duplicate execution
    const sessionKey = `google_auth_code_${code}`;
    if (sessionStorage.getItem(sessionKey)) {
      return;
    }
    sessionStorage.setItem(sessionKey, 'true');

    const processCode = async () => {
      try {
        if (isConnectFlow) {
          // ── Connect Flow: exchange code for service tokens ──
          await connectGoogleCallback(code);
          localStorage.removeItem('tom_connect_pending');
          localStorage.setItem('tom_google_connect_success', 'true');
          // Also mark gmail as connected for backward compat
          localStorage.setItem('tom_gmail_connected', 'true');
          setStatus('success');
          setTimeout(() => navigate('/chat', { replace: true }), 800);
        } else {
          // ── Sign-in Flow: exchange code for JWT ──
          const res = await exchangeGoogleCode(code);
          const { token, user } = res.data.data;
          setToken(token);
          setUser(user);

          if (localStorage.getItem('tom_gmail_pending') === 'true') {
            localStorage.setItem('tom_gmail_connected', 'true');
            localStorage.removeItem('tom_gmail_pending');
          }

          setStatus('success');
          setTimeout(() => navigate('/chat', { replace: true }), 800);
        }
      } catch (err) {
        console.error('[GoogleCallback] Exchange failed:', err);
        sessionStorage.removeItem(sessionKey);
        localStorage.removeItem('tom_connect_pending');
        localStorage.removeItem('tom_gmail_pending');
        const msg =
          err.response?.data?.message ||
          'Something went wrong during sign-in. Please try again.';
        setStatus('error');
        setErrorMessage(msg);
      }
    };

    processCode();
  }, [searchParams, navigate, isConnectFlow]);

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        {/* Logo */}
        <div className="auth-logo">
          <span className="logo-icon"><InteractiveLogo width={32} height={32} /></span>
          <h1>tom.ai</h1>
        </div>

        {status === 'processing' && (
          <div style={{ padding: '12px 0' }}>
            <div className="google-callback-spinner" />
            <h2 className="auth-title" style={{ marginTop: '20px' }}>
              {isConnectFlow ? 'Connecting Google Services…' : isGmailConnection ? 'Connecting Gmail…' : 'Signing you in…'}
            </h2>
            <p className="auth-subtitle">
              {isConnectFlow
                ? 'Setting up Gmail, Calendar & Tasks integration. This only takes a moment.'
                : isGmailConnection
                  ? 'Saving your Gmail integration settings. This only takes a moment.'
                  : 'Verifying your Google account. This only takes a moment.'}
            </p>
          </div>
        )}

        {status === 'success' && (
          <div style={{ padding: '12px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <CheckCircle2 size={48} style={{ color: 'var(--success, #22c55e)', marginBottom: '12px' }} />
            <h2 className="auth-title">
              {isConnectFlow ? 'Google Services Connected!' : isGmailConnection ? 'Gmail Connected!' : 'Welcome to TOM.AI!'}
            </h2>
            <p className="auth-subtitle">
              {isConnectFlow
                ? 'Gmail, Calendar & Tasks are now available. Redirecting…'
                : isGmailConnection
                  ? 'Gmail integration configured successfully. Redirecting…'
                  : 'Redirecting you to your assistant…'}
            </p>
          </div>
        )}

        {status === 'error' && (
          <div style={{ padding: '12px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <AlertTriangle size={48} style={{ color: 'var(--error, #ef4444)', marginBottom: '12px' }} />
            <h2 className="auth-title" style={{ color: 'var(--error, #f87171)' }}>
              {isGmailConnection ? 'Connection Failed' : 'Sign-in Failed'}
            </h2>
            <div className="alert alert-error" role="alert" style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertCircle size={14} />
              <span>{errorMessage}</span>
            </div>
            <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
              <button
                id="google-callback-retry-btn"
                className="btn btn-primary btn-full"
                onClick={() => navigate('/login')}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <ArrowLeft size={16} />
                <span>Try again</span>
              </button>
              <button
                className="btn btn-secondary btn-full"
                onClick={() => navigate('/chat')}
              >
                Continue as guest
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GoogleCallback;

