import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  getCurrentUser,
  updateProfile,
  getUserAccess,
  getUserStorage,
  clearServerChatHistory,
  revokeGmailAccess,
  revokeCalendarAccess,
} from '../services/api';
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
} from '../utils/storage';
import { clearAllSessions, getAllSessions } from '../utils/chatSessions';
import { getLocalStorageUsage, formatBytes, getGuestSessionStats } from '../utils/storageStats';
import {
  IconProfile, IconAccount, IconAccess, IconChatHistory,
  IconStorage, IconAppearance, IconBell,
} from '../components/icons/UiIcons';
import '../styles/settings.css';

const NAV = [
  { id: 'profile', label: 'Profile', Icon: IconProfile, auth: true },
  { id: 'account', label: 'Account', Icon: IconAccount, auth: true },
  { id: 'access', label: 'Access', Icon: IconAccess, auth: true },
  { id: 'chat', label: 'Chat history', Icon: IconChatHistory, auth: false },
  { id: 'storage', label: 'Storage', Icon: IconStorage, auth: false },
  { id: 'appearance', label: 'Appearance', Icon: IconAppearance, auth: false },
  { id: 'notifications', label: 'Notifications', Icon: IconBell, auth: false },
];

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const Settings = () => {
  const navigate = useNavigate();
  const isLoggedIn = !!getToken();
  const cachedUser = getUser();

  const [section, setSection] = useState(() => (getToken() ? 'profile' : 'appearance'));
  const [loading, setLoading] = useState(isLoggedIn);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [profile, setProfile] = useState({ name: cachedUser?.name || '', email: cachedUser?.email || '' });
  const [account, setAccount] = useState(null);
  const [access, setAccess] = useState(null);
  const [serverStorage, setServerStorage] = useState(null);
  const [localUsage, setLocalUsage] = useState(() => getLocalStorageUsage());
  const [guestStats, setGuestStats] = useState(() => getGuestSessionStats());
  const [theme, setThemeState] = useState(getTheme());
  const [notifPref, setNotifPref] = useState(getNotificationsPref());
  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );

  const refreshLocalStats = () => {
    setLocalUsage(getLocalStorageUsage());
    setGuestStats(getGuestSessionStats());
  };

  const loadSettings = useCallback(async () => {
    if (!isLoggedIn) {
      setLoading(false);
      if (!cachedUser) setSection('appearance');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [meRes, accessRes, storageRes] = await Promise.all([
        getCurrentUser(),
        getUserAccess(),
        getUserStorage(),
      ]);
      const u = meRes.data.data;
      setProfile({ name: u.name || '', email: u.email || '' });
      setAccount(u);
      setUser(u);
      setAccess(accessRes.data.data);
      setServerStorage(storageRes.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load settings.');
    } finally {
      setLoading(false);
      refreshLocalStats();
    }
  }, [isLoggedIn, cachedUser]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (theme === 'light') document.body.classList.add('light-mode');
    else document.body.classList.remove('light-mode');
    setTheme(theme);
  }, [theme]);

  const showMsg = (msg, isError = false) => {
    if (isError) setError(msg);
    else setMessage(msg);
    setTimeout(() => { setMessage(''); setError(''); }, 3500);
  };

  const handleSaveProfile = async () => {
    if (!profile.name.trim()) return showMsg('Name is required.', true);
    setSaving(true);
    try {
      const res = await updateProfile({ name: profile.name.trim() });
      setUser(res.data.data);
      setAccount(res.data.data);
      showMsg('Profile saved.');
    } catch (err) {
      showMsg(err.response?.data?.message || 'Could not save profile.', true);
    } finally {
      setSaving(false);
    }
  };

  const handleClearServerChat = async () => {
    if (!window.confirm('Delete all chat history from the server? This cannot be undone.')) return;
    try {
      const res = await clearServerChatHistory();
      showMsg(`Cleared ${res.data.data.deletedCount} messages from server.`);
      const storageRes = await getUserStorage();
      setServerStorage(storageRes.data.data);
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to clear chat history.', true);
    }
  };

  const handleClearLocalChats = () => {
    if (!window.confirm('Delete all local chat sessions on this device?')) return;
    clearAllSessions();
    refreshLocalStats();
    showMsg('Local chat sessions cleared.');
  };

  const handleClearLocalData = () => {
    if (!window.confirm('Clear cached app data on this device? You will stay signed in.')) return;
    const n = clearLocalAppData({ includeAuth: false });
    refreshLocalStats();
    showMsg(`Cleared ${n} local items.`);
  };

  const handleRevoke = async (type) => {
    try {
      if (type === 'gmail') await revokeGmailAccess();
      if (type === 'calendar') await revokeCalendarAccess();
      const accessRes = await getUserAccess();
      setAccess(accessRes.data.data);
      showMsg(`${type} access revoked.`);
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to revoke access.', true);
    }
  };

  const handleLogout = () => {
    clearAll();
    navigate('/');
  };

  const pickSection = (id) => {
    const item = NAV.find((n) => n.id === id);
    if (item?.auth && !isLoggedIn) return;
    setSection(id);
  };

  const localSessions = getAllSessions().length;

  const renderProfile = () => (
    <section className="settings-section" id="settings-profile">
      <div className="settings-section-header">
        <h2>Profile</h2>
        <p>Your display name and photo shown in chat.</p>
      </div>
      {!isLoggedIn ? (
        <div className="settings-guest-banner">
          <Link to="/login">Sign in</Link> to edit your profile.
        </div>
      ) : (
        <>
          <div className="settings-profile-card">
            <div className="settings-avatar">
              {account?.picture ? (
                <img src={account.picture} alt="" referrerPolicy="no-referrer" />
              ) : (
                (profile.name || profile.email || '?').charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>{profile.name || 'User'}</div>
              <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>{profile.email}</div>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="settings-name">Display name</label>
            <input
              id="settings-name"
              className="form-input"
              value={profile.name}
              onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
              maxLength={80}
            />
          </div>
          <button className="btn btn-primary" onClick={handleSaveProfile} disabled={saving}>
            {saving ? <LoadingSpinner size="small" /> : 'Save profile'}
          </button>
        </>
      )}
    </section>
  );

  const renderAccount = () => (
    <section className="settings-section" id="settings-account">
      <div className="settings-section-header">
        <h2>Account</h2>
        <p>Email, sign-in method, and security.</p>
      </div>
      {!isLoggedIn ? (
        <div className="settings-guest-banner"><Link to="/login">Sign in</Link> to view account details.</div>
      ) : (
        <>
          <div className="settings-row">
            <div className="settings-row-label">
              <strong>Email</strong>
              <span>{account?.email || '—'}</span>
            </div>
            <span className="settings-badge settings-badge--on">Verified</span>
          </div>
          <div className="settings-row">
            <div className="settings-row-label">
              <strong>Sign-in method</strong>
              <span>{account?.signupMethod === 'google' ? 'Google' : 'Email & password'}</span>
            </div>
          </div>
          <div className="settings-row">
            <div className="settings-row-label">
              <strong>Member since</strong>
              <span>{formatDate(account?.createdAt)}</span>
            </div>
          </div>
          <div className="settings-row">
            <div className="settings-row-label">
              <strong>Last login</strong>
              <span>{formatDate(account?.lastLogin)}</span>
            </div>
          </div>
          <div className="settings-actions">
            <Link to="/forgot-password" className="btn btn-secondary btn-sm">Change password</Link>
            <button type="button" className="btn btn-danger btn-sm" onClick={handleLogout}>Log out</button>
          </div>
        </>
      )}
    </section>
  );

  const renderAccess = () => (
    <section className="settings-section" id="settings-access">
      <div className="settings-section-header">
        <h2>Access & integrations</h2>
        <p>Manage what tom.ai can access on your behalf.</p>
      </div>
      {!isLoggedIn ? (
        <div className="settings-guest-banner"><Link to="/login">Sign in</Link> to manage integrations.</div>
      ) : (
        <>
          {['gmail', 'calendar', 'tasks'].map((key) => {
            const integ = access?.integrations?.[key] || {};
            const label = key.charAt(0).toUpperCase() + key.slice(1);
            return (
              <div key={key} className="settings-row">
                <div className="settings-row-label">
                  <strong>{label}</strong>
                  <span>{integ.connected ? 'Connected' : 'Not connected'}</span>
                </div>
                <span className={`settings-badge ${integ.enabled ? 'settings-badge--on' : 'settings-badge--off'}`}>
                  {integ.enabled ? 'Allowed' : 'Off'}
                </span>
                {integ.connected && (key === 'gmail' || key === 'calendar') && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleRevoke(key)}
                  >
                    Revoke
                  </button>
                )}
              </div>
            );
          })}
          <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 12 }}>
            Connect apps from the chat sidebar → Connect MCP.
          </p>
        </>
      )}
    </section>
  );

  const renderChatHistory = () => (
    <section className="settings-section" id="settings-chat">
      <div className="settings-section-header">
        <h2>Chat history</h2>
        <p>Manage conversations stored on this device and on the server.</p>
      </div>
      <div className="settings-stat-grid">
        <div className="settings-stat">
          <div className="settings-stat-num">{localSessions}</div>
          <div className="settings-stat-label">Local sessions</div>
        </div>
        <div className="settings-stat">
          <div className="settings-stat-num">{guestStats.messages}</div>
          <div className="settings-stat-label">Local messages</div>
        </div>
        <div className="settings-stat">
          <div className="settings-stat-num">{isLoggedIn ? (serverStorage?.chatMessages ?? '…') : '—'}</div>
          <div className="settings-stat-label">Server messages</div>
        </div>
      </div>
      <div className="settings-actions">
        <button type="button" className="btn btn-secondary btn-sm" onClick={handleClearLocalChats}>
          Clear local chats
        </button>
        {isLoggedIn && (
          <button type="button" className="btn btn-danger btn-sm" onClick={handleClearServerChat}>
            Clear server history
          </button>
        )}
      </div>
      {!isLoggedIn && (
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 12 }}>
          Sign in to sync and manage chat history on the server.
        </p>
      )}
    </section>
  );

  const renderStorage = () => (
    <section className="settings-section" id="settings-storage">
      <div className="settings-section-header">
        <h2>Storage & data</h2>
        <p>See how much space tom.ai uses and free up room.</p>
      </div>
      <div className="settings-stat-grid">
        <div className="settings-stat">
          <div className="settings-stat-num">{formatBytes(localUsage.bytes)}</div>
          <div className="settings-stat-label">Browser storage</div>
        </div>
        {isLoggedIn && (
          <>
            <div className="settings-stat">
              <div className="settings-stat-num">{serverStorage?.tasks ?? 0}</div>
              <div className="settings-stat-label">Tasks</div>
            </div>
            <div className="settings-stat">
              <div className="settings-stat-num">{serverStorage?.ragDocuments ?? 0}</div>
              <div className="settings-stat-label">Memory (RAG)</div>
            </div>
          </>
        )}
      </div>
      <div className="settings-actions">
        <button type="button" className="btn btn-secondary btn-sm" onClick={handleClearLocalData}>
          Clear local cache
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={refreshLocalStats}>
          Refresh stats
        </button>
      </div>
    </section>
  );

  const renderAppearance = () => (
    <section className="settings-section" id="settings-appearance">
      <div className="settings-section-header">
        <h2>Appearance</h2>
        <p>Theme and display preferences.</p>
      </div>
      <div className="settings-row">
        <div className="settings-row-label">
          <strong>Theme</strong>
          <span>Dark or light mode across the app</span>
        </div>
        <select
          className="form-input form-select"
          style={{ width: 'auto', minWidth: 120 }}
          value={theme}
          onChange={(e) => setThemeState(e.target.value)}
        >
          <option value="dark">Dark</option>
          <option value="light">Light</option>
        </select>
      </div>
    </section>
  );

  const renderNotifications = () => (
    <section className="settings-section" id="settings-notifications">
      <div className="settings-section-header">
        <h2>Notifications</h2>
        <p>Browser alerts for tasks and reminders.</p>
      </div>
      <div className="settings-row">
        <div className="settings-row-label">
          <strong>Browser permission</strong>
          <span>{notifPermission}</span>
        </div>
        {notifPermission === 'default' && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={async () => {
              if ('Notification' in window) {
                const p = await Notification.requestPermission();
                setNotifPermission(p);
              }
            }}
          >
            Allow notifications
          </button>
        )}
      </div>
      <div className="settings-row">
        <div className="settings-row-label">
          <strong>Task reminders in browser</strong>
          <span>Show alerts when you add tasks (this device)</span>
        </div>
        <label className="settings-badge settings-badge--on" style={{ cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={notifPref}
            onChange={(e) => {
              setNotifPref(e.target.checked);
              setNotificationsPref(e.target.checked);
            }}
            style={{ marginRight: 6 }}
          />
          {notifPref ? 'On' : 'Off'}
        </label>
      </div>
    </section>
  );

  const sectionMap = {
    profile: renderProfile,
    account: renderAccount,
    access: renderAccess,
    chat: renderChatHistory,
    storage: renderStorage,
    appearance: renderAppearance,
    notifications: renderNotifications,
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Navbar />
      <div className="settings-page">
        <div className="settings-container">
          <nav className="settings-nav" aria-label="Settings sections">
            <div className="settings-nav-title">Settings</div>
            {NAV.map((item) => {
              const locked = item.auth && !isLoggedIn;
              const NavIcon = item.Icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`settings-nav-btn ${section === item.id ? 'active' : ''} ${locked ? 'locked' : ''}`}
                  onClick={() => pickSection(item.id)}
                  title={locked ? 'Sign in required' : item.label}
                >
                  <span className="settings-nav-icon"><NavIcon size={16} /></span>
                  <span className="settings-nav-label">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="settings-main">
            {message && <div className="alert alert-success">{message}</div>}
            {error && <div className="alert alert-error">{error}</div>}
            {loading ? (
              <LoadingSpinner size="medium" text="Loading settings…" />
            ) : (
              sectionMap[section]?.()
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
