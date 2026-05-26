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
  IconChatHistory,
} from '../components/icons/UiIcons';
import '../styles/settings.css';

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
