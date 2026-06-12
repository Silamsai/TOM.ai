import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { sendChatMessage, getChatHistory, uploadRagDocument, getRagDocuments, deleteRagDocument } from '../services/api';
import ChatMessage from '../components/ChatMessage';
import ChatSidebar, { ConnectModal } from '../components/ChatSidebar';
import AnimatedLogo from '../components/three/AnimatedLogo';
import { IconBolt } from '../components/icons/UiIcons';
import { getToken, getUser, getGuestProfile, getTheme, setTheme as saveTheme } from '../utils/storage';
import { generateGuestResponse } from '../utils/guestAI';
import {
  getOrCreateCurrentSession, getSession,
  addMessage, updateSessionTitle, setCurrentId, createSession
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

const MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', shortName: 'Flash 2.5', desc: 'Fast, responsive & multimodal', color: '#38bdf8', icon: '⚡' },
  { id: 'gemini-2.5-pro',   name: 'Gemini 2.5 Pro',   shortName: 'Pro 2.5',   desc: 'Advanced reasoning & complex coding', color: '#818cf8', icon: '🧠' },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', shortName: 'Gemini 3.5', desc: 'Cutting-edge simulated speed & intelligence', color: '#a855f7', icon: '✨' },
  { id: 'gpt-4o',           name: 'GPT-4o',           shortName: 'GPT-4o',    desc: 'OpenAI flagship language & vision model', color: '#10b981', icon: '🤖' },
  { id: 'gpt-4o-mini',      name: 'GPT-4o mini',      shortName: 'GPT-4o mini', desc: 'Fast, lightweight & highly capable', color: '#34d399', icon: '🔹' },
  { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', shortName: 'Sonnet 3.5', desc: 'Anthropic state-of-the-art precision & writing', color: '#f59e0b', icon: '✍️' },
  { id: 'claude-4.8-opus',  name: 'Claude 4.8 Opus',  shortName: 'Claude Opus 4.8', desc: 'Simulated masterful deep reasoning & creativity', color: '#f97316', icon: '🎭' },
];

/* ── File type icon/class helper ── */
const getDocIcon = (fileName = '') => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return { cls: 'pdf', emoji: '📄' };
  if (ext === 'md' || ext === 'markdown') return { cls: 'md', emoji: '📝' };
  if (ext === 'txt') return { cls: 'txt', emoji: '📃' };
  return { cls: 'file', emoji: '📎' };
};

const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/* ══════════════════════════════════════════════════════════════
   Knowledge Base Panel
══════════════════════════════════════════════════════════════ */
const KnowledgeBasePanel = ({ onClose }) => {
  const [docs, setDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [uploadStatus, setUploadStatus] = useState(null); // null | { type: 'uploading'|'success'|'error', msg: string }
  const [dragOver, setDragOver] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const fileInputRef = useRef(null);

  const fetchDocs = useCallback(async () => {
    try {
      const res = await getRagDocuments();
      setDocs(res.data.data || []);
    } catch {
      setDocs([]);
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleUpload = async (file) => {
    if (!file) return;
    const allowed = ['application/pdf', 'text/plain', 'text/markdown'];
    const isText = /\.(txt|md|markdown)$/i.test(file.name);
    if (!allowed.includes(file.type) && !isText) {
      setUploadStatus({ type: 'error', msg: 'Only PDF, TXT, or Markdown files are supported.' });
      setTimeout(() => setUploadStatus(null), 4000);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadStatus({ type: 'error', msg: 'File is too large. Max size is 10 MB.' });
      setTimeout(() => setUploadStatus(null), 4000);
      return;
    }

    setUploadStatus({ type: 'uploading', msg: `Indexing "${file.name}"… this may take a moment.` });
    const formData = new FormData();
    formData.append('file', file);
    try {
      await uploadRagDocument(formData);
      setUploadStatus({ type: 'success', msg: `"${file.name}" indexed successfully!` });
      await fetchDocs();
      setTimeout(() => setUploadStatus(null), 3500);
    } catch (err) {
      const msg = err.response?.data?.message || 'Upload failed. Please try again.';
      setUploadStatus({ type: 'error', msg });
      setTimeout(() => setUploadStatus(null), 5000);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}" from your knowledge base?`)) return;
    setDeletingId(id);
    try {
      await deleteRagDocument(id);
      setDocs(prev => prev.filter(d => d._id !== id));
    } catch {
      alert('Could not delete document. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="kb-panel-overlay" onClick={onClose}>
      <div className="kb-panel" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="kb-panel-header">
          <div className="kb-panel-title">
            <div className="kb-panel-title-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
            </div>
            <div>
              <h3>Knowledge Base</h3>
              <p>{docs.length} document{docs.length !== 1 ? 's' : ''} indexed</p>
            </div>
          </div>
          <button className="kb-panel-close" onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Drop zone */}
        <div
          className={`kb-dropzone${dragOver ? ' drag-over' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !uploadStatus?.type === 'uploading' && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            hidden
            accept=".pdf,.txt,.md,.markdown"
            onChange={e => { handleUpload(e.target.files[0]); e.target.value = null; }}
          />
          <div className="kb-dropzone-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <h4>Drag & drop your document here</h4>
          <p>Or click to browse your files</p>
          <button
            className="kb-upload-btn"
            onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
            disabled={uploadStatus?.type === 'uploading'}
            type="button"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12l7-7 7 7"/>
            </svg>
            Choose File
          </button>
          <p className="kb-dropzone-formats">PDF · TXT · MD · Markdown · up to 10 MB</p>
        </div>

        {/* Upload status */}
        {uploadStatus && (
          <div className={`kb-status ${uploadStatus.type}`}>
            {uploadStatus.type === 'uploading' && <div className="kb-status-spinner" />}
            {uploadStatus.type === 'success' && <span>✓</span>}
            {uploadStatus.type === 'error'   && <span>⚠</span>}
            <span>{uploadStatus.msg}</span>
          </div>
        )}

        {/* Document list */}
        <div className="kb-docs-section">
          <div className="kb-docs-label">
            Indexed Documents
          </div>
          {loadingDocs ? (
            <div className="kb-empty" style={{ color: 'rgba(255,255,255,0.2)' }}>Loading…</div>
          ) : docs.length === 0 ? (
            <div className="kb-empty">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.25, display: 'block', margin: '0 auto 10px' }}>
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
              No documents yet. Upload a PDF, TXT, or Markdown file to get started.
            </div>
          ) : docs.map(doc => {
            const { cls, emoji } = getDocIcon(doc.fileName);
            return (
              <div key={doc._id} className="kb-doc-item">
                <div className={`kb-doc-icon ${cls}`}>{emoji}</div>
                <div className="kb-doc-info">
                  <div className="kb-doc-name" title={doc.fileName}>{doc.fileName}</div>
                  <div className="kb-doc-meta">
                    <span>{formatBytes(doc.fileSize)}</span>
                    <span className="kb-doc-chunks">
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                      {doc.chunkCount} chunks
                    </span>
                    <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <button
                  className="kb-doc-delete"
                  onClick={() => handleDelete(doc._id, doc.fileName)}
                  disabled={deletingId === doc._id}
                  title="Remove from knowledge base"
                  type="button"
                >
                  {deletingId === doc._id ? (
                    <div className="kb-status-spinner" style={{ width: 12, height: 12 }} />
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                    </svg>
                  )}
                </button>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   Main Chat Component
══════════════════════════════════════════════════════════════ */
const Chat = () => {
  const token       = getToken();
  const user        = getUser();
  const guest       = getGuestProfile();
  const displayName = user?.name?.split(' ')[0] || guest?.name?.split(' ')[0] || null;

  // Chat mode: 'standard' | 'personal'
  const [chatMode, setChatMode] = useState(() => localStorage.getItem('tom_chat_mode') || 'standard');

  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [sessionId,    setSessionId]    = useState(() => getOrCreateCurrentSession().id);
  const [messages,     setMessages]     = useState([]);
  const [input,        setInput]        = useState('');
  const [replyingTo,   setReplyingTo]   = useState(null);
  const [attachments,  setAttachments]  = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [theme,        setTheme]        = useState(getTheme);
  const [connectOpen,  setConnectOpen]  = useState(false);
  const [kbOpen,       setKbOpen]       = useState(false);

  const [selectedModel,       setSelectedModel]       = useState(() => localStorage.getItem('tom_ai_model') || 'gemini-2.5-flash');
  const [showModelDropdown,   setShowModelDropdown]   = useState(false);
  const modelDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target)) {
        setShowModelDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  /* ── Switch Chat Mode ── */
  const switchMode = (mode) => {
    setChatMode(mode);
    localStorage.setItem('tom_chat_mode', mode);
    // Create a fresh session for the chosen mode
    const s = createSession(mode);
    setSessionId(s.id);
    setMessages([]);
    setError('');
    setInput('');
  };

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
          sentAttachments, sessionId, selectedModel, chatMode
        );
        const { botResponse, timestamp } = res.data.data;
        botText = botResponse;
        const botMsg = { type: 'bot', message: botText, timestamp, id: `b-${Date.now()}` };
        setMessages(prev => [...prev, botMsg]);
      } else {
        botText = await generateGuestResponse(trimmed, selectedModel);
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
  const renderInputBar = () => {
    const currentModelObj = MODELS.find(m => m.id === selectedModel) || MODELS[0];

    return (
      <div className="chat-input-area-v2">
        {replyingTo && (
          <div className="reply-preview-box" style={{ background: '#12121a', padding: '8px 14px', borderRadius: '16px 16px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: '12px', color: '#a5f3fc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              ↩ Replying to: {replyingTo.substring(0, 80).replace(/\n/g, ' ')}...
            </span>
            <button onClick={() => setReplyingTo(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '0 4px' }}>✕</button>
          </div>
        )}
        {attachments.length > 0 && (
          <div style={{ background: '#12121a', padding: '8px 14px', borderRadius: replyingTo ? '0' : '16px 16px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: '12px', color: '#a5f3fc', display: 'flex', alignItems: 'center', gap: '6px' }}>
              📎 {attachments[0].fileName}
            </span>
            <button onClick={() => setAttachments([])} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '0 4px' }}>✕</button>
          </div>
        )}

        <div className="chat-input-glow-wrap">
          <div className="chat-input-card">
            <textarea
              id="chat-input"
              ref={textareaRef}
              className="chat-input-v2"
              placeholder={chatMode === 'personal' ? 'Ask about your documents…' : 'Ask tom'}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={loading}
              aria-label="Chat message input"
            />

            <div className="chat-input-footer">
              <input type="file" ref={fileInputRef} hidden onChange={handleFileUpload} accept="image/*,application/pdf" />

              {/* Attach (only in standard mode) */}
              {chatMode === 'standard' && (
                <button
                  className="chat-pill-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  title="Attach file"
                  type="button"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                  </svg>
                  <span>Attach</span>
                </button>
              )}

              {/* In personal mode: open KB panel pill */}
              {chatMode === 'personal' && (
                <button
                  className="chat-pill-btn"
                  onClick={() => setKbOpen(true)}
                  type="button"
                  title="Manage Knowledge Base"
                  style={{ color: '#c084fc', borderColor: 'rgba(168,85,247,0.4)', background: 'rgba(168,85,247,0.08)' }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                  </svg>
                  <span>Knowledge Base</span>
                </button>
              )}

              {/* Model selector pill */}
              <div className="chat-model-select-wrapper" ref={modelDropdownRef}>
                <button
                  className="chat-pill-btn"
                  onClick={() => setShowModelDropdown(!showModelDropdown)}
                  type="button"
                  title="Choose AI Model"
                >
                  <span className="chat-model-dot" style={{ backgroundColor: currentModelObj.color, boxShadow: `0 0 5px ${currentModelObj.color}` }} />
                  <span>{currentModelObj.shortName}</span>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: '1px', transform: showModelDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {showModelDropdown && (
                  <div className="chat-model-dropdown">
                    <div className="chat-model-dropdown-header">Select AI Model</div>
                    <div className="chat-model-dropdown-list">
                      {MODELS.map(m => (
                        <button
                          key={m.id}
                          className={`chat-model-item ${selectedModel === m.id ? 'active' : ''}`}
                          onClick={() => {
                            setSelectedModel(m.id);
                            localStorage.setItem('tom_ai_model', m.id);
                            setShowModelDropdown(false);
                          }}
                          type="button"
                        >
                          <span className="chat-model-item-emoji">{m.icon}</span>
                          <div className="chat-model-item-body">
                            <div className="chat-model-item-name">
                              {m.name}
                              {['gemini-3.5-flash', 'claude-4.8-opus'].includes(m.id) ? (
                                <span className="chat-model-sim-badge">SIMULATED</span>
                              ) : null}
                            </div>
                            <div className="chat-model-item-desc">{m.desc}</div>
                          </div>
                          {selectedModel === m.id && (
                            <span className="chat-model-item-check">✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ flex: 1 }} />

              {/* Send button */}
              <button
                id="chat-send-btn"
                className="chat-send-btn-v2"
                onClick={() => sendMessage(input)}
                disabled={loading || (!input.trim() && attachments.length === 0)}
                aria-label="Send message"
                type="button"
              >
                {loading ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" opacity="0.25"/>
                    <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round">
                      <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/>
                    </path>
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                )}
              </button>
            </div>
          </div>
        </div>

        <p className="chat-input-hint-mac">
          {chatMode === 'personal'
            ? 'Personal RAG mode — answers are grounded in your uploaded documents.'
            : 'tom.ai is an AI assistant and can make mistakes.'}
        </p>
      </div>
    );
  };

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
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <div className="chat-nav-logo">
              <img src="/images/logo.png" alt="tom.ai" width="26" height="26" style={{ borderRadius: '7px', objectFit: 'contain' }} />
              <span>tom.ai</span>
            </div>

            {/* ── Mode Toggle ── */}
            <div className="rag-mode-toggle" style={{ marginLeft: '10px' }}>
              <button
                className={`rag-mode-btn standard ${chatMode === 'standard' ? 'active' : ''}`}
                onClick={() => chatMode !== 'standard' && switchMode('standard')}
                type="button"
                title="Standard AI Chat"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                Chat
              </button>
              <button
                className={`rag-mode-btn personal ${chatMode === 'personal' ? 'active' : ''}`}
                onClick={() => chatMode !== 'personal' && switchMode('personal')}
                type="button"
                title="Personal RAG — ask questions from your documents"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                Personal
              </button>
            </div>
          </div>

          {/* Center: Chat / Tasks / Settings tabs */}
          <nav className="chat-nav-center">
            <Link to="/chat" className="chat-nav-tab chat-nav-tab--active" id="nav-chat-tab">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <span>Chat</span>
            </Link>
            <Link to="/todos" className="chat-nav-tab" id="nav-tasks-tab">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 12l2 2 4-4"/>
              </svg>
              <span>Tasks</span>
            </Link>
            <Link to="/settings" className="chat-nav-tab" id="nav-settings-tab">
              <IconBolt size={13} />
              <span>Settings</span>
            </Link>
          </nav>

          {/* Right: Connect + KB (if personal) + theme + avatar */}
          <div className="chat-nav-right">

            {chatMode === 'personal' && (
              <>
                <span className="rag-active-indicator">
                  <span className="rag-active-dot" />
                  Personal RAG
                </span>
                <button
                  className="kb-nav-btn"
                  onClick={() => setKbOpen(true)}
                  title="Open Knowledge Base Manager"
                  type="button"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                  </svg>
                  Knowledge Base
                </button>
              </>
            )}

            {chatMode === 'standard' && (
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
                <span>Connect</span>
              </button>
            )}

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

        {/* ════ EMPTY STATE ════ */}
        {showEmpty ? (
          <div className="chat-empty-v2">
            <div className="chat-empty-content">

              {chatMode === 'personal' ? (
                /* ── Personal RAG empty state ── */
                <div className="rag-personal-empty">
                  <AnimatedLogo size="lg" className="chat-welcome-logo" />
                  <div className="rag-personal-badge">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                    Personal RAG Mode
                  </div>
                  <h2>Ask from your documents</h2>
                  <p>
                    Upload PDFs, policy papers, research notes, and more — then ask questions and get answers grounded 100% in your files.
                  </p>
                  <button className="rag-open-kb-btn" onClick={() => setKbOpen(true)} type="button">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    Open Knowledge Base
                  </button>

                  {/* Input */}
                  <div className="chat-center-input" style={{ marginTop: '24px' }}>
                    {renderInputBar()}
                  </div>
                </div>
              ) : (
                /* ── Standard empty state ── */
                <>
                  <AnimatedLogo size="lg" className="chat-welcome-logo" />
                  <h1 className="chat-empty-title">What's on your mind today?</h1>
                  <p className="chat-empty-sub">Your personal AI assistant — ask me anything</p>

                  <div className="chat-center-input">
                    {renderInputBar()}
                  </div>

                  <div className="chat-suggestions-v2">
                    {SUGGESTIONS.map(s => (
                      <button key={s.text} className="chat-suggestion-chip-v2" onClick={() => sendMessage(s.text)}>
                        <span>{s.icon}</span> {s.text}
                      </button>
                    ))}
                  </div>

                  <div className="chat-feature-cards">
                    {FEATURE_CARDS.map(f => (
                      <div key={f.title} className="chat-feature-card">
                        <div className="cfc-icon">{f.icon}</div>
                        <div className="cfc-title">{f.title}</div>
                        <div className="cfc-desc">{f.desc}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}

            </div>
          </div>

        ) : (
          /* ════ CHAT STATE ════ */
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

            <div className="chat-bottom-input">
              {renderInputBar()}
            </div>
          </div>
        )}

      </div>

      {/* ── Modals ── */}
      {connectOpen && <ConnectModal onClose={() => setConnectOpen(false)} />}
      {kbOpen && <KnowledgeBasePanel onClose={() => setKbOpen(false)} />}
    </div>
  );
};

export default Chat;
