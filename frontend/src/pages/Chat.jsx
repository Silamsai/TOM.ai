import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { sendChatMessage, getChatHistory } from '../services/api';
import ChatMessage from '../components/ChatMessage';
import ChatSidebar, { ConnectModal } from '../components/ChatSidebar';
import AnimatedLogo from '../components/three/AnimatedLogo';
import { IconBolt } from '../components/icons/UiIcons';
import { getToken, getUser, getGuestProfile, getTheme, setTheme as saveTheme } from '../utils/storage';
import { generateGuestResponse } from '../utils/guestAI';
import {
  getOrCreateCurrentSession, getSession,
  addMessage, updateSessionTitle, setCurrentId
} from '../utils/chatSessions';
import '../styles/pages.css';
import '../styles/sidebar.css';

/* ── Feature cards for empty state ── */
const FEATURE_CARDS = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.5 2a2.5 2.5 0 0 1 5 0c1.1 0 2 .9 2 2 1.1 0 2 .9 2 2 0 .7-.4 1.4-1 1.7V9c0 3.3-2.7 6-6 6S5.5 12.3 5.5 9V7.7C4.9 7.4 4.5 6.7 4.5 6c0-1.1.9-2 2-2 0-1.1.9-2 2-2z"/>
        <path d="M9.5 15v1a3 3 0 0 0 6 0v-1"/>
        <path d="M6 9H5a2 2 0 0 0 0 4h1"/><path d="M18 9h1a2 2 0 0 1 0 4h-1"/>
      </svg>
    ),
    title: 'Smart Answers',
    desc: 'Ask anything — science, tech, coding and more.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="3"/>
        <path d="M9 12l2 2 4-4"/>
      </svg>
    ),
    title: 'Task Manager',
    desc: 'Create tasks, set deadlines, stay organized.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
      </svg>
    ),
    title: 'AI Writing',
    desc: 'Draft emails, essays, summaries instantly.',
  },
];

const SUGGESTIONS = [
  { icon: '💡', text: 'Help me brainstorm' },
  { icon: '✍️', text: 'Write something for me' },
  { icon: '📋', text: 'Plan my tasks' },
  { icon: '😄', text: 'Tell me a joke' },
];

/* ── Main Chat component ── */
const Chat = () => {
  const token       = getToken();
  const user        = getUser();
  const guest       = getGuestProfile();
  const displayName = user?.name?.split(' ')[0] || guest?.name?.split(' ')[0] || null;

  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [sessionId,   setSessionId]   = useState(() => getOrCreateCurrentSession().id);
  const [messages,    setMessages]    = useState([]);
  const [input,       setInput]       = useState('');
  const [replyingTo,  setReplyingTo]  = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [theme,       setTheme]       = useState(getTheme);
  const [connectOpen, setConnectOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const textareaRef    = useRef(null);
  const fileInputRef   = useRef(null);

  useEffect(() => {
    if (theme === 'light') document.body.classList.add('light-mode');
    else document.body.classList.remove('light-mode');
    saveTheme(theme);
  }, [theme]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAttachments([{
        inlineData: { data: ev.target.result.split(',')[1], mimeType: file.type },
        fileName: file.name
      }]);
    };
    reader.readAsDataURL(file);
    e.target.value = null;
  };

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [input]);

  useEffect(() => {
    if (token) {
      const fetchHistory = async () => {
        try {
          const res = await getChatHistory(sessionId);
          const history = res.data.data || [];
          const mapped = history.flatMap(item => [
            { type: 'user', message: item.userMessage,    timestamp: item.timestamp, id: `u-${item.messageId}` },
            { type: 'bot',  message: item.claudeResponse, timestamp: item.timestamp, id: `b-${item.messageId}` },
          ]);
          setMessages(mapped);
        } catch { setMessages([]); }
      };
      fetchHistory();
    } else {
      const session = getSession(sessionId);
      setMessages(session?.messages || []);
    }
    setError('');
  }, [sessionId, token]);

  const sendMessage = async (text) => {
    let finalInput = text;
    if (replyingTo) {
      finalInput = `> **Replying to:** ${replyingTo.substring(0, 60).replace(/\n/g, ' ')}...\n\n${text}`;
    }
    const trimmed = finalInput.trim();
    if ((!trimmed && attachments.length === 0) || loading) return;

    const userMsg = {
      type: 'user', message: trimmed || `[Attached file: ${attachments[0]?.fileName}]`,
      timestamp: new Date().toISOString(), id: `u-${Date.now()}`,
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setReplyingTo(null);
    const sentAttachments = attachments;
    setAttachments([]);
    setError('');
    setLoading(true);

    try {
      let botText;
      if (token) {
        const res = await sendChatMessage(
          trimmed || `Please review the attached file: ${sentAttachments[0]?.fileName}`,
          sentAttachments, sessionId
        );
        const { botResponse, timestamp } = res.data.data;
        botText = botResponse;
        const botMsg = { type: 'bot', message: botText, timestamp, id: `b-${Date.now()}` };
        setMessages(prev => [...prev, botMsg]);
      } else {
        botText = await generateGuestResponse(trimmed);
        const botMsg = { type: 'bot', message: botText, timestamp: new Date().toISOString(), id: `b-${Date.now()}` };
        addMessage(sessionId, userMsg);
        addMessage(sessionId, botMsg);
        const session = getSession(sessionId);
        if (session && session.messages.length <= 2) updateSessionTitle(sessionId, trimmed);
        setMessages(prev => [...prev, botMsg]);
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to get response. Please try again.';
      setError(errMsg);
      setMessages(prev => prev.filter(m => m.id !== userMsg.id));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const handleSessionChange = (id) => {
    setSessionId(id);
    setCurrentId(id);
    const session = getSession(id);
    setMessages(session?.messages || []);
    setError('');
  };

  const handleNewChat = (session) => {
    setSessionId(session.id);
    setMessages([]);
    setError('');
    setInput('');
  };

  const showEmpty = messages.length === 0 && !loading;

  /* User avatar initials */
  const initials = ((user?.name || guest?.name || 'G')
    .split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2));

  /* ── Shared input bar ── */
  const renderInputBar = () => (
    <div className="chat-input-area-v2">
      {replyingTo && (
        <div className="reply-preview-box" style={{ background: '#1e1e2e', padding: '8px 14px', borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ fontSize: '12px', color: '#a5f3fc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            ↩ Replying to: {replyingTo.substring(0, 80).replace(/\n/g, ' ')}...
          </span>
          <button onClick={() => setReplyingTo(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '0 4px' }}>✕</button>
        </div>
      )}
      {attachments.length > 0 && (
        <div style={{ background: '#1e1e2e', padding: '8px 14px', borderRadius: replyingTo ? '0' : '12px 12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ fontSize: '12px', color: '#a5f3fc', display: 'flex', alignItems: 'center', gap: '6px' }}>
            📎 {attachments[0].fileName}
          </span>
          <button onClick={() => setAttachments([])} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '0 4px' }}>✕</button>
        </div>
      )}

      {/* Glowing input card */}
      <div className="chat-input-glow-wrap">
        <div className="chat-input-card">
          {/* Top: textarea */}
          <textarea
            id="chat-input"
            ref={textareaRef}
            className="chat-input-v2"
            placeholder="Ask anything..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={loading}
            aria-label="Chat message input"
          />
          {/* Bottom: pill buttons + send */}
          <div className="chat-input-footer">
            <input type="file" ref={fileInputRef} hidden onChange={handleFileUpload} accept="image/*,application/pdf" />
            <button
              className="chat-pill-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              title="Attach file"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
            </button>
            <button className="chat-pill-btn" title="Normal mode" disabled={loading}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              <span>Normal</span>
            </button>

            <div style={{ flex: 1 }} />

            {/* Send button */}
            <button
              id="chat-send-btn"
              className="chat-send-btn-v2"
              onClick={() => sendMessage(input)}
              disabled={loading || (!input.trim() && attachments.length === 0)}
              aria-label="Send message"
            >
              {loading ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" opacity="0.25"/>
                  <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round">
                    <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/>
                  </path>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
              )}
            </button>
          </div>
        </div>
      </div>

      <p className="chat-input-hint">
        {token ? user?.email || user?.name || '' : 'Running as guest · Sign In to sync'}
      </p>
    </div>
  );

  return (
    <div className="chat-page-v2">

      {/* ── Collapsible Sidebar ── */}
      <ChatSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSessionChange={handleSessionChange}
        onNewChat={handleNewChat}
        isAuthenticated={!!token}
        userName={displayName}
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
            <Link to="/chat" className="chat-nav-tab chat-nav-tab--active" id="nav-chat-tab">
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
            <Link to="/settings" className="chat-nav-tab" id="nav-settings-tab">
              <IconBolt size={13} />
              Settings
            </Link>
          </nav>

          {/* Right: Connect + theme + avatar */}
          <div className="chat-nav-right">
            <button
              id="chat-connect-btn"
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
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
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

            {displayName && (
              <span className="chat-nav-username">
                {token ? `Good morning, ${displayName}!` : displayName}
              </span>
            )}
          </div>
        </header>

        {/* ════ EMPTY STATE — centered ════ */}
        {showEmpty ? (
          <div className="chat-empty-v2">
            <div className="chat-empty-content">

              {/* Logo + title */}
              <AnimatedLogo size="lg" className="chat-welcome-logo" />
              <h1 className="chat-empty-title">What's on your mind today?</h1>
              <p className="chat-empty-sub">Your personal AI assistant — ask me anything</p>

              {/* Centered glowing input */}
              <div className="chat-center-input">
                {renderInputBar()}
              </div>

              {/* Quick suggestion chips */}
              <div className="chat-suggestions-v2">
                {SUGGESTIONS.map(s => (
                  <button key={s.text} className="chat-suggestion-chip-v2" onClick={() => sendMessage(s.text)}>
                    <span>{s.icon}</span> {s.text}
                  </button>
                ))}
              </div>

              {/* Feature cards */}
              <div className="chat-feature-cards">
                {FEATURE_CARDS.map(f => (
                  <div key={f.title} className="chat-feature-card">
                    <div className="cfc-icon">{f.icon}</div>
                    <div className="cfc-title">{f.title}</div>
                    <div className="cfc-desc">{f.desc}</div>
                  </div>
                ))}
              </div>

            </div>
          </div>

        ) : (
          /* ════ CHAT STATE — messages + bottom input ════ */
          <div className="chat-body-v2">
            <div className="chat-messages-v2" aria-live="polite" aria-label="Chat messages">
              {messages.map(msg => (
                <ChatMessage
                  key={msg.id}
                  type={msg.type}
                  message={msg.message}
                  timestamp={msg.timestamp}
                  userPicture={user?.picture}
                  userName={user?.name || guest?.name || 'Guest'}
                  onReply={setReplyingTo}
                />
              ))}
              {loading && (
                <div className="message-row bot">
                  <div className="message-avatar" aria-hidden="true">
                    <img src="/images/logo.png" alt="tom.ai" width="22" height="22" style={{ borderRadius: '6px', objectFit: 'contain' }} />
                  </div>
                  <div className="message-content-wrap">
                    <div className="chat-typing-indicator" aria-label="tom.ai is typing">
                      <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {error && (
              <div className="alert alert-error" role="alert" style={{ margin: '0 16px 8px' }}>
                ⚠️ {error}
              </div>
            )}

            {/* Bottom input bar */}
            <div className="chat-bottom-input">
              {renderInputBar()}
            </div>
          </div>
        )}

      </div>
      {connectOpen && <ConnectModal onClose={() => setConnectOpen(false)} />}
    </div>
  );
};

export default Chat;
