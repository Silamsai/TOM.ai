import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { exchangeGoogleCode } from '../services/api';
import { setToken, setUser } from '../utils/storage';
import '../styles/pages.css';

/**
 * GoogleCallback
 * Handles the redirect from Google after the user approves OAuth.
 * URL contains: ?code=<auth_code>&state=...
 * We send the code to the backend, receive a JWT, then redirect to /chat.
 */
const GoogleCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing'); // 'processing' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const hasRun = useRef(false); // prevent double-call in strict mode

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
      return;
    }

    if (!code) {
      setStatus('error');
      setErrorMessage('No authorization code received from Google. Please try again.');
      return;
    }

    const processCode = async () => {
      try {
        const res = await exchangeGoogleCode(code);
        const { token, user } = res.data.data;
        setToken(token);
        setUser(user);

        // If user came from MCP "Connect Gmail" button, mark Gmail as connected
        if (localStorage.getItem('tom_gmail_pending') === 'true') {
          localStorage.setItem('tom_gmail_connected', 'true');
          localStorage.removeItem('tom_gmail_pending');
        }

        setStatus('success');
        setTimeout(() => navigate('/chat', { replace: true }), 800);
      } catch (err) {
        console.error('[GoogleCallback] Exchange failed:', err);
        const msg =
          err.response?.data?.message ||
          'Something went wrong during sign-in. Please try again.';
        setStatus('error');
        setErrorMessage(msg);
      }
    };

    processCode();
  }, [searchParams, navigate]);

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        {/* Logo */}
        <div className="auth-logo">
          <span className="logo-icon"><img src="/images/logo.png" alt="tom.ai" width="32" height="32" style={{borderRadius:'8px',objectFit:'contain'}} /></span>
          <h1>tom.ai</h1>
        </div>

        {status === 'processing' && (
          <div style={{ padding: '12px 0' }}>
            <div className="google-callback-spinner" />
            <h2 className="auth-title" style={{ marginTop: '20px' }}>
              Signing you in…
            </h2>
            <p className="auth-subtitle">
              Verifying your Google account. This only takes a moment.
            </p>
          </div>
        )}

        {status === 'success' && (
          <div style={{ padding: '12px 0' }}>
            <span style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}>✅</span>
            <h2 className="auth-title">Welcome to TOM.AI!</h2>
            <p className="auth-subtitle">Redirecting you to your assistant…</p>
          </div>
        )}

        {status === 'error' && (
          <div style={{ padding: '12px 0' }}>
            <span style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}>😕</span>
            <h2 className="auth-title" style={{ color: 'var(--error, #f87171)' }}>
              Sign-in Failed
            </h2>
            <div className="alert alert-error" role="alert" style={{ marginTop: '16px' }}>
              ⚠️ {errorMessage}
            </div>
            <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                id="google-callback-retry-btn"
                className="btn btn-primary btn-full"
                onClick={() => navigate('/login')}
              >
                ← Try again
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
