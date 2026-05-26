import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import LoadingSpinner from '../components/LoadingSpinner';
import { getCurrentUser, updateProfile } from '../services/api';
import {
  getToken,
  getUser,
  setUser,
  clearAll,
  getTheme,
  setTheme,
  getNotificationsPref,
  setNotificationsPref,
  clearLocalAppData,
  getGuestProfile,
  setGuestProfile,
} from '../utils/storage';
import { clearAllSessions, getAllSessions } from '../utils/chatSessions';
import {
  IconProfile,
  IconStorage,
  IconAppearance,
  IconBell,
} from '../components/icons/UiIcons';
import '../styles/settings.css';

const TABS = [
  { id: 'profile', label: 'Profile & Account', Icon: IconProfile },
  { id: 'appearance', label: 'Appearance', Icon: IconAppearance },
  { id: 'storage', label: 'Storage & Cache', Icon: IconStorage },
  { id: 'notifications', label: 'Notifications', Icon: IconBell },
];

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const Settings = () => {
  const navigate = useNavigate();
  const isLoggedIn = !!getToken();

  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(isLoggedIn);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Form states
  const [displayName, setDisplayName] = useState('');
  const [accountInfo, setAccountInfo] = useState(null);
  const [theme, setThemeState] = useState(() => getTheme());
  const [notifications, setNotifications] = useState(() => getNotificationsPref());
  const [localChatsCount, setLocalChatsCount] = useState(0);

  const showMsg = (msg, isError = false) => {
    if (isError) {
      setError(msg);
      setMessage('');
    } else {
      setMessage(msg);
      setError('');
    }
    setTimeout(() => {
      setMessage('');
      setError('');
    }, 3500);
  };

  const loadSettings = useCallback(async () => {
    const cachedUser = getUser();
    if (!isLoggedIn) {
      const gp = getGuestProfile();
      setDisplayName(gp?.name || 'Guest User');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await getCurrentUser();
      const u = res.data.data;
      setDisplayName(u.name || '');
      setAccountInfo(u);
      setUser(u); // Sync local storage with fresh DB model
    } catch (err) {
      // Fallback to cache if offline/failed
      setDisplayName(cachedUser?.name || '');
      setAccountInfo(cachedUser);
      showMsg('Could not sync with server. Showing offline settings.', true);
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    loadSettings();

    // Get count of local chat sessions
    try {
      const sessions = getAllSessions();
      setLocalChatsCount(sessions.length);
    } catch {
      setLocalChatsCount(0);
    }
  }, [loadSettings]);

  // Handle Theme Change
  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
    setTheme(theme);
  }, [theme]);

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      showMsg('Display name cannot be empty.', true);
      return;
    }

    setSaving(true);
    if (isLoggedIn) {
      try {
        const res = await updateProfile({ name: displayName.trim() });
        const updatedUser = res.data.data;
        setUser(updatedUser);
        setAccountInfo(updatedUser);
        showMsg('Profile updated successfully.');
      } catch (err) {
        showMsg(err.response?.data?.message || 'Failed to update profile.', true);
      } finally {
        setSaving(false);
      }
    } else {
      try {
        const gp = getGuestProfile() || {};
        gp.name = displayName.trim();
        setGuestProfile(gp);
        showMsg('Local profile updated.');
      } catch {
        showMsg('Failed to update local profile.', true);
      } finally {
        setSaving(false);
      }
    }
  };

  const handleNotificationChange = (e) => {
    const val = e.target.checked;
    setNotifications(val);
    setNotificationsPref(val);
    showMsg(`Local notifications turned ${val ? 'ON' : 'OFF'}.`);
  };

  const handleClearLocalChats = () => {
    if (!window.confirm('Delete all local chat sessions on this device? This cannot be undone.')) return;
    try {
      clearAllSessions();
      setLocalChatsCount(0);
      showMsg('Local chat sessions cleared.');
    } catch {
      showMsg('Failed to clear local chats.', true);
    }
  };

  const handleResetCache = () => {
    if (!window.confirm('Reset all cached app data? You will remain signed in, but local settings/history will clear.')) return;
    try {
      clearLocalAppData({ includeAuth: false });
      setThemeState('dark');
      setNotifications(false);
      setLocalChatsCount(0);
      if (!isLoggedIn) {
        setDisplayName('Guest User');
      }
      showMsg('All application cache reset.');
    } catch {
      showMsg('Failed to reset app cache.', true);
    }
  };

  const handleLogout = () => {
    clearAll();
    navigate('/');
  };

  const renderProfile = () => (
    <section className="settings-section" id="settings-profile">
      <div className="settings-section-header">
        <h2>Profile & Account</h2>
        <p>Manage your identity and authentication status.</p>
      </div>

      <div className="settings-profile-card">
        <div className="settings-avatar">
          {isLoggedIn && accountInfo?.picture ? (
            <img src={accountInfo.picture} alt={displayName} referrerPolicy="no-referrer" />
          ) : (
            (displayName || '?').charAt(0).toUpperCase()
          )}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: '16px' }}>{displayName || 'User'}</div>
          <div style={{ fontSize: '13px', color: 'var(--text-dim)' }}>
            {isLoggedIn ? accountInfo?.email : 'Local Guest Account'}
          </div>
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: '24px' }}>
        <label className="form-label" htmlFor="settings-name">Display Name</label>
        <input
          id="settings-name"
          className="form-input"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={80}
          placeholder="Enter display name"
        />
      </div>

      <button className="btn btn-primary" onClick={handleSaveProfile} disabled={saving} style={{ marginBottom: '24px' }}>
        {saving ? <LoadingSpinner size="small" /> : 'Save Display Name'}
      </button>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', marginTop: '10px' }}>
        <h3>Account details</h3>
        {isLoggedIn ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
            <div className="settings-row" style={{ border: 'none', padding: '4px 0' }}>
              <div className="settings-row-label">
                <strong>Sign-in method</strong>
                <span>{accountInfo?.signupMethod === 'google' ? 'Google Social Auth' : 'Email & Password'}</span>
              </div>
            </div>
            <div className="settings-row" style={{ border: 'none', padding: '4px 0' }}>
              <div className="settings-row-label">
                <strong>Member since</strong>
                <span>{formatDate(accountInfo?.createdAt)}</span>
              </div>
            </div>
            <div className="settings-actions" style={{ marginTop: '12px' }}>
              {accountInfo?.signupMethod !== 'google' && (
                <Link to="/forgot-password" className="btn btn-secondary btn-sm">Change Password</Link>
              )}
              <button type="button" className="btn btn-danger btn-sm" onClick={handleLogout}>Log Out</button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: '12px' }}>
            <div className="settings-guest-banner" style={{ margin: 0 }}>
              You are currently using <strong>tom.ai</strong> as a guest. Your chats are saved only on this device. <Link to="/login">Sign In</Link> to sync your messages, tasks, and memory to the cloud.
            </div>
          </div>
        )}
      </div>
    </section>
  );

  const renderAppearance = () => (
    <section className="settings-section" id="settings-appearance">
      <div className="settings-section-header">
        <h2>Appearance</h2>
        <p>Customize the visual styling of tom.ai.</p>
      </div>

      <div className="settings-row">
        <div className="settings-row-label">
          <strong>Theme Preference</strong>
          <span>Choose between Light and Dark visual styles</span>
        </div>
        <select
          className="form-input form-select"
          style={{ width: 'auto', minWidth: '140px', padding: '8px 12px' }}
          value={theme}
          onChange={(e) => setThemeState(e.target.value)}
        >
          <option value="dark">Dark Mode</option>
          <option value="light">Light Mode</option>
        </select>
      </div>
    </section>
  );

  const renderStorage = () => (
    <section className="settings-section" id="settings-storage">
      <div className="settings-section-header">
        <h2>Storage & Cache</h2>
        <p>Monitor and manage local storage allocations.</p>
      </div>

      <div className="settings-stat-grid" style={{ marginBottom: '24px' }}>
        <div className="settings-stat">
          <div className="settings-stat-num">{localChatsCount}</div>
          <div className="settings-stat-label">Local Chats</div>
        </div>
        <div className="settings-stat">
          <div className="settings-stat-num">{isLoggedIn ? 'Cloud Sync' : 'Guest'}</div>
          <div className="settings-stat-label">Backup Status</div>
        </div>
        <div className="settings-stat">
          <div className="settings-stat-num">{theme === 'dark' ? 'Dark' : 'Light'}</div>
          <div className="settings-stat-label">Selected Theme</div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
        <h3>Maintenance Tools</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '16px' }}>
          Free up space or reset configurations on this device.
        </p>
        <div className="settings-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleClearLocalChats}>
            Clear Local Chats
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleResetCache}>
            Reset Cache
          </button>
        </div>
      </div>
    </section>
  );

  const renderNotifications = () => (
    <section className="settings-section" id="settings-notifications">
      <div className="settings-section-header">
        <h2>Notifications</h2>
        <p>Manage how you receive alerts and task reminders.</p>
      </div>

      <div className="settings-row">
        <div className="settings-row-label">
          <strong>Task Reminders</strong>
          <span>Receive notifications for task deadlines and reminders (this device)</span>
        </div>
        <label className="settings-badge settings-badge--on" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <input
            type="checkbox"
            checked={notifications}
            onChange={handleNotificationChange}
            style={{ margin: 0 }}
          />
          <span>{notifications ? 'Enabled' : 'Disabled'}</span>
        </label>
      </div>
    </section>
  );

  const tabRenderers = {
    profile: renderProfile,
    appearance: renderAppearance,
    storage: renderStorage,
    notifications: renderNotifications,
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Navbar />
      <div className="settings-page">
        <div className="settings-container">
          <nav className="settings-nav" aria-label="Settings sections">
            <div className="settings-nav-title">Settings</div>
            {TABS.map((item) => {
              const TabIcon = item.Icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`settings-nav-btn ${activeTab === item.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(item.id)}
                  title={item.label}
                >
                  <span className="settings-nav-icon"><TabIcon size={16} /></span>
                  <span className="settings-nav-label">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="settings-main">
            {message && <div className="alert alert-success">{message}</div>}
            {error && <div className="alert alert-error">{error}</div>}
            {loading ? (
              <LoadingSpinner size="medium" text="Syncing settings with server…" />
            ) : (
              tabRenderers[activeTab]?.()
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
