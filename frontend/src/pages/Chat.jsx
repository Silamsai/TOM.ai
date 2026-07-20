import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { sendChatMessage, getChatHistory, uploadRagDocument, getRagDocuments, deleteRagDocument } from '../services/api';
import ChatMessage from '../components/ChatMessage';
import ChatSidebar, { ConnectModal } from '../components/ChatSidebar';
import AnimatedLogo from '../components/three/AnimatedLogo';
import { IconBolt } from '../components/icons/UiIcons';
import { getToken, getUser, getGuestProfile, getTheme, setTheme as saveTheme, clearAll } from '../utils/storage';
import { generateGuestResponse } from '../utils/guestAI';
import {
  getOrCreateCurrentSession, getSession,
  addMessage, updateSessionTitle, setCurrentId, createSession
} from '../utils/chatSessions';
import {
  Plus,
  X,
  Send,
  Paperclip,
  BookOpen,
  Sparkles,
  Brain,
  FileText,
  Terminal,
  User as UserIcon,
  Smile,
  PenTool,
  CheckSquare,
  Lightbulb,
  Check,
  AlertTriangle,
  Mic,
  MicOff,
  Menu,
  Moon,
  Sun,
  LogOut,
  ChevronDown,
  Upload,
  Share2
} from 'lucide-react';
import '../styles/pages.css';
import '../styles/sidebar.css';

/* ── Feature cards for empty state ── */
const FEATURE_CARDS = [
  {
    icon: <Sparkles size={22} style={{ color: '#c084fc' }} />,
    title: 'Smart Answers',
    desc: 'Ask anything — science, tech, coding and more.',
  },
  {
    icon: <CheckSquare size={22} style={{ color: '#38bdf8' }} />,
    title: 'Task Manager',
    desc: 'Create tasks, set deadlines, stay organized.',
  },
  {
    icon: <PenTool size={22} style={{ color: '#fbbf24' }} />,
    title: 'AI Writing',
    desc: 'Draft emails, essays, summaries instantly.',
  },
];

const SUGGESTIONS = [
  { icon: 'brainstorm', text: 'Help me brainstorm' },
  { icon: 'write', text: 'Write something for me' },
  { icon: 'plan', text: 'Plan my tasks' },
  { icon: 'joke', text: 'Tell me a joke' },
];

const getSuggestionIcon = (iconName) => {
  switch (iconName) {
    case 'brainstorm': return <Lightbulb size={14} style={{ color: '#fbbf24' }} />;
    case 'write': return <PenTool size={14} style={{ color: '#f43f5e' }} />;
    case 'plan': return <CheckSquare size={14} style={{ color: '#10b981' }} />;
    case 'joke': return <Smile size={14} style={{ color: '#fbbf24' }} />;
    default: return <Lightbulb size={14} />;
  }
};

/* Fallback model if backend returns nothing */
const DEFAULT_MODELS = [
  { id: 'gemini-flash-latest', name: 'Gemini Flash Latest', shortName: 'Flash Latest', desc: 'Fast, responsive & multimodal', color: '#38bdf8', icon: 'zap' },
];

const getModelIcon = (iconName) => {
  switch (iconName) {
    case 'zap':
    case '⚡':
      return <Sparkles size={13} style={{ color: '#fbbf24', display: 'inline-block', verticalAlign: 'middle' }} />;
    case 'brain':
    case '🧠':
      return <Brain size={13} style={{ color: '#a78bfa', display: 'inline-block', verticalAlign: 'middle' }} />;
    case 'bot':
    case '🤖':
      return <Terminal size={13} style={{ color: '#38bdf8', display: 'inline-block', verticalAlign: 'middle' }} />;
    default:
      return <Sparkles size={13} style={{ display: 'inline-block', verticalAlign: 'middle' }} />;
  }
};

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const ADMIN_API = `${API_BASE_URL}/admin`;

/* ── File type icon/class helper ── */
const getDocIcon = (fileName = '') => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return { cls: 'pdf', type: 'pdf' };
  if (ext === 'md' || ext === 'markdown') return { cls: 'md', type: 'md' };
  if (ext === 'txt') return { cls: 'txt', type: 'txt' };
  return { cls: 'file', type: 'file' };
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
const KnowledgeBasePanel = ({ onClose, onUploadSuccess }) => {
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

  const handleUploads = async (files) => {
    if (!files || files.length === 0) return;
    if (files.length > 10) {
      setUploadStatus({ type: 'error', msg: 'You can upload a maximum of 10 files at a time.' });
      setTimeout(() => setUploadStatus(null), 4000);
      return;
    }

    const allowed = ['application/pdf', 'text/plain', 'text/markdown'];
    const validFiles = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isText = /\.(txt|md|markdown)$/i.test(file.name);
      if (!allowed.includes(file.type) && !isText) {
        setUploadStatus({ type: 'error', msg: `Unsupported format for "${file.name}". Only PDF, TXT, or MD are allowed.` });
        setTimeout(() => setUploadStatus(null), 4000);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setUploadStatus({ type: 'error', msg: `"${file.name}" is too large. Max size is 10 MB.` });
        setTimeout(() => setUploadStatus(null), 4000);
        return;
      }
      validFiles.push(file);
    }

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      setUploadStatus({
        type: 'uploading',
        msg: `Indexing ${i + 1} of ${validFiles.length}: "${file.name}"…`
      });
      const formData = new FormData();
      formData.append('file', file);
      try {
        await uploadRagDocument(formData);
        if (onUploadSuccess) {
          onUploadSuccess(file.name);
        }
      } catch (err) {
        const msg = err.response?.data?.message || `Failed to index "${file.name}".`;
        setUploadStatus({ type: 'error', msg });
        await fetchDocs();
        setTimeout(() => setUploadStatus(null), 5000);
        return;
      }
    }

    setUploadStatus({
      type: 'success',
      msg: `Successfully indexed ${validFiles.length} document${validFiles.length > 1 ? 's' : ''}!`
    });
    await fetchDocs();
    setTimeout(() => setUploadStatus(null), 3500);
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) handleUploads(files);
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
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
            <div>
              <h3>Knowledge Base</h3>
              <p>{docs.length} document{docs.length !== 1 ? 's' : ''} indexed</p>
            </div>
          </div>
          <button className="kb-panel-close" onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Drop zone */}
        <div
          className={`kb-dropzone${dragOver ? ' drag-over' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => uploadStatus?.type !== 'uploading' && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            accept=".pdf,.txt,.md,.markdown"
            onChange={e => { handleUploads(Array.from(e.target.files)); e.target.value = null; }}
          />
          <div className="kb-dropzone-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
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
              <path d="M12 5v14M5 12l7-7 7 7" />
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
            {uploadStatus.type === 'error' && <span>⚠</span>}
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
              <BookOpen size={40} style={{ opacity: 0.25, display: 'block', margin: '0 auto 10px', color: 'currentColor' }} />
              No documents yet. Upload a PDF, TXT, or Markdown file to get started.
            </div>
          ) : docs.map(doc => {
            const { cls, type } = getDocIcon(doc.fileName);
            return (
              <div key={doc._id} className="kb-doc-item">
                <div className={`kb-doc-icon ${cls}`}>
                  {type === 'pdf' ? <FileText size={16} /> : (type === 'md' ? <PenTool size={16} /> : (type === 'txt' ? <FileText size={16} /> : <Paperclip size={16} />))}
                </div>
                <div className="kb-doc-info">
                  <div className="kb-doc-name" title={doc.fileName}>{doc.fileName}</div>
                  <div className="kb-doc-meta">
                    <span>{formatBytes(doc.fileSize)}</span>
                    <span className="kb-doc-chunks">
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
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
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
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
  const navigate = useNavigate();
  const token = getToken();
  const user = getUser();
  const guest = getGuestProfile();
  const displayName = user?.name?.split(' ')[0] || guest?.name?.split(' ')[0] || null;

  /* ── Profile dropdown ── */
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const profileDropdownRef = useRef(null);

  // Chat mode: 'standard' | 'personal'
  const [chatMode, setChatMode] = useState(() => localStorage.getItem('tom_chat_mode') || 'standard');

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sessionId, setSessionId] = useState(() => getOrCreateCurrentSession().id);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [theme, setTheme] = useState(getTheme);
  const [connectOpen, setConnectOpen] = useState(false);
  const [kbOpen, setKbOpen] = useState(false);

  // Speech recording state
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef(null);
  const baseInputRef = useRef('');

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
    } else {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Speech recognition is not supported in this browser. Please try Chrome, Edge, or Safari.");
        return;
      }

      baseInputRef.current = input;

      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsRecording(true);
        setError('');
      };

      rec.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = 0; i < event.results.length; ++i) {
          const transcriptSegment = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcriptSegment;
          } else {
            interimTranscript += transcriptSegment;
          }
        }

        const base = baseInputRef.current;
        const speechText = (finalTranscript + interimTranscript).trim();
        setInput(base ? `${base} ${speechText}` : speechText);
      };

      rec.onerror = (e) => {
        console.error("Speech recognition error:", e.error);
        setIsRecording(false);
        if (e.error === 'not-allowed') {
          setError("Microphone access was denied. Please enable microphone permissions in your browser settings.");
        } else if (e.error === 'network') {
          setError("Speech recognition network error. Note: The Web Speech API requires an active internet connection to communicate with Google/Browser translation servers. Please check your network connection or use text input.");
        } else if (e.error !== 'no-speech') {
          setError(`Speech recognition error: ${e.error}`);
        }
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
      rec.start();
    }
  };

  /* ── Dynamic model list from admin config ── */
  const [availableModels, setAvailableModels] = useState(DEFAULT_MODELS);

  useEffect(() => {
    fetch(`${ADMIN_API}/ai-models-public`)
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data && d.data.length > 0) {
          // Flatten providers → flat model list with color from provider
          const models = d.data.flatMap(provider =>
            (provider.models || []).map(m => ({
              ...m,
              color: provider.color || '#38bdf8',
              providerName: provider.name,
            }))
          );
          if (models.length > 0) setAvailableModels(models);
        }
      })
      .catch(() => { /* keep defaults */ });
  }, []);

  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem('tom_ai_model') || 'gemini-2.5-flash';
  });
  const [showModelDropdown, setShowModelDropdown] = useState(false);
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

  /* If selected model is not in available models, switch to first available */
  useEffect(() => {
    if (availableModels.length > 0 && !availableModels.find(m => m.id === selectedModel)) {
      const fallback = availableModels[0].id;
      setSelectedModel(fallback);
      localStorage.setItem('tom_ai_model', fallback);
    }
  }, [availableModels, selectedModel]);

  /* ── Profile dropdown click-outside ── */
  useEffect(() => {
    const handleProfileClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleProfileClickOutside);
    return () => document.removeEventListener('mousedown', handleProfileClickOutside);
  }, []);

  const handleLogout = () => {
    clearAll();
    navigate('/login');
  };

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const onDocumentUploaded = (fileName) => {
    const statusMsg = {
      type: 'bot',
      message: `📄 Document **${fileName}** has been successfully uploaded and indexed in your Knowledge Base. You can now ask questions about it in **Personal** mode!`,
      timestamp: new Date().toISOString(),
      id: `b-upload-${Date.now()}-${Math.random()}`
    };
    setMessages(prev => [...prev, statusMsg]);
    addMessage(sessionId, statusMsg);
  };

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
            { type: 'user', message: item.userMessage, timestamp: item.timestamp, id: `u-${item.messageId}`, attachments: item.attachments },
            { type: 'bot', message: item.claudeResponse, timestamp: item.timestamp, id: `b-${item.messageId}` },
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
    const currentModelObj = availableModels.find(m => m.id === selectedModel) || availableModels[0] || DEFAULT_MODELS[0];

    return (
      <div className="chat-input-area-v2">
        {error && (
          <div className="alert alert-error" role="alert" style={{ margin: '0 0 10px', borderRadius: '12px', textAlign: 'left' }}>
            ⚠️ {error}
          </div>
        )}
        {replyingTo && (
          <div className="reply-preview-box" style={{ background: '#12121a', padding: '8px 14px', borderRadius: '16px 16px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: '12px', color: '#a5f3fc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '6px' }}>
              Replying to: {replyingTo.substring(0, 80).replace(/\n/g, ' ')}...
            </span>
            <button onClick={() => setReplyingTo(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '0 4px' }}>✕</button>
          </div>
        )}
        {attachments.length > 0 && (
          <div style={{ background: '#12121a', padding: '8px 14px', borderRadius: replyingTo ? '0' : '16px 16px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: '12px', color: '#a5f3fc', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Paperclip size={12} /> {attachments[0].fileName}
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
                  <Paperclip size={11} />
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
                  <BookOpen size={11} />
                  <span>Knowledge Base</span>
                </button>
              )}

              {/* Generate Image pill */}
              {chatMode !== 'personal' && (
                <button
                  className="chat-pill-btn"
                  onClick={() => {
                    setInput(prev => {
                      const prefix = "Generate an image of ";
                      if (prev.startsWith(prefix)) return prev;
                      return prefix + prev;
                    });
                    setTimeout(() => {
                      if (textareaRef.current) {
                        textareaRef.current.focus();
                      }
                    }, 50);
                  }}
                  type="button"
                  title="Generate Image with AI"
                  style={{ color: '#ec4899', borderColor: 'rgba(236,72,153,0.4)', background: 'rgba(236,72,153,0.08)', gap: '4px' }}
                >
                  <Sparkles size={11} style={{ color: '#ec4899' }} />
                  <span>Generate Image</span>
                </button>
              )}

              {/* Model selector pill */}
              {chatMode !== 'personal' && (
                <div className="chat-model-select-wrapper" ref={modelDropdownRef}>
                  <button
                    className="chat-pill-btn"
                    onClick={() => setShowModelDropdown(!showModelDropdown)}
                    type="button"
                    title="Choose AI Model"
                  >
                    <span className="chat-model-dot" style={{ backgroundColor: currentModelObj.color, boxShadow: `0 0 5px ${currentModelObj.color}` }} />
                    <span>{currentModelObj.shortName}</span>
                    <ChevronDown size={9} style={{ marginLeft: '1px', transform: showModelDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
                  </button>

                  {showModelDropdown && (
                    <div className="chat-model-dropdown">
                      <div className="chat-model-dropdown-header">Select AI Model</div>
                      <div className="chat-model-dropdown-list">
                        {availableModels.map(m => (
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
                            <span className="chat-model-item-emoji">{getModelIcon(m.icon)}</span>
                            <div className="chat-model-item-body">
                              <div className="chat-model-item-name">
                                {m.name}
                                {m.providerName ? (
                                  <span className="chat-model-sim-badge" style={{ background: 'rgba(124,108,252,0.2)', color: '#a78bfa' }}>{m.providerName}</span>
                                ) : null}
                              </div>
                              <div className="chat-model-item-desc">{m.desc}</div>
                            </div>
                            {selectedModel === m.id && (
                              <span className="chat-model-item-check"><Check size={12} /></span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div style={{ flex: 1 }} />

              {/* Speech-to-Text Voice Recording Button */}
              <button
                className={`chat-voice-btn-v2 ${isRecording ? 'recording' : ''}`}
                onClick={toggleRecording}
                disabled={loading}
                title={isRecording ? "Stop recording voice" : "Record voice"}
                aria-label={isRecording ? "Stop recording voice" : "Record voice"}
                type="button"
                style={{
                  marginRight: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isRecording ? 'rgba(239, 68, 68, 0.2)' : 'none',
                  color: isRecording ? '#ef4444' : '#888',
                  border: isRecording ? '1px solid #ef4444' : 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  padding: 0
                }}
              >
                {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
              </button>

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
                    <circle cx="12" cy="12" r="10" opacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round">
                      <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite" />
                    </path>
                  </svg>
                ) : (
                  <Send size={12} />
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
              <Menu size={18} />
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
                <Terminal size={11} />
                Chat
              </button>
              <button
                className={`rag-mode-btn personal ${chatMode === 'personal' ? 'active' : ''}`}
                onClick={() => chatMode !== 'personal' && switchMode('personal')}
                type="button"
                title="Personal RAG — ask questions from your documents"
              >
                <BookOpen size={11} />
                Personal
              </button>
            </div>
          </div>

          {/* Center: Chat / Tasks / Settings tabs */}
          <nav className="chat-nav-center">
            <Link to="/chat" className="chat-nav-tab chat-nav-tab--active" id="nav-chat-tab">
              <Terminal size={13} />
              <span>Chat</span>
            </Link>
            <Link to="/todos" className="chat-nav-tab" id="nav-tasks-tab">
              <CheckSquare size={13} />
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
                  <BookOpen size={12} />
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
                <Share2 size={13} />
                <span>Connect</span>
              </button>
            )}

            <button
              className="chat-nav-icon-btn"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* User avatar with profile dropdown */}
            <div className="chat-profile-wrapper" ref={profileDropdownRef}>
              <div className="chat-user-avatar" title={user?.name || guest?.name || 'Guest'} onClick={() => setShowProfileDropdown(v => !v)} style={{ cursor: 'pointer' }}>
                {user?.picture ? (
                  <img src={user.picture} alt={user.name} width="32" height="32" style={{ borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <span>{initials}</span>
                )}
              </div>

              {displayName && (
                <span className="chat-nav-username" onClick={() => setShowProfileDropdown(v => !v)} style={{ cursor: 'pointer' }}>
                  {token ? `Good morning, ${displayName}!` : displayName}
                </span>
              )}

              {showProfileDropdown && (
                <div className="chat-profile-dropdown">
                  <div className="chat-profile-dropdown-header">
                    <div className="chat-profile-dropdown-name">{user?.name || guest?.name || 'Guest'}</div>
                    <div className="chat-profile-dropdown-email">{user?.email || ''}</div>
                  </div>
                  <div className="chat-profile-dropdown-divider" />
                  <button className="chat-profile-dropdown-item" onClick={() => { setShowProfileDropdown(false); navigate('/settings'); }}>
                    <UserIcon size={14} />
                    Account Settings
                  </button>
                  <button className="chat-profile-dropdown-item chat-profile-dropdown-logout" onClick={handleLogout}>
                    <LogOut size={14} />
                    Logout
                  </button>
                </div>
              )}
            </div>
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
                    <BookOpen size={10} />
                    Personal RAG Mode
                  </div>
                  <h2>Ask from your documents</h2>
                  <p>
                    Upload PDFs, policy papers, research notes, and more — then ask questions and get answers grounded 100% in your files.
                  </p>
                  <button className="rag-open-kb-btn" onClick={() => setKbOpen(true)} type="button">
                    <Upload size={14} />
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
                        <span>{getSuggestionIcon(s.icon)}</span> {s.text}
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
                  attachments={msg.attachments}
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

            <div className="chat-bottom-input">
              {renderInputBar()}
            </div>
          </div>
        )}

      </div>

      {/* ── Modals ── */}
      {connectOpen && <ConnectModal onClose={() => setConnectOpen(false)} />}
      {kbOpen && <KnowledgeBasePanel onClose={() => setKbOpen(false)} onUploadSuccess={onDocumentUploaded} />}
    </div>
  );
};

export default Chat;
