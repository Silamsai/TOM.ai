import React, { useState, useEffect, useCallback } from 'react';
import { login, signupSendOTP, signupVerifyOTP } from '../services/api';
import { setToken, setUser, getGuestProfile } from '../utils/storage';
import { isValidEmail, isValidOTP, isValidPassword, getPasswordStrength } from '../utils/validators';
import { redirectToGoogle } from '../utils/googleAuth';
import LoadingSpinner from './LoadingSpinner';
import '../styles/modal.css';

const AuthModal = ({ isOpen, onClose, onSuccess }) => {
  const [tab, setTab]           = useState('signin');  // 'signin' | 'signup'
  const [signInData, setSignIn] = useState({ email: '', password: '' });
  const [signUp, setSignUp]     = useState({ email: '', otp: '', password: '', confirmPassword: '' });
  const [signUpStep, setSignUpStep] = useState(1); // 1=email, 2=otp+password
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  const guest   = getGuestProfile();
  const pwS     = getPasswordStrength(signUp.password);
  const pwPct   = { Weak:25, Fair:50, Good:75, Strong:100 }[pwS.label] ?? 0;

  // Reset state whenever modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setError(''); setSuccess('');
      setSignIn({ email: '', password: '' });
      setSignUp({ email: '', otp: '', password: '', confirmPassword: '' });
      setSignUpStep(1); setTab('signin'); setShowPw(false);
    }
  }, [isOpen]);

  // Close on Escape key
  const handleKeyDown = useCallback(e => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);
  useEffect(() => {
    if (isOpen) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  /* ── Sign In ── */
  const handleSignIn = async (e) => {
    e.preventDefault(); setError('');
    if (!isValidEmail(signInData.email)) return setError('Please enter a valid email address.');
    if (!signInData.password) return setError('Password is required.');
    setLoading(true);
    try {
      const res = await login(signInData.email, signInData.password);
      const { token, user } = res.data.data;
      setToken(token); setUser(user);
      onSuccess(user);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally { setLoading(false); }
  };

  /* ── Send OTP ── */
  const handleSendOTP = async (e) => {
    e.preventDefault(); setError('');
    if (!isValidEmail(signUp.email)) return setError('Please enter a valid email address.');
    setLoading(true);
    try {
      await signupSendOTP(signUp.email);
      setSuccess(`OTP sent to ${signUp.email}. Check your inbox!`);
      setSignUpStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP. Try again.');
    } finally { setLoading(false); }
  };

  /* ── Verify OTP & Create Account ── */
  const handleCreateAccount = async (e) => {
    e.preventDefault(); setError('');
    if (!isValidOTP(signUp.otp)) return setError('OTP must be exactly 6 digits.');
    if (!isValidPassword(signUp.password)) return setError('Password must be at least 8 characters.');
    if (signUp.password !== signUp.confirmPassword) return setError('Passwords do not match.');
    setLoading(true);
    try {
      const name = guest?.name || 'User';
      const res = await signupVerifyOTP({ email: signUp.email, otp: signUp.otp, password: signUp.password, name });
      const { token, user } = res.data.data;
      setToken(token); setUser(user);
      onSuccess(user);
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card fade-in" role="dialog" aria-modal="true" aria-label="Sign in to tom.ai">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-brand"><img src="/images/logo.png" alt="tom.ai" width="22" height="22" style={{borderRadius:'5px',verticalAlign:'middle',marginRight:'6px'}} /> tom.ai</div>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Tabs */}
        <div className="modal-tabs">
          <button className={`modal-tab ${tab==='signin' ? 'active':''}`} onClick={() => { setTab('signin'); setError(''); setSuccess(''); }}>Sign In</button>
          <button className={`modal-tab ${tab==='signup' ? 'active':''}`} onClick={() => { setTab('signup'); setError(''); setSuccess(''); }}>Create Account</button>
        </div>

        {error   && <div className="alert alert-error"   role="alert">⚠️ {error}</div>}
        {success && <div className="alert alert-success">✅ {success}</div>}

        {/* ── Google Sign-In (shown on both tabs) ── */}
        <button
          id="modal-google-btn"
          type="button"
          className="btn-google"
          onClick={() => {
            setError('');
            try { redirectToGoogle(); }
            catch (err) {
              setError(
                err.message === 'GOOGLE_NOT_CONFIGURED'
                  ? 'Add REACT_APP_GOOGLE_CLIENT_ID to your frontend .env and restart.'
                  : 'Could not connect to Google. Try again.'
              );
            }
          }}
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

        <div className="auth-divider"><span>or {tab === 'signin' ? 'sign in' : 'sign up'} with email</span></div>

        {/* ── SIGN IN ── */}
        {tab === 'signin' && (
          <form className="modal-form" onSubmit={handleSignIn} noValidate>
            <div className="form-group">
              <label htmlFor="modal-si-email" className="form-label">Email</label>
              <input id="modal-si-email" type="email" className="form-input" placeholder="you@example.com"
                value={signInData.email} onChange={e => { setSignIn(p=>({...p,email:e.target.value})); setError(''); }}
                autoComplete="email" required />
            </div>
            <div className="form-group">
              <label htmlFor="modal-si-pw" className="form-label">Password</label>
              <div className="input-wrapper">
                <input id="modal-si-pw" type={showPw?'text':'password'} className="form-input" placeholder="••••••••"
                  value={signInData.password} onChange={e => { setSignIn(p=>({...p,password:e.target.value})); setError(''); }}
                  autoComplete="current-password" required />
                <button type="button" className="input-icon" onClick={() => setShowPw(v=>!v)} aria-label="Toggle password">
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <button id="modal-signin-btn" type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
              {loading ? <LoadingSpinner size="small" /> : '→ Sign In'}
            </button>
          </form>
        )}

        {/* ── CREATE ACCOUNT ── */}
        {tab === 'signup' && (
          <>
            {signUpStep === 1 ? (
              <form className="modal-form" onSubmit={handleSendOTP} noValidate>
                {guest?.name && (
                  <div className="modal-guest-note">
                    Hi <strong>{guest.name}</strong>! Enter your email to get a verification code.
                  </div>
                )}
                <div className="form-group">
                  <label htmlFor="modal-su-email" className="form-label">Email</label>
                  <input id="modal-su-email" type="email" className="form-input" placeholder="you@example.com"
                    value={signUp.email} onChange={e => { setSignUp(p=>({...p,email:e.target.value})); setError(''); }}
                    autoComplete="email" required />
                </div>
                <button id="modal-send-otp-btn" type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                  {loading ? <LoadingSpinner size="small" /> : '📨 Send Verification Code'}
                </button>
              </form>
            ) : (
              <form className="modal-form" onSubmit={handleCreateAccount} noValidate>
                <div className="form-group">
                  <label htmlFor="modal-su-otp" className="form-label">Verification Code</label>
                  <input id="modal-su-otp" type="text" inputMode="numeric" maxLength={6} className="form-input"
                    placeholder="6-digit OTP" value={signUp.otp}
                    onChange={e => { setSignUp(p=>({...p,otp:e.target.value})); setError(''); }} required />
                </div>
                <div className="form-group">
                  <label htmlFor="modal-su-pw" className="form-label">Password</label>
                  <div className="input-wrapper">
                    <input id="modal-su-pw" type={showPw?'text':'password'} className="form-input" placeholder="Min. 8 chars"
                      value={signUp.password} onChange={e => { setSignUp(p=>({...p,password:e.target.value})); setError(''); }} required />
                    <button type="button" className="input-icon" onClick={() => setShowPw(v=>!v)} aria-label="Toggle password">
                      {showPw ? '🙈' : '👁️'}
                    </button>
                  </div>
                  {signUp.password && (
                    <div className="pw-strength">
                      <div className="pw-strength-bar"><div className="pw-strength-fill" style={{ width:`${pwPct}%`, background:pwS.color }} /></div>
                      <span className="pw-strength-label" style={{ color:pwS.color }}>{pwS.label}</span>
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label htmlFor="modal-su-cpw" className="form-label">Confirm Password</label>
                  <input id="modal-su-cpw" type="password" className="form-input" placeholder="Re-enter password"
                    value={signUp.confirmPassword} onChange={e => { setSignUp(p=>({...p,confirmPassword:e.target.value})); setError(''); }} required />
                </div>
                <button id="modal-create-btn" type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                  {loading ? <LoadingSpinner size="small" /> : '🚀 Create Account'}
                </button>
                <button type="button" className="btn btn-secondary btn-full" onClick={() => { setSignUpStep(1); setError(''); setSuccess(''); }}>
                  ← Back
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
