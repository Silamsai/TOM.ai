import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { forgotPassword, verifyResetOTP, resetPassword } from '../services/api';
import { isValidEmail, isValidOTP, isValidPassword, getPasswordStrength } from '../utils/validators';
import { AlertCircle, CheckCircle, Mail, KeyRound, Lock, ArrowLeft } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import '../styles/pages.css';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1 = email, 2 = otp, 3 = new password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [passwords, setPasswords] = useState({ newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const pwStrength = getPasswordStrength(passwords.newPassword);
  const pwStrengthPercent = { Weak: 25, Fair: 50, Good: 75, Strong: 100 }[pwStrength.label] || 0;

  // Step 1: Send OTP
  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    if (!isValidEmail(email)) return setError('Please enter a valid email address.');
    setLoading(true);
    try {
      await forgotPassword(email);
      setSuccess('Reset OTP sent if that email exists in our system.');
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    if (!isValidOTP(otp)) return setError('OTP must be exactly 6 digits.');
    setLoading(true);
    try {
      await verifyResetOTP(email, otp);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (!isValidPassword(passwords.newPassword)) return setError('Password must be at least 8 characters.');
    if (passwords.newPassword !== passwords.confirmPassword) return setError('Passwords do not match.');
    setLoading(true);
    try {
      await resetPassword(email, otp, passwords.newPassword);
      setSuccess('Password reset successfully! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { label: 'Email' },
    { label: 'Verify OTP' },
    { label: 'New Password' },
  ];

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="logo-icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Lock size={28} /></span>
          <h1>TOM.AI</h1>
          <p>Reset your password</p>
        </div>

        {/* Step indicator */}
        <div className="step-indicator" aria-label={`Step ${step} of 3`}>
          {steps.map((s, i) => (
            <React.Fragment key={i}>
              <div className={`step-dot ${step > i + 1 ? 'done' : step === i + 1 ? 'active' : ''}`} title={s.label} />
              {i < steps.length - 1 && <div className="step-line" />}
            </React.Fragment>
          ))}
        </div>

        <h2 className="auth-title">{steps[step - 1].label}</h2>

        {error && (
          <div className="alert alert-error" role="alert" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle size={14} />
            <span>{success}</span>
          </div>
        )}

        {step === 1 && (
          <form className="auth-form" onSubmit={handleSendOTP}>
            <div className="form-group">
              <label htmlFor="forgot-email" className="form-label">Email Address</label>
              <input
                id="forgot-email"
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                required
              />
            </div>
            <button id="forgot-send-otp-btn" type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              {loading ? <LoadingSpinner size="small" /> : (
                <>
                  <Mail size={16} />
                  <span>Send Reset Code</span>
                </>
              )}
            </button>
          </form>
        )}

        {step === 2 && (
          <form className="auth-form" onSubmit={handleVerifyOTP}>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>
              Code sent to <strong>{email}</strong>
            </p>
            <div className="form-group">
              <label htmlFor="forgot-otp" className="form-label">6-Digit OTP</label>
              <input
                id="forgot-otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                className="form-input"
                placeholder="123456"
                value={otp}
                onChange={(e) => { setOtp(e.target.value); setError(''); }}
                required
              />
            </div>
            <button id="forgot-verify-otp-btn" type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              {loading ? <LoadingSpinner size="small" /> : (
                <>
                  <CheckCircle size={16} />
                  <span>Verify OTP</span>
                </>
              )}
            </button>
            <div className="spam-notice-text" style={{ fontSize: '12px', color: '#9ca3af', marginTop: '12px', lineHeight: '1.4', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
              <AlertCircle size={14} style={{ marginTop: 2, flexShrink: 0 }} />
              <span>Don't see the email? Please check your <strong>Spam folder</strong>. If it's there, mark it as <strong>"Not Spam"</strong> to receive future reset emails directly in your inbox.</span>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-full"
              onClick={() => { setStep(1); setError(''); }}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '12px' }}
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>
          </form>
        )}

        {step === 3 && (
          <form className="auth-form" onSubmit={handleResetPassword}>
            <div className="form-group">
              <label htmlFor="forgot-new-password" className="form-label">New Password</label>
              <input
                id="forgot-new-password"
                type="password"
                className="form-input"
                placeholder="Min. 8 characters"
                value={passwords.newPassword}
                onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))}
                required
              />
              {passwords.newPassword && (
                <div className="pw-strength">
                  <div className="pw-strength-bar">
                    <div className="pw-strength-fill" style={{ width: `${pwStrengthPercent}%`, background: pwStrength.color }} />
                  </div>
                  <span className="pw-strength-label" style={{ color: pwStrength.color }}>{pwStrength.label}</span>
                </div>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="forgot-confirm-password" className="form-label">Confirm Password</label>
              <input
                id="forgot-confirm-password"
                type="password"
                className="form-input"
                placeholder="Re-enter password"
                value={passwords.confirmPassword}
                onChange={(e) => setPasswords((p) => ({ ...p, confirmPassword: e.target.value }))}
                required
              />
            </div>
            <button id="forgot-reset-btn" type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              {loading ? <LoadingSpinner size="small" /> : (
                <>
                  <KeyRound size={16} />
                  <span>Reset Password</span>
                </>
              )}
            </button>
          </form>
        )}

        <div className="auth-footer">
          <Link to="/login" id="forgot-back-login" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <ArrowLeft size={14} />
            <span>Back to Login</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
