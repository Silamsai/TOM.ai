import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { signupSendOTP, signupVerifyOTP } from '../services/api';
import { setToken, setUser } from '../utils/storage';
import { isValidEmail, isValidOTP, isValidPassword, getPasswordStrength } from '../utils/validators';
import { redirectToGoogle } from '../utils/googleAuth';
import LoadingSpinner from '../components/LoadingSpinner';
import { useNavigate } from 'react-router-dom';
import '../styles/pages.css';

const Signup = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1 = email, 2 = verify
  const [email, setEmail] = useState('');
  const [formData, setFormData] = useState({ otp: '', name: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignup = () => {
    setGoogleLoading(true);
    setError('');
    try {
      redirectToGoogle(); // redirects browser — no return value
    } catch (err) {
      if (err.message === 'GOOGLE_NOT_CONFIGURED') {
        setError(
          'Google login is not set up yet. Add your REACT_APP_GOOGLE_CLIENT_ID to the frontend .env file and restart.'
        );
      } else {
        setError('Could not start Google sign-in. Please try again.');
      }
      setGoogleLoading(false);
    }
  };

  const pwStrength = getPasswordStrength(formData.password);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    if (!isValidEmail(email)) return setError('Please enter a valid email address.');
    setLoading(true);
    try {
      await signupSendOTP(email);
      setSuccess(`OTP sent to ${email}. Check your inbox!`);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    if (!isValidOTP(formData.otp)) return setError('OTP must be exactly 6 digits.');
    if (!formData.name.trim()) return setError('Name is required.');
    if (!isValidPassword(formData.password)) return setError('Password must be at least 8 characters.');
    if (formData.password !== formData.confirmPassword) return setError('Passwords do not match.');

    setLoading(true);
    try {
      const res = await signupVerifyOTP({ email, otp: formData.otp, password: formData.password, name: formData.name });
      const { token, user } = res.data.data;
      setToken(token);
      setUser(user);
      navigate('/chat');
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const pwStrengthPercent = pwStrength.label === 'Weak' ? 25 : pwStrength.label === 'Fair' ? 50 : pwStrength.label === 'Good' ? 75 : pwStrength.label === 'Strong' ? 100 : 0;

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="logo-icon"><img src="/images/logo.png" alt="tom.ai" width="32" height="32" style={{borderRadius:'8px',objectFit:'contain'}} /></span>
          <h1>tom.ai</h1>
          <p>Create your account</p>
        </div>

        {/* Step indicator */}
        <div className="step-indicator" aria-label={`Step ${step} of 2`}>
          <div className={`step-dot ${step >= 1 ? 'active' : ''} ${step > 1 ? 'done' : ''}`} />
          <div className="step-line" />
          <div className={`step-dot ${step >= 2 ? 'active' : ''}`} />
        </div>

        <h2 className="auth-title">{step === 1 ? 'Enter your email' : 'Verify & create account'}</h2>
        <p className="auth-subtitle">
          {step === 1 ? "We'll send you a verification code." : `Code sent to ${email}`}
        </p>

        {error && <div className="alert alert-error" role="alert">⚠️ {error}</div>}
        {success && step === 2 && <div className="alert alert-success">✅ {success}</div>}

        {/* ── Google Sign-Up (only on step 1) ── */}
        {step === 1 && (
          <>
            <button
              id="signup-google-btn"
              type="button"
              className="btn-google"
              onClick={handleGoogleSignup}
              disabled={googleLoading || loading}
            >
              {googleLoading ? (
                <LoadingSpinner size="small" />
              ) : (
                <>
                  <svg className="google-icon" viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    <path fill="none" d="M0 0h48v48H0z"/>
                  </svg>
                  Continue with Google
                </>
              )}
            </button>

            <div className="auth-divider">
              <span>or sign up with email</span>
            </div>
          </>
        )}

        {step === 1 ? (
          <form className="auth-form" onSubmit={handleSendOTP}>
            <div className="form-group">
              <label htmlFor="signup-email" className="form-label">Email</label>
              <input
                id="signup-email"
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                required
              />
            </div>
            <button id="signup-send-otp-btn" type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
              {loading ? <LoadingSpinner size="small" /> : '📨 Send Verification Code'}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleVerify}>
            <div className="form-group">
              <label htmlFor="signup-otp" className="form-label">Verification Code</label>
              <input
                id="signup-otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                className="form-input"
                placeholder="6-digit OTP"
                value={formData.otp}
                onChange={(e) => setFormData((p) => ({ ...p, otp: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="signup-name" className="form-label">Full Name</label>
              <input
                id="signup-name"
                type="text"
                className="form-input"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="signup-password" className="form-label">Password</label>
              <div className="input-wrapper">
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Min. 8 characters"
                  value={formData.password}
                  onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                  required
                />
                <button type="button" className="input-icon" onClick={() => setShowPassword((v) => !v)}>
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {formData.password && (
                <div className="pw-strength">
                  <div className="pw-strength-bar">
                    <div
                      className="pw-strength-fill"
                      style={{ width: `${pwStrengthPercent}%`, background: pwStrength.color }}
                    />
                  </div>
                  <span className="pw-strength-label" style={{ color: pwStrength.color }}>
                    {pwStrength.label}
                  </span>
                </div>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="signup-confirm-password" className="form-label">Confirm Password</label>
              <input
                id="signup-confirm-password"
                type="password"
                className="form-input"
                placeholder="Re-enter password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData((p) => ({ ...p, confirmPassword: e.target.value }))}
                required
              />
            </div>
            <button id="signup-submit-btn" type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
              {loading ? <LoadingSpinner size="small" /> : '🚀 Create Account'}
            </button>
            <p className="spam-notice-text" style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', marginTop: '12px', lineHeight: '1.4' }}>
              ℹ️ Don't see the email? Please check your <strong>Spam folder</strong>. If it's there, mark it as <strong>"Not Spam"</strong> to receive future task reminders directly in your inbox.
            </p>
            <button type="button" className="btn btn-secondary btn-full" onClick={() => { setStep(1); setError(''); }}>
              ← Back
            </button>
          </form>
        )}

        <div className="auth-footer">
          Already have an account?{' '}
          <Link to="/login" id="signup-login-link">Sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
