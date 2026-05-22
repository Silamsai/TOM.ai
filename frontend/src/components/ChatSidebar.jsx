import React, { useState, useEffect } from 'react';
import { getAllSessions, createSession, deleteSession, setCurrentId, getCurrentId, renameSession } from '../utils/chatSessions';
import { getGoogleAuthUrl, getPublicMcps } from '../services/api';
import '../styles/sidebar.css';

const timeAgo = (ts) => {
  const diff = Date.now() - ts;
  const m = Math.floor(diff/60000), h = Math.floor(diff/3600000), d = Math.floor(diff/86400000);
  if (m<1) return 'just now'; if (m<60) return `${m}m ago`;
  if (h<24) return `${h}h ago`; if (d<7)  return `${d}d ago`;
  return new Date(ts).toLocaleDateString('en-IN',{month:'short',day:'numeric'});
};

const IconPlus  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconChat  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>;
const IconTrash = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>;
const IconClose = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconMCP   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/><circle cx="7" cy="10" r="1.5"/><circle cx="12" cy="10" r="1.5"/><circle cx="17" cy="10" r="1.5"/></svg>;
const IconEdit  = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;

/* ── Hardcoded MCP Applications List (Editable in Code Only) ── */
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

/* ── MCP Permission Modal ── */
const MCPModal = ({ onClose }) => {
  const [mcpApps, setMcpApps] = useState(MCP_APPS);
  const [connecting, setConnecting] = useState(null); // tracks which app is connecting
  const [connected,  setConnected]  = useState([]);
  const [gmailConnected, setGmailConnected] = useState(
    () => localStorage.getItem('tom_gmail_connected') === 'true'
  );

  useEffect(() => {
    getPublicMcps()
      .then(res => {
        const d = res.data;
        if (d.success && d.data && d.data.length > 0) {
          setMcpApps(d.data);
        }
      })
      .catch(() => {});
  }, []);

  const handleConnect = async (appId) => {
    if (appId === 'gmail') {
      setConnecting('gmail');
      try {
        const res = await getGoogleAuthUrl();
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
    if (!iconStr) return <span>🔌</span>;
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
            <img src="/images/logo.png" alt="tom.ai" width="22" height="22" style={{borderRadius:'6px',objectFit:'contain'}} />
            <span>Connect Apps via MCP</span>
          </div>
          <button className="mcp-close" onClick={onClose} aria-label="Close modal"><IconClose /></button>
        </div>

        <p className="mcp-desc">
          Connect your local apps to TOM.AI through the <strong>Model Context Protocol (MCP)</strong>.
          Once connected, TOM.AI can read and act on your data with your permission.
        </p>

        <div className="mcp-apps">
          {mcpApps.map(app => {
            const isGmail    = app.id === 'gmail';
            const isConn     = isGmail ? gmailConnected : connected.includes(app.id);
            const isLoading  = connecting === app.id;
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
                  onMouseEnter={(e) => { if (isConn) e.target.innerText = 'Disconnect'; }}
                  onMouseLeave={(e) => { if (isConn) e.target.innerText = '✓ Connected'; }}
                >
                  {isLoading ? '⏳' : isConn ? '✓ Connected' : isGmail ? '🔗 Connect Gmail' : 'Allow'}
                </button>
              </div>
            );
          })}
        </div>

        <p className="mcp-note">
          🔒 All connections are local. TOM.AI only accesses data you explicitly allow.
        </p>
      </div>
    </div>
  );
};

/* ── Main Sidebar ── */
const ChatSidebar = ({ isOpen, onClose, onSessionChange, onNewChat, isAuthenticated, userName }) => {
  const [, forceUpdate] = useState(0);
  const [mcpOpen, setMcpOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editTitleText, setEditTitleText] = useState('');

  const refresh = () => forceUpdate(n => n + 1);
  const sessions  = getAllSessions();
  const currentId = getCurrentId();

  const handleNew = () => {
    const s = createSession(); refresh(); onNewChat(s);
    if (window.innerWidth < 1024) onClose();
  };

  const handleSelect = (id) => {
    setCurrentId(id); refresh(); onSessionChange(id);
    if (window.innerWidth < 1024) onClose();
  };

  const handleDelete = (e, id) => {
    e.stopPropagation(); deleteSession(id); refresh();
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
    if (editTitleText.trim()) {
      renameSession(id, editTitleText.trim());
      refresh();
    }
    setEditingSessionId(null);
  };

  const handleRenameKeyDown = (e, id) => {
    if (e.key === 'Enter') {
      handleRenameSubmit(id);
    } else if (e.key === 'Escape') {
      setEditingSessionId(null);
    }
  };

  return (
    <>
      {isOpen && window.innerWidth < 1024 && (
        <div className="sidebar-backdrop" onClick={onClose} aria-hidden="true" />
      )}

      <aside className={`chat-sidebar ${isOpen ? 'open' : ''}`} aria-label="Chat history">
        {/* Brand */}
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <img src="/images/logo.png" alt="tom.ai" width="22" height="22" style={{borderRadius:'6px',objectFit:'contain'}} />
            tom.ai
          </div>
          <button className="sidebar-close-btn" onClick={onClose} aria-label="Close sidebar"><IconClose /></button>
        </div>

        {/* New Chat */}
        <button id="sidebar-new-chat" className="sidebar-new-btn" onClick={handleNew}>
          <IconPlus /> New Chat
        </button>

        <div className="sidebar-divider" />

        {/* Chat list */}
        <div className="sidebar-label">Previous Chats</div>
        <div className="sidebar-sessions" role="list">
          {sessions.length === 0 ? (
            <p className="sidebar-empty">No chats yet.<br/>Start a conversation!</p>
          ) : sessions.map(s => (
            <div key={s.id} role="listitem"
              className={`sidebar-session ${s.id===currentId?'active':''}`}
              onClick={() => handleSelect(s.id)}>
              <div className="ss-icon"><IconChat /></div>
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
                <div className="ss-meta">{timeAgo(s.updatedAt)} · {s.messages.length} msg{s.messages.length!==1?'s':''}</div>
              </div>
              {editingSessionId !== s.id && (
                <div className="ss-actions">
                  <button className="ss-rename" onClick={e => handleStartRename(e, s)} aria-label={`Rename: ${s.title}`}>
                    <IconEdit />
                  </button>
                  <button className="ss-delete" onClick={e => handleDelete(e, s.id)} aria-label={`Delete: ${s.title}`}>
                    <IconTrash />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-divider" style={{marginBottom:'10px'}} />

          {/* Connect MCP */}
          <button className="sidebar-mcp-btn" onClick={() => setMcpOpen(true)}>
            <IconMCP />
            <span>Connect MCP</span>
            <span className="mcp-badge">Apps</span>
          </button>

          <span className="sf-note">
            {isAuthenticated ? `Synced · ${userName || ''}` : 'Chats saved locally'}
          </span>
        </div>
      </aside>

      {/* MCP Modal */}
      {mcpOpen && <MCPModal onClose={() => setMcpOpen(false)} />}
    </>
  );
};

export default ChatSidebar;
