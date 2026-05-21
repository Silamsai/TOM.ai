import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../services/api';
import { setToken, setUser } from '../utils/storage';
import { isValidEmail } from '../utils/validators';
import { redirectToGoogle } from '../utils/googleAuth';
import LoadingSpinner from '../components/LoadingSpinner';
import '../styles/pages.css';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleLogin = () => {
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

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isValidEmail(formData.email)) {
      return setError('Please enter a valid email address.');
    }
    if (!formData.password) {
      return setError('Password is required.');
    }

    setLoading(true);
    try {
      const res = await login(formData.email, formData.password);
      const { token, user, admin } = res.data.data;
      
      if (admin) {
        localStorage.setItem('tom_admin_token', token);
        setUser(user);
        navigate('/admin');
      } else {
        setToken(token);
        setUser(user);
        navigate('/chat');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <span className="logo-icon"><img src="/images/logo.png" alt="tom.ai" width="32" height="32" style={{borderRadius:'8px',objectFit:'contain'}} /></span>
          <h1>tom.ai</h1>
          <p>Your intelligent personal assistant</p>
        </div>

        <h2 className="auth-title">Welcome back</h2>
        <p className="auth-subtitle">Sign in to continue to tom.ai</p>

        {error && (
          <div className="alert alert-error" role="alert">
            ⚠️ {error}
          </div>
        )}

        {/* ── Google Sign-In ── */}
        <button
          id="login-google-btn"
          type="button"
          className="btn-google"
          onClick={handleGoogleLogin}
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

        {/* ── Divider ── */}
        <div className="auth-divider">
          <span>or sign in with email</span>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="login-email" className="form-label">Email</label>
            <input
              id="login-email"
              name="email"
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password" className="form-label">Password</label>
            <div className="input-wrapper">
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="input-icon"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div style={{ textAlign: 'right', marginTop: '-8px' }}>
            <Link to="/forgot-password" id="login-forgot-link" style={{ fontSize: '13px' }}>
              Forgot password?
            </Link>
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading}
          >
            {loading ? <LoadingSpinner size="small" /> : '→ Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account?{' '}
          <Link to="/signup" id="login-signup-link">Create one</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
