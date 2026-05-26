import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import ChatSidebar, { ConnectModal } from '../components/ChatSidebar';
import { getCurrentUser, updateProfile } from '../services/api';
import {
  getToken,
  getUser,
  setUser,
  clearAll,
  getTheme,
  setTheme as saveTheme,
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
  IconChatHistory,
} from '../components/icons/UiIcons';
import '../styles/settings.css';
import '../styles/pages.css';
import '../styles/components.css';

const TABS = [
  { id: 'profile', label: 'Profile & Account', Icon: IconProfile },
  { id: 'ai_personality', label: 'AI & Persona Settings', Icon: IconChatHistory },
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
  const user  = getUser();
  const guest = getGuestProfile();
  const displayNameShort = user?.name?.split(' ')[0] || guest?.name?.split(' ')[0] || null;
  const initials = ((user?.name || guest?.name || 'G')
    .split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2));

  // Layout state
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [connectOpen, setConnectOpen] = useState(false);

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
  const [aiPersona, setAiPersona] = useState('professional');
  const [dailyBriefTime, setDailyBriefTime] = useState('disabled');

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
      setAiPersona(localStorage.getItem('tom_ai_persona') || 'professional');
      setDailyBriefTime(localStorage.getItem('tom_ai_daily_brief') || 'disabled');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await getCurrentUser();
      const u = res.data.data;
      setDisplayName(u.name || '');
      setAiPersona(u.aiPersona || 'professional');
      setDailyBriefTime(u.dailyBriefTime || 'disabled');
      setAccountInfo(u);
      setUser(u); // Sync local storage with fresh DB model
    } catch (err) {
      // Fallback to cache if offline/failed
      setDisplayName(cachedUser?.name || '');
      setAiPersona(cachedUser?.aiPersona || 'professional');
      setDailyBriefTime(cachedUser?.dailyBriefTime || 'disabled');
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
    saveTheme(theme);
  }, [theme]);

  const handleSessionChange = () => navigate('/chat');
  const handleNewChat = () => navigate('/chat');

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

  const handleSaveAiSettings = async () => {
    setSaving(true);
    if (isLoggedIn) {
      try {
        const res = await updateProfile({ aiPersona, dailyBriefTime });
        const updatedUser = res.data.data;
        setUser(updatedUser);
        setAccountInfo(updatedUser);
        showMsg('AI settings saved successfully.');
      } catch (err) {
        showMsg(err.response?.data?.message || 'Failed to save AI settings.', true);
      } finally {
        setSaving(false);
      }
    } else {
      try {
        localStorage.setItem('tom_ai_persona', aiPersona);
        localStorage.setItem('tom_ai_daily_brief', dailyBriefTime);
        showMsg('Local AI settings updated.');
      } catch {
        showMsg('Failed to save local AI settings.', true);
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

  const renderAiPersonality = () => (
    <section className="settings-section" id="settings-ai-personality">
      <div className="settings-section-header">
        <h2>AI & Persona Settings</h2>
        <p>Tailor TOM.AI's personality, tone, and proactive briefing digests.</p>
      </div>

      <div style={{ marginBottom: '28px' }}>
        <h3 style={{ marginBottom: '14px', fontSize: '15px', color: 'var(--white)' }}>Assistant Persona & Tone</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          {[
            { id: 'professional', label: '💼 Professional & Direct', desc: 'Competent, concise, direct, and structured responses. Ideal for productivity.' },
            { id: 'creative', label: '🎨 Warm & Creative', desc: 'Expressive, encouraging, highly descriptive vocabulary and analogies.' },
            { id: 'sarcastic', label: '🌶️ Sarcastic Buddy', desc: 'Playful, dry, witty banter while keeping solutions 100% accurate.' },
            { id: 'empathetic', label: '❤️ Empathetic Coach', desc: 'Compassionate, gentle, patient, validating and deeply supportive.' }
          ].map(p => (
            <div
              key={p.id}
              onClick={() => setAiPersona(p.id)}
              style={{
                padding: '16px',
                borderRadius: '12px',
                border: aiPersona === p.id ? '2px solid #4f46e5' : '1px solid rgba(255,255,255,0.08)',
                background: aiPersona === p.id ? 'rgba(79,70,229,0.08)' : 'rgba(255,255,255,0.02)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}
              className="persona-card-option"
            >
              <strong style={{ color: aiPersona === p.id ? '#fff' : '#c7d2fe', fontSize: '13.5px' }}>{p.label}</strong>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)', lineHeight: '1.45' }}>{p.desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="settings-row" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: '10px', padding: '20px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="settings-row-label">
          <strong>Daily Task Summary Digest</strong>
          <span style={{ marginTop: '4px' }}>Opt-in to receive a structured email containing all your pending & overdue tasks every day</span>
        </div>
        <select
          className="form-input form-select"
          style={{ width: '100%', maxWidth: '240px', padding: '8px 12px', marginTop: '6px' }}
          value={dailyBriefTime}
          onChange={(e) => setDailyBriefTime(e.target.value)}
        >
          <option value="disabled">Disabled</option>
          <option value="08:00">08:00 AM (Recommended)</option>
          <option value="09:00">09:00 AM</option>
          <option value="10:00">10:00 AM</option>
          <option value="18:00">06:00 PM</option>
        </select>
      </div>

      <button className="btn btn-primary" onClick={handleSaveAiSettings} disabled={saving} style={{ marginTop: '16px' }}>
        {saving ? <LoadingSpinner size="small" /> : 'Save AI Settings'}
      </button>
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
    ai_personality: renderAiPersonality,
    appearance: renderAppearance,
    storage: renderStorage,
    notifications: renderNotifications,
  };

  return (
    <div className="chat-page-v2">
      {/* ── Collapsible Sidebar ── */}
      <ChatSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSessionChange={handleSessionChange}
        onNewChat={handleNewChat}
        isAuthenticated={isLoggedIn}
        userName={displayNameShort}
      />

      {/* ── Main area ── */}
      <div className="chat-main-v2">
        {/* ════ TOP NAVIGATION BAR ════ */}
        <header className="chat-nav-v2">
          {/* Left: hamburger + logo */}
          <div className="chat-nav-left">
            <button
              className="chat-nav-hamburger"
              onClick={() => setSidebarOpen(v => !v)}
              aria-label="Toggle sidebar"
              title="Chat history"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <div className="chat-nav-logo">
              <img src="/images/logo.png" alt="tom.ai" width="26" height="26" style={{ borderRadius: '7px', objectFit: 'contain' }} />
              <span>tom.ai</span>
            </div>
          </div>

          {/* Center: Chat / Tasks / Settings tabs */}
          <nav className="chat-nav-center">
            <Link to="/chat" className="chat-nav-tab" id="nav-chat-tab">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              Chat
            </Link>
            <Link to="/tasks" className="chat-nav-tab" id="nav-tasks-tab">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 12l2 2 4-4"/>
              </svg>
              Tasks
            </Link>
            <Link to="/settings" className="chat-nav-tab chat-nav-tab--active" id="nav-settings-tab">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              Settings
            </Link>
          </nav>

          {/* Right: Connect + theme toggle + avatar */}
          <div className="chat-nav-right">
            <button
              id="settings-connect-btn"
              className="chat-topbar-connect-btn"
              title="Connect integrations"
              onClick={() => setConnectOpen(true)}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              Connect
            </button>

            <button
              className="chat-nav-icon-btn"
              onClick={() => setThemeState(theme === 'dark' ? 'light' : 'dark')}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              )}
            </button>

            {/* User avatar */}
            <div className="chat-user-avatar" title={user?.name || guest?.name || 'Guest'}>
              {user?.picture ? (
                <img src={user.picture} alt={user.name} width="32" height="32" style={{ borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <span>{initials}</span>
              )}
            </div>

            {displayNameShort && (
              <span className="chat-nav-username">
                {isLoggedIn ? `Good morning, ${displayNameShort}!` : displayNameShort}
              </span>
            )}
          </div>
        </header>

        {/* ── Settings content ── */}
        <div style={{ overflowY: 'auto', flex: 1, width: '100%' }}>
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
      </div>

      {connectOpen && <ConnectModal onClose={() => setConnectOpen(false)} />}
    </div>
  );
};

export default Settings;
