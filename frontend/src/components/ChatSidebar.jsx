import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getAllSessions, createSession, deleteSession, setCurrentId, getCurrentId, renameSession } from '../utils/chatSessions';
import { getGmailAuthUrl, getPublicMcps, deleteChatConversation } from '../services/api';
import { getUser, getGuestProfile } from '../utils/storage';
import {
  IconTrash, IconClose, IconPencil,
  IconConnect, IconPlug, IconLock, IconCheck, IconLoader,
} from './icons/UiIcons';
import '../styles/sidebar.css';

/* ── Hardcoded MCP Applications List ── */
const MCP_APPS = [
  {
    id: 'calendar',
    name: 'Google Calendar',
    desc: 'Read & create calendar events',
    icon: `<svg viewBox="0 0 48 48" width="28" height="28"><rect width="48" height="48" rx="8" fill="#fff"/><path fill="#1a73e8" d="M35 8H13a5 5 0 00-5 5v22a5 5 0 005 5h22a5 5 0 005-5V13a5 5 0 00-5-5z"/><rect x="9" y="16" width="30" height="20" rx="2" fill="#fff"/><text x="24" y="32" textAnchor="middle" fill="#1a73e8" fontSize="14" fontWeight="bold">31</text><rect x="16" y="8" width="4" height="8" rx="2" fill="#185abc"/><rect x="28" y="8" width="4" height="8" rx="2" fill="#185abc"/></svg>`
  },
  {
    id: 'gmail',
    name: 'Gmail',
    desc: 'Read emails & draft replies',
    icon: `<svg viewBox="0 0 48 48" width="28" height="28"><path fill="#fafafa" d="M0 8h48v32H0z"/><path fill="#EA4335" d="M0 8l24 16L48 8H0z"/><path fill="#34A853" d="M48 8v32l-12-16 12-16z"/><path fill="#FBBC05" d="M0 40V8l12 16L0 40z"/><path fill="#C5221F" d="M0 40l12-16 12 8 12-8 12 16H0z"/></svg>`
  },
  {
    id: 'drive',
    name: 'Google Drive',
    desc: 'Access files & documents',
    icon: `<svg viewBox="0 0 48 48" width="28" height="28"><path fill="#4285F4" d="M16 40L2 16l8-4 14 24z"/><path fill="#34A853" d="M32 40L46 16l-8-4-14 24z"/><path fill="#FBBC05" d="M2 16l14 24h20L22 16z"/></svg>`
  },
  {
    id: 'notion',
    name: 'Notion',
    desc: 'Read & write Notion pages',
    icon: `<svg viewBox="0 0 48 48" width="28" height="28"><rect width="48" height="48" rx="8" fill="#fff" stroke="#e0e0e0"/><text x="24" y="34" textAnchor="middle" fill="#000" fontSize="26" fontWeight="900" fontFamily="serif">N</text></svg>`
  },
  {
    id: 'slack',
    name: 'Slack',
    desc: 'Send & read messages',
    icon: `<svg viewBox="0 0 48 48" width="28" height="28"><path fill="#E01E5A" d="M13 30a4 4 0 01-4 4 4 4 0 01-4-4 4 4 0 014-4h4v4z"/><path fill="#E01E5A" d="M15 30a4 4 0 014-4 4 4 0 014 4v10a4 4 0 01-4 4 4 4 0 01-4-4V30z"/><path fill="#36C5F0" d="M19 13a4 4 0 01-4-4 4 4 0 014-4 4 4 0 014 4v4h-4z"/><path fill="#36C5F0" d="M19 15a4 4 0 014 4 4 4 0 01-4 4H9a4 4 0 01-4-4 4 4 0 014-4h10z"/><path fill="#2EB67D" d="M36 19a4 4 0 014 4 4 4 0 01-4 4 4 4 0 01-4-4v-4h4z"/><path fill="#2EB67D" d="M34 19a4 4 0 01-4-4 4 4 0 014-4h10a4 4 0 014 4 4 4 0 01-4 4H34z"/><path fill="#ECB22E" d="M30 36a4 4 0 01-4 4 4 4 0 01-4-4 4 4 0 014-4h4v4z"/><path fill="#ECB22E" d="M30 34a4 4 0 014-4 4 4 0 014 4v10a4 4 0 01-4 4 4 4 0 01-4-4V34z"/></svg>`
  },
  {
    id: 'github',
    name: 'GitHub',
    desc: 'Access repos & issues',
    icon: `<svg viewBox="0 0 48 48" width="28" height="28"><rect width="48" height="48" rx="8" fill="#24292e"/><path fill="#fff" d="M24 8C15.16 8 8 15.16 8 24c0 7.08 4.59 13.09 10.96 15.21.8.15 1.09-.35 1.09-.77 0-.38-.01-1.39-.02-2.73-4.45.97-5.39-2.14-5.39-2.14-.73-1.85-1.78-2.34-1.78-2.34-1.45-.99.11-.97.11-.97 1.61.11 2.45 1.65 2.45 1.65 1.43 2.45 3.75 1.74 4.66 1.33.14-1.04.56-1.74 1.02-2.14-3.56-.4-7.3-1.78-7.3-7.93 0-1.75.63-3.18 1.65-4.31-.17-.41-.72-2.04.16-4.25 0 0 1.34-.43 4.4 1.64a15.3 15.3 0 014-.54c1.36.01 2.73.18 4 .54 3.05-2.07 4.39-1.64 4.39-1.64.88 2.21.33 3.84.16 4.25 1.03 1.13 1.65 2.56 1.65 4.31 0 6.16-3.75 7.52-7.32 7.92.57.49 1.09 1.47 1.09 2.96 0 2.14-.02 3.86-.02 4.39 0 .43.29.93 1.1.77C35.42 37.08 40 31.07 40 24 40 15.16 32.84 8 24 8z"/></svg>`
  }
];

/* ── Connect apps modal ── */
export const ConnectModal = ({ onClose }) => {
  const [mcpApps, setMcpApps] = useState(MCP_APPS);
  const [connecting, setConnecting] = useState(null);
  const [connected, setConnected] = useState([]);
  const [gmailConnected, setGmailConnected] = useState(
    () => localStorage.getItem('tom_gmail_connected') === 'true'
  );

  useEffect(() => {
    getPublicMcps()
      .then(res => {
        const d = res.data;
        if (d.success && d.data && d.data.length > 0) setMcpApps(d.data);
      })
      .catch(() => { });
  }, []);

  const handleConnect = async (appId) => {
    if (appId === 'gmail') {
      setConnecting('gmail');
      try {
        const res = await getGmailAuthUrl();
        const data = res.data;
        if (data.authUrl) {
          localStorage.setItem('tom_gmail_pending', 'true');
          window.location.href = data.authUrl;
        }
      } catch {
        alert('Backend not reachable. Make sure the backend is running.');
        setConnecting(null);
      }
      return;
    }
    setConnecting(appId);
    await new Promise(r => setTimeout(r, 1000));
    setConnected(prev => [...prev, appId]);
    setConnecting(null);
  };

  const handleDisconnect = (appId) => {
    if (appId === 'gmail') {
      localStorage.setItem('tom_gmail_connected', 'false');
      setGmailConnected(false);
    } else {
      setConnected(prev => prev.filter(id => id !== appId));
    }
  };

  const renderAppIcon = (iconStr, name) => {
    if (!iconStr) return <IconPlug size={22} />;
    const trimmed = iconStr.trim();
    if (trimmed.startsWith('<svg')) {
      return <span className="mcp-svg-wrapper" dangerouslySetInnerHTML={{ __html: trimmed }} />;
    }
    if (trimmed.startsWith('http') || trimmed.startsWith('/') || trimmed.startsWith('data:image')) {
      return <img src={trimmed} alt={name} width="28" height="28" style={{ borderRadius: '6px', objectFit: 'contain' }} onError={(e) => { e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="%23888" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>'; }} />;
    }
    return <span style={{ fontSize: '20px', lineHeight: '1' }}>{trimmed}</span>;
  };

  return (
    <div className="mcp-overlay" onClick={onClose}>
      <div className="mcp-modal" onClick={e => e.stopPropagation()}>
        <div className="mcp-header">
          <div className="mcp-title">
            <img src="/images/logo.png" alt="tom.ai" width="22" height="22" style={{ borderRadius: '6px', objectFit: 'contain' }} />
            <span>Connect</span>
          </div>
          <button className="mcp-close" onClick={onClose} aria-label="Close modal"><IconClose /></button>
        </div>

        <p className="mcp-desc">
          Link your apps and services to tom.ai. Once connected, the assistant can work with your data only when you allow it.
        </p>

        <div className="mcp-apps">
          {mcpApps.map(app => {
            const isGmail = app.id === 'gmail';
            const isConn = isGmail ? gmailConnected : connected.includes(app.id);
            const isLoading = connecting === app.id;
            return (
              <div key={app.id} className={`mcp-app ${isConn ? 'mcp-app-connected' : ''}`}>
                <span className="mcp-app-icon">{renderAppIcon(app.icon, app.name)}</span>
                <div className="mcp-app-info">
                  <span className="mcp-app-name">{app.name}</span>
                  <div className="mcp-app-desc">{app.desc}</div>
                </div>
                <button
                  className={`mcp-connect-btn ${isConn ? 'connected' : ''}`}
                  onClick={() => isConn ? handleDisconnect(app.id) : handleConnect(app.id)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="mcp-btn-inner"><IconLoader size={12} /> Connecting</span>
                  ) : isConn ? (
                    <span className="mcp-btn-inner"><IconCheck size={12} /> Connected</span>
                  ) : (
                    <span className="mcp-btn-inner"><IconConnect size={12} /> {isGmail ? 'Connect Gmail' : 'Connect'}</span>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <p className="mcp-note">
          <IconLock size={12} />
          <span>Connections stay on your account. tom.ai only accesses what you approve.</span>
        </p>
      </div>
    </div>
  );
};

/* ── Main Sidebar (ChatGPT-style) ── */
const ChatSidebar = ({ isOpen, onClose, onSessionChange, onNewChat, isAuthenticated, userName }) => {
  const location = useLocation();
  const [, forceUpdate] = useState(0);
  const [connectOpen, setConnectOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editTitleText, setEditTitleText] = useState('');
  const [showMore, setShowMore] = useState(false);

  const user = getUser();
  const guest = getGuestProfile();

  const initials = ((user?.name || guest?.name || 'G')
    .split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2));

  const refresh = () => forceUpdate(n => n + 1);
  const sessions = getAllSessions();
  const currentId = getCurrentId();

  const filteredSessions = searchQuery.trim()
    ? sessions.filter(s => s.title?.toLowerCase().includes(searchQuery.toLowerCase()))
    : sessions;

  const handleNew = () => {
    const s = createSession(); refresh(); onNewChat(s);
    if (window.innerWidth < 1024) onClose();
  };

  const handleSelect = (id) => {
    setCurrentId(id); refresh(); onSessionChange(id);
    if (window.innerWidth < 1024) onClose();
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    deleteSession(id);
    refresh();
    if (isAuthenticated) deleteChatConversation(id).catch(() => { });
    if (id === currentId) {
      const rest = getAllSessions();
      if (rest.length > 0) { setCurrentId(rest[0].id); onSessionChange(rest[0].id); }
      else { const s = createSession(); onNewChat(s); }
    }
  };

  const handleStartRename = (e, session) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditTitleText(session.title);
  };

  const handleRenameSubmit = (id) => {
    if (editTitleText.trim()) { renameSession(id, editTitleText.trim()); refresh(); }
    setEditingSessionId(null);
  };

  const handleRenameKeyDown = (e, id) => {
    if (e.key === 'Enter') handleRenameSubmit(id);
    else if (e.key === 'Escape') setEditingSessionId(null);
  };

  return (
    <>
      {isOpen && window.innerWidth < 1024 && (
        <div className="sidebar-backdrop" onClick={onClose} aria-hidden="true" />
      )}

      <aside className={`chat-sidebar ${isOpen ? 'open' : ''}`} aria-label="Chat navigation">

        {/* ── TOP: brand + collapse btn ── */}
        <div className="sidebar-top-bar">
          <div className="sidebar-brand">
            <img src="/images/logo.png" alt="tom.ai" width="22" height="22" style={{ borderRadius: '6px', objectFit: 'contain' }} />
            <span>tom.ai</span>
          </div>
          <button className="sidebar-icon-btn sidebar-collapse-btn" onClick={onClose} title="Close sidebar" aria-label="Close sidebar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
          </button>
        </div>

        {/* ── NEW CHAT button ── */}
        <button id="sidebar-new-chat" className="sidebar-new-btn" onClick={handleNew}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          New chat
        </button>

        {/* ── PRIMARY NAV ITEMS ── */}
        <nav className="sidebar-nav-list">
          <button
            className="sidebar-nav-item"
            onClick={() => setShowSearch(v => !v)}
            title="Search chats"
          >
            <span className="sidebar-nav-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <span className="sidebar-nav-label">Search chats</span>
          </button>

          {showSearch && (
            <div className="sidebar-search-box">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search your chats..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoFocus
                className="sidebar-search-input"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="sidebar-search-clear">
                  <IconClose />
                </button>
              )}
            </div>
          )}

          <Link
            to="/todos"
            className={`sidebar-nav-item${location.pathname === '/todos' ? ' active' : ''}`}
            onClick={() => { if (window.innerWidth < 1024) onClose(); }}
            title="Tasks"
          >
            <span className="sidebar-nav-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="3" /><path d="M9 12l2 2 4-4" />
              </svg>
            </span>
            <span className="sidebar-nav-label">Tasks</span>
          </Link>

          <Link
            to="/image-gen"
            className={`sidebar-nav-item${location.pathname === '/image-gen' ? ' active' : ''}`}
            onClick={() => { if (window.innerWidth < 1024) onClose(); }}
            title="Image Generator"
          >
            <span className="sidebar-nav-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
              </svg>
            </span>
            <span className="sidebar-nav-label">Image Gen</span>
          </Link>

          <button
            className="sidebar-nav-item"
            onClick={() => setConnectOpen(true)}
            title="Connect apps"
          >
            <span className="sidebar-nav-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" />
              </svg>
            </span>
            <span className="sidebar-nav-label">Apps</span>
          </button>

          {showMore && (
            <>
              <button
                className="sidebar-nav-item"
                onClick={() => setConnectOpen(true)}
                title="Connect integrations"
              >
                <span className="sidebar-nav-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                </span>
                <span className="sidebar-nav-label">Connect</span>
              </button>
            </>
          )}

          <button
            className="sidebar-nav-item sidebar-nav-more"
            onClick={() => setShowMore(v => !v)}
            title={showMore ? 'Show less' : 'More options'}
          >
            <span className="sidebar-nav-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" />
              </svg>
            </span>
            <span className="sidebar-nav-label">{showMore ? 'Less' : 'More'}</span>
          </button>
        </nav>

        <div className="sidebar-divider" />

        {/* ── RECENTS ── */}
        <div className="sidebar-section-label">Recents</div>
        <div className="sidebar-sessions" role="list">
          {filteredSessions.length === 0 ? (
            <p className="sidebar-empty">
              {searchQuery ? 'No chats found.' : 'No chats yet.\nStart a conversation!'}
            </p>
          ) : filteredSessions.map(s => (
            <div
              key={s.id}
              role="listitem"
              className={`sidebar-session ${s.id === currentId ? 'active' : ''}`}
              onClick={() => handleSelect(s.id)}
            >
              <div className="ss-info">
                {editingSessionId === s.id ? (
                  <input
                    type="text"
                    className="ss-rename-input"
                    value={editTitleText}
                    onChange={e => setEditTitleText(e.target.value)}
                    onKeyDown={e => handleRenameKeyDown(e, s.id)}
                    onBlur={() => handleRenameSubmit(s.id)}
                    autoFocus
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <div className="ss-title" onDoubleClick={(e) => handleStartRename(e, s)}>{s.title}</div>
                )}
              </div>
              {editingSessionId !== s.id && (
                <div className="ss-actions">
                  <button className="ss-rename" onClick={e => handleStartRename(e, s)} aria-label={`Rename: ${s.title}`}>
                    <IconPencil />
                  </button>
                  <button className="ss-delete" onClick={e => handleDelete(e, s.id)} aria-label={`Delete: ${s.title}`}>
                    <IconTrash />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── FOOTER: user info + settings ── */}
        <div className="sidebar-footer">
          <div className="sidebar-divider" style={{ margin: '0 0 10px' }} />

          <Link
            to="/settings"
            id="sidebar-settings"
            className={`sidebar-nav-item${location.pathname === '/settings' ? ' active' : ''}`}
            onClick={() => { if (window.innerWidth < 1024) onClose(); }}
            title="Settings"
          >
            <span className="sidebar-nav-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </span>
            <span className="sidebar-nav-label">Settings</span>
          </Link>

          {/* User row at very bottom */}
          <div className="sidebar-user-row">
            <div className="sidebar-user-avatar">
              {user?.picture ? (
                <img src={user.picture} alt={user?.name} width="32" height="32" style={{ borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.name || guest?.name || 'Guest'}</div>
              <div className="sidebar-user-plan">{isAuthenticated ? 'Free' : 'Guest mode'}</div>
            </div>
            {!isAuthenticated && (
              <Link to="/login" className="sidebar-upgrade-btn" title="Sign in">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" />
                </svg>
                Upgrade
              </Link>
            )}
          </div>
        </div>
      </aside>

      {connectOpen && <ConnectModal onClose={() => setConnectOpen(false)} />}
    </>
  );
};

export default ChatSidebar;
