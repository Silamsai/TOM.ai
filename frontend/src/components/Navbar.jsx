import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { clearAll, getUser, getGuestProfile } from '../utils/storage';
import AuthModal from './AuthModal';
import '../styles/components.css';

const getGreeting = (name) => {
  const h = new Date().getHours();
  const time = h>=5&&h<12?'Good Morning':h>=12&&h<17?'Good Afternoon':h>=17&&h<21?'Good Evening':'Good Night';
  return name ? `${time}, ${name}!` : `${time}!`;
};

/**
 * ─────────────────────────────────────────────
 * TO CHANGE THE LOGO (PNG format works!):
 *   Put your image file here:
 *   👉  d:\tom-ai\tom-ai-frontend\public\images\logo.png
 *
 *   Or SVG:
 *   👉  d:\tom-ai\tom-ai-frontend\public\images\logo.svg
 *
 *   That's it — the logo updates automatically!
 * ─────────────────────────────────────────────
 */
const TomLogo = () => (
  <img
    src="/images/logo.png"
    alt="tom.ai logo"
    width="32"
    height="32"
    style={{ borderRadius: '8px', display: 'block', objectFit: 'contain' }}
    onError={(e) => {
      // Try SVG fallback
      if (!e.target.src.includes('logo.svg')) {
        e.target.src = '/images/logo.svg';
      } else {
        e.target.style.display = 'none';
      }
    }}
  />
);

const Navbar = ({ onSidebarToggle }) => {
  const navigate = useNavigate();
  const user         = getUser();
  const guestProfile = getGuestProfile();
  const [authOpen, setAuthOpen] = useState(false);
  const [, forceUpdate] = useState(0);

  const displayName = user?.name?.split(' ')[0] || guestProfile?.name?.split(' ')[0] || null;
  const initial     = displayName ? displayName.charAt(0).toUpperCase() : null;
  const greeting    = getGreeting(displayName);

  const handleLogout = () => { clearAll(); navigate('/'); };
  const handleAuthSuccess = () => { setAuthOpen(false); forceUpdate(n => n + 1); };

  return (
    <>
      <nav className="navbar" role="navigation" aria-label="Main navigation">
        <div className="navbar-inner">
          <NavLink to="/chat" className="navbar-brand" id="nav-brand">
            <TomLogo />
            <span className="brand-text">tom.ai</span>
          </NavLink>

          {user && (
            <div className="navbar-links">
              <NavLink to="/chat"  id="nav-chat"  className={({isActive})=>`nav-link ${isActive?'active':''}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                Chat
              </NavLink>
              <NavLink to="/todos" id="nav-todos" className={({isActive})=>`nav-link ${isActive?'active':''}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                Tasks
              </NavLink>
            </div>
          )}

          <div className="navbar-right">
            {displayName && (
              <div className="navbar-greeting">
                {/* Show Google profile pic if available, else initial letter */}
                {user?.picture ? (
                  <img
                    src={user.picture}
                    alt={displayName}
                    className="navbar-avatar-img"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                {initial && (
                  <div
                    className="navbar-avatar"
                    aria-label={`User: ${displayName}`}
                    style={{ display: user?.picture ? 'none' : 'flex' }}
                  >
                    {initial}
                  </div>
                )}
                <span className="hide-mobile navbar-greet-text">{greeting}</span>
              </div>
            )}
            {user ? (
              <button id="nav-logout" className="btn btn-secondary btn-sm" onClick={handleLogout}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Logout
              </button>
            ) : (
              <button id="nav-signin" className="btn btn-primary btn-sm nav-signin-btn" onClick={() => setAuthOpen(true)}>
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} onSuccess={handleAuthSuccess} />
    </>
  );
};

export default Navbar;
