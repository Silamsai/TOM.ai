import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/auth-legal.css';

/**
 * Compact “by continuing…” notice used on Welcome / Login / Signup / AuthModal.
 */
const AuthLegalNotice = ({ className = '' }) => (
  <p className={`auth-legal-notice ${className}`.trim()}>
    By continuing, you agree to our{' '}
    <Link to="/terms" target="_blank" rel="noopener noreferrer">
      Terms of Service
    </Link>{' '}
    and{' '}
    <Link to="/privacy" target="_blank" rel="noopener noreferrer">
      Privacy Policy
    </Link>
    .
  </p>
);

export default AuthLegalNotice;
