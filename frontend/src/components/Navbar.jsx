import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { clearAll, getUser, getGuestProfile } from '../utils/storage';
import { MessageSquare, CheckSquare, Settings as SettingsIcon, LogOut } from 'lucide-react';
import AuthModal from './AuthModal';
import '../styles/components.css';

const getGreeting = (name) => {
  const h = new Date().getHours();
  const time = h >= 5 && h < 12 ? 'Good Morning' : h >= 12 && h < 17 ? 'Good Afternoon' : h >= 17 && h < 21 ? 'Good Evening' : 'Good Night';
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
const TomLogo = () => {
  const [hovered, setHovered] = useState(false);
  return (
    <img
      src="/images/logo.png"
      alt="tom.ai logo"
      width="32"
      height="32"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: '8px',
        display: 'block',
        objectFit: 'contain',
        transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), filter 0.4s ease',
        transform: hovered ? 'scale(1.1) rotate(3deg)' : 'scale(1) rotate(0deg)',
        filter: hovered ? 'drop-shadow(0 4px 12px rgba(99, 102, 241, 0.45))' : 'none',
        cursor: 'pointer'
      }}
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
};


const Navbar = ({ onSidebarToggle }) => {
  const navigate = useNavigate();
  const user = getUser();
  const guestProfile = getGuestProfile();
  const [authOpen, setAuthOpen] = useState(false);
  const [, forceUpdate] = useState(0);

  const displayName = user?.name?.split(' ')[0] || guestProfile?.name?.split(' ')[0] || null;
  const initial = displayName ? displayName.charAt(0).toUpperCase() : null;
  const greeting = getGreeting(displayName);

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
              <NavLink to="/chat" id="nav-chat" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <MessageSquare size={14} />
                <span>Chat</span>
              </NavLink>
              <NavLink to="/todos" id="nav-todos" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <CheckSquare size={14} />
                <span>Tasks</span>
              </NavLink>
              <NavLink to="/settings" id="nav-settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <SettingsIcon size={14} />
                <span>Settings</span>
              </NavLink>
            </div>
          )}

          {!user && (
            <div className="navbar-links">
              <NavLink to="/settings" id="nav-settings-guest" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <SettingsIcon size={14} />
                <span>Settings</span>
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
              <button id="nav-logout" className="btn btn-secondary btn-sm" onClick={handleLogout} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <LogOut size={13} />
                <span>Logout</span>
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
