import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
import { sendChatMessage, getChatHistory } from '../services/api';
import ChatMessage from '../components/ChatMessage';
import Navbar from '../components/Navbar';
import ChatSidebar from '../components/ChatSidebar';
import AnimatedLogo from '../components/three/AnimatedLogo';
import { ASSETS, FEATURES } from '../config/assets';
import { getToken, getUser, getGuestProfile, getTheme, setTheme as saveTheme } from '../utils/storage';
import { generateGuestResponse } from '../utils/guestAI';
import {
  getOrCreateCurrentSession, getSession,
  addMessage, updateSessionTitle, setCurrentId
} from '../utils/chatSessions';
import '../styles/pages.css';
import '../styles/sidebar.css';

const Scene3D = lazy(() => import('../components/three/Scene3D'));

/** Time-based greeting */
const getTimeGreeting = (name) => {
  const h = new Date().getHours();
  const time = h >= 5 && h < 12 ? 'Good Morning' : h >= 12 && h < 17 ? 'Good Afternoon' : h >= 17 && h < 21 ? 'Good Evening' : 'Good Night';
  return name ? `${time}, ${name}! 👋` : `${time}! 👋`;
};

const Chat = () => {
  const token       = getToken();
  const user        = getUser();
  const guest       = getGuestProfile();
  const displayName = user?.name?.split(' ')[0] || guest?.name?.split(' ')[0] || null;
  const greeting    = getTimeGreeting(displayName);

  const [sidebarOpen, setSidebarOpen]   = useState(window.innerWidth >= 1024);
  const [sessionId,   setSessionId]     = useState(() => getOrCreateCurrentSession().id);
  const [messages,    setMessages]       = useState([]);
  const [input,       setInput]          = useState('');
  const [replyingTo,  setReplyingTo]     = useState(null);
  const [attachments, setAttachments]    = useState([]);
  const [loading,     setLoading]        = useState(false);
  const [error,       setError]          = useState('');

  const [theme,       setTheme]          = useState(getTheme);

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
        inlineData: {
          data: ev.target.result.split(',')[1],
          mimeType: file.type
        },
        fileName: file.name
      }]);
    };
    reader.readAsDataURL(file);
    e.target.value = null; // reset
  };

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [input]);

  // Load messages when session changes
  useEffect(() => {
    if (token) {
      const fetchHistory = async () => {
        try {
          const res = await getChatHistory();
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

  /* ── Send a message ── */
  const sendMessage = async (text) => {
    let finalInput = text;
    if (replyingTo) {
      finalInput = `> **Replying to:** ${replyingTo.substring(0, 60).replace(/\n/g, ' ')}...\n\n${text}`;
    }
    const trimmed = finalInput.trim();
    if ((!trimmed && attachments.length === 0) || loading) return;

    const userMsg = {
      type: 'user', message: trimmed || `[Attached file: ${attachments[0]?.fileName}]`,
      timestamp: new Date().toISOString(),
      id: `u-${Date.now()}`,
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setReplyingTo(null);
    const sentAttachments = attachments; // keep a copy for backend
    setAttachments([]);
    setError('');
    setLoading(true);

    try {
      let botText;

      if (token) {
        // ── Normal Gemini AI response (MCP handles emails now) ──
        const res = await sendChatMessage(trimmed || `Please review the attached file: ${sentAttachments[0]?.fileName}`, sentAttachments);
        const { botResponse, timestamp } = res.data.data;
        botText = botResponse;

        const botMsg = { type: 'bot', message: botText, timestamp, id: `b-${Date.now()}` };
        setMessages(prev => [...prev, botMsg]);
      } else {
        // ── Guest: local AI ──
        botText = await generateGuestResponse(trimmed);
        const botMsg = {
          type: 'bot', message: botText,
          timestamp: new Date().toISOString(),
          id: `b-${Date.now()}`,
        };

        addMessage(sessionId, userMsg);
        addMessage(sessionId, botMsg);

        const session = getSession(sessionId);
        if (session && session.messages.length <= 2) {
          updateSessionTitle(sessionId, trimmed);
        }

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

  return (
    <div className="chat-page">
      <Navbar onSidebarToggle={() => setSidebarOpen(v => !v)} />

      <div className="chat-layout">
        {/* ── Sidebar — shown for EVERYONE (guest + authenticated) ── */}
        <ChatSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onSessionChange={handleSessionChange}
          onNewChat={handleNewChat}
          isAuthenticated={!!token}
          userName={displayName}
        />

        {/* ── Main chat area ── */}
        <div className={`chat-main ${sidebarOpen && window.innerWidth >= 1024 ? 'sidebar-pushed' : ''}`}>
          {/* Chat header row */}
          <div className="chat-topbar">
            <button
              className="sidebar-toggle-btn"
              onClick={() => setSidebarOpen(v => !v)}
              aria-label="Toggle sidebar"
              title="Chat history"
            >
              ☰
            </button>
            <span className="chat-topbar-title">{greeting}</span>
            
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                className="chat-theme-btn"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
                style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
              >
                {theme === 'dark' ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                )}
              </button>

              <button
                className="chat-share-btn"
                onClick={() => {
                  if (navigator.share) navigator.share({ title: 'TOM.AI Chat', url: window.location.href });
                  else navigator.clipboard.writeText(window.location.href).then(() => alert('Link copied to clipboard!'));
                }}
                aria-label="Share Chat"
                title="Share Chat"
                style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="chat-messages" aria-live="polite" aria-label="Chat messages">
            {showEmpty ? (
              /* ── ChatGPT-style empty state: big logo + tom.ai + subtitle ── */
              <div className="chat-empty fade-in">
                {FEATURES.use3d && !FEATURES.prefersReducedMotion() && (
                  <Suspense fallback={null}>
                    <Scene3D
                      modelUrl={ASSETS.models.chatAmbient}
                      className="chat-empty-3d"
                      scale={0.8}
                    />
                  </Suspense>
                )}
                <div className="chat-welcome-hero">
                  <AnimatedLogo size="lg" className="chat-welcome-logo" />
                  <h2 className="chat-welcome-name">tom.ai</h2>
                  <p className="chat-welcome-sub">Your personal AI assistant — ask me anything</p>
                </div>

                {/* Quick suggestions */}
                <div className="chat-suggestions">
                  {['💡 Help me brainstorm', '📝 Write something for me', '📋 Plan my tasks', '😄 Tell me a joke'].map(s => (
                    <button key={s} className="chat-suggestion-chip" onClick={() => sendMessage(s)}>{s}</button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map(msg => (
                  <ChatMessage
                    key={msg.id}
                    type={msg.type}
                    message={msg.message}
                    timestamp={msg.timestamp}
                    userPicture={user?.picture}
                    onReply={setReplyingTo}
                  />
                ))}
                {loading && (
                  <div className="message-row bot">
                    <div className="message-avatar" aria-hidden="true">
                      <img src="/images/logo.png" alt="tom.ai" width="22" height="22" style={{borderRadius:'6px',objectFit:'contain'}} />
                    </div>
                    <div className="message-content-wrap">
                      <div className="chat-typing-indicator" aria-label="tom.ai is typing">
                        <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Error */}
          {error && (
            <div className="alert alert-error" role="alert" style={{ margin: '0 0 8px' }}>
              ⚠️ {error}
            </div>
          )}

          {/* Input bar */}
          <div className="chat-input-area">
            {replyingTo && (
              <div className="reply-preview-box" style={{ background: '#2a2a3e', padding: '8px 12px', borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333' }}>
                <span style={{ fontSize: '12px', color: '#a5f3fc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  ↩ Replying to: {replyingTo.substring(0, 80).replace(/\n/g, ' ')}...
                </span>
                <button onClick={() => setReplyingTo(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '0 4px' }}>✕</button>
              </div>
            )}
            {attachments.length > 0 && (
              <div className="attachment-preview-box" style={{ background: '#2a2a3e', padding: '8px 12px', borderRadius: replyingTo ? '0' : '12px 12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333' }}>
                <span style={{ fontSize: '12px', color: '#a5f3fc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                  {attachments[0].fileName}
                </span>
                <button onClick={() => setAttachments([])} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '0 4px' }}>✕</button>
              </div>
            )}
            <div className="chat-input-row" style={replyingTo || attachments.length > 0 ? { borderRadius: '0 0 12px 12px', borderTop: 'none' } : {}}>
              <input type="file" ref={fileInputRef} hidden onChange={handleFileUpload} accept="image/*,application/pdf" />
              <button 
                className="chat-attach-btn" 
                onClick={() => fileInputRef.current?.click()}
                style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '0 8px', display: 'flex', alignItems: 'center' }}
                title="Attach image or PDF"
                disabled={loading}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
              </button>
              <textarea
                id="chat-input"
                ref={textareaRef}
                className="chat-input"
                placeholder="Ask tom.ai anything… (Enter to send, Shift+Enter for new line)"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                disabled={loading}
                aria-label="Chat message input"
              />
              <button
                id="chat-send-btn"
                className="chat-send-btn"
                onClick={() => sendMessage(input)}
                disabled={loading || !input.trim()}
                aria-label="Send message"
              >
                {loading ? '⏳' : '➤'}
              </button>
            </div>
            <p className="chat-input-hint">
              {token
                ? user?.email || user?.name || ''
                : 'Running as guest · Sign In to sync'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
