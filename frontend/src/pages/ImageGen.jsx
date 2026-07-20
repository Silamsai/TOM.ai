import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { generateImage, getImageModels } from '../services/api';
import ChatSidebar from '../components/ChatSidebar';
import { getToken, getUser, getGuestProfile, getTheme, setTheme as saveTheme, clearAll } from '../utils/storage';
import {
    getOrCreateCurrentSession, setCurrentId,
} from '../utils/chatSessions';
import {
    Sparkles, Download, Copy, Trash2, RefreshCw, Image as ImageIcon,
    ChevronDown, Moon, Sun, LogOut, Menu, Wand2, X, Check,
    ZoomIn, LayoutGrid, Layers,
} from 'lucide-react';
import '../styles/pages.css';
import '../styles/sidebar.css';

/* ── Defaults ────────────────────────────────────────────────────── */
const DEFAULT_MODELS = [
    { id: 'flux', name: 'FLUX', desc: 'Best quality', color: '#7c6cfc' },
    { id: 'flux-realism', name: 'FLUX Realism', desc: 'Photorealistic', color: '#38bdf8' },
    { id: 'turbo', name: 'Turbo', desc: 'Fast', color: '#fbbf24' },
];
const DEFAULT_STYLES = [
    { id: '', label: 'Default' },
    { id: 'photorealistic', label: 'Photorealistic' },
    { id: 'digital art', label: 'Digital Art' },
    { id: 'oil painting', label: 'Oil Painting' },
    { id: 'watercolor', label: 'Watercolor' },
    { id: 'anime', label: 'Anime' },
    { id: 'cinematic', label: 'Cinematic' },
    { id: 'concept art', label: 'Concept Art' },
    { id: 'pixel art', label: 'Pixel Art' },
    { id: 'neon cyberpunk', label: 'Cyberpunk' },
    { id: 'fantasy illustration', label: 'Fantasy' },
];
const DEFAULT_RATIOS = [
    { id: '1:1', label: 'Square', width: 1024, height: 1024, icon: '⬛' },
    { id: '16:9', label: 'Landscape', width: 1344, height: 768, icon: '▬' },
    { id: '9:16', label: 'Portrait', width: 768, height: 1344, icon: '▮' },
    { id: '4:3', label: '4:3', width: 1152, height: 864, icon: '🖥' },
];

const PROMPT_SUGGESTIONS = [
    'A futuristic city floating in the clouds at sunset, neon lights reflecting in rain puddles',
    'An ancient samurai warrior standing in a bamboo forest, mist swirling around him',
    'A cozy bookshop in autumn rain with warm golden lights glowing inside',
    'A majestic dragon soaring over snow-capped mountains at dawn',
    'An astronaut sitting on the moon reading a book, Earth visible in the background',
    'A magical underwater kingdom with bioluminescent coral and glowing fish',
];

/* ── Lightbox component ─────────────────────────────────────────── */
const Lightbox = ({ image, onClose }) => {
    useEffect(() => {
        const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [onClose]);

    const handleDownload = () => {
        const a = document.createElement('a');
        a.href = image.dataUrl;
        a.download = `tomai-image-${Date.now()}.jpg`;
        a.click();
    };

    return (
        <div className="img-lightbox-overlay" onClick={onClose}>
            <div className="img-lightbox-inner" onClick={e => e.stopPropagation()}>
                <img src={image.dataUrl} alt={image.prompt} className="img-lightbox-img" />
                <div className="img-lightbox-bar">
                    <div className="img-lightbox-prompt">{image.prompt}</div>
                    <div className="img-lightbox-actions">
                        <button className="img-lb-btn" onClick={handleDownload} title="Download">
                            <Download size={16} />
                        </button>
                        <button className="img-lb-btn" onClick={onClose} title="Close">
                            <X size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ── Main Component ─────────────────────────────────────────────── */
const ImageGen = () => {
    const navigate = useNavigate();
    const token = getToken();
    const user = getUser();
    const guest = getGuestProfile();

    /* sidebar */
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sessionId, setSessionId] = useState(() => getOrCreateCurrentSession().id);
    const [theme, setTheme] = useState(getTheme);
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const profileDropdownRef = useRef(null);

    /* image gen state */
    const [prompt, setPrompt] = useState('');
    const [selectedModel, setSelectedModel] = useState('flux');
    const [selectedStyle, setSelectedStyle] = useState('');
    const [selectedRatio, setSelectedRatio] = useState(DEFAULT_RATIOS[0]);
    const [enhancePrompt, setEnhancePrompt] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');
    const [gallery, setGallery] = useState([]);    // [{dataUrl, prompt, model, style, ratio, timestamp}]
    const [lightbox, setLightbox] = useState(null);
    const [copied, setCopied] = useState(null);

    /* config from backend */
    const [models, setModels] = useState(DEFAULT_MODELS);
    const [styles, setStyles] = useState(DEFAULT_STYLES);
    const [ratios, setRatios] = useState(DEFAULT_RATIOS);

    /* dropdown visibility */
    const [showModelDrop, setShowModelDrop] = useState(false);
    const [showStyleDrop, setShowStyleDrop] = useState(false);
    const [showRatioDrop, setShowRatioDrop] = useState(false);
    const modelDropRef = useRef(null);
    const styleDropRef = useRef(null);
    const ratioDropRef = useRef(null);

    const initials = ((user?.name || guest?.name || 'G')
        .split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2));

    /* ── Load config ── */
    useEffect(() => {
        getImageModels().then(res => {
            if (res.data?.data) {
                const d = res.data.data;
                if (d.models?.length) setModels(d.models);
                if (d.styles?.length) setStyles(d.styles);
                if (d.aspectRatios?.length) setRatios(d.aspectRatios);
            }
        }).catch(() => { });
    }, []);

    /* ── Theme ── */
    useEffect(() => {
        if (theme === 'light') document.body.classList.add('light-mode');
        else document.body.classList.remove('light-mode');
        saveTheme(theme);
    }, [theme]);

    /* ── Click outside dropdowns ── */
    useEffect(() => {
        const handler = (e) => {
            if (modelDropRef.current && !modelDropRef.current.contains(e.target)) setShowModelDrop(false);
            if (styleDropRef.current && !styleDropRef.current.contains(e.target)) setShowStyleDrop(false);
            if (ratioDropRef.current && !ratioDropRef.current.contains(e.target)) setShowRatioDrop(false);
            if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) setShowProfileDropdown(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    /* ── Direct session handler for sidebar ── */
    const handleSessionChange = (id) => {
        setSessionId(id);
        setCurrentId(id);
    };
    const handleNewChat = (session) => {
        setSessionId(session.id);
        navigate('/chat');
    };
    const handleLogout = () => { clearAll(); navigate('/login'); };

    /* ── Generate ── */
    const handleGenerate = useCallback(async () => {
        if (!prompt.trim() || generating) return;
        if (!token) {
            setError('Please sign in to generate images.');
            return;
        }
        setGenerating(true);
        setError('');

        const ratio = selectedRatio;
        try {
            const res = await generateImage({
                prompt: prompt.trim(),
                model: selectedModel,
                style: selectedStyle,
                width: ratio.width,
                height: ratio.height,
                enhance: enhancePrompt,
            });

            /* Build a data URL from the arraybuffer */
            const contentType = res.headers?.['content-type'] || 'image/jpeg';
            const bytes = new Uint8Array(res.data);
            let binary = '';
            for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
            const dataUrl = `data:${contentType};base64,${btoa(binary)}`;

            /* Recover enhanced prompt from header if available */
            const enhancedHeader = res.headers?.['x-enhanced-prompt'];
            let displayPrompt = prompt.trim();
            if (enhancedHeader) {
                try { displayPrompt = atob(enhancedHeader); } catch (_) { }
            }

            const newImage = {
                id: `img-${Date.now()}-${Math.random()}`,
                dataUrl,
                prompt: displayPrompt,
                originalPrompt: prompt.trim(),
                model: selectedModel,
                style: selectedStyle,
                ratio: ratio.id,
                timestamp: new Date().toISOString(),
            };

            setGallery(prev => [newImage, ...prev]);
        } catch (err) {
            const msg = err.response?.data?.message || 'Image generation failed. Please try again.';
            setError(msg);
        } finally {
            setGenerating(false);
        }
    }, [prompt, generating, token, selectedModel, selectedStyle, selectedRatio, enhancePrompt]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); }
    };

    const handleSuggestion = (s) => setPrompt(s);

    const handleCopyPrompt = (img) => {
        navigator.clipboard.writeText(img.originalPrompt || img.prompt).then(() => {
            setCopied(img.id);
            setTimeout(() => setCopied(null), 1800);
        });
    };

    const handleDeleteImage = (id) => {
        setGallery(prev => prev.filter(img => img.id !== id));
    };

    const handleDownload = (img) => {
        const a = document.createElement('a');
        a.href = img.dataUrl;
        a.download = `tomai-image-${Date.now()}.jpg`;
        a.click();
    };

    const handleReuse = (img) => {
        setPrompt(img.originalPrompt || img.prompt);
        setSelectedModel(img.model);
        setSelectedStyle(img.style || '');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const currentModel = models.find(m => m.id === selectedModel) || models[0];
    const currentStyle = styles.find(s => s.id === selectedStyle) || styles[0];
    const showEmpty = gallery.length === 0 && !generating;

    return (
        <div className="chat-page-v2">
            {/* ── Sidebar ── */}
            <ChatSidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                onSessionChange={handleSessionChange}
                onNewChat={handleNewChat}
                isAuthenticated={!!token}
                userName={user?.name || guest?.name}
            />

            {/* ── Main ── */}
            <div className="chat-main-v2">

                {/* ── Header ── */}
                <header style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '10px', padding: '0 20px', height: '56px', flexShrink: 0, background: 'rgba(8,8,12,0.92)', backdropFilter: 'blur(16px)' }}>
                    <button
                        className="sidebar-icon-btn"
                        onClick={() => setSidebarOpen(v => !v)}
                        title="Toggle sidebar"
                        aria-label="Toggle sidebar"
                    >
                        <Menu size={18} />
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '8px', background: 'linear-gradient(135deg,#7c6cfc,#f472b6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Wand2 size={14} color="#fff" />
                        </div>
                        <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--white, #fff)', letterSpacing: '-0.01em' }}>Image Generator</span>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', padding: '2px 7px', marginLeft: 4 }}>AI-Powered</span>
                    </div>

                    {/* Theme toggle */}
                    <button
                        className="sidebar-icon-btn"
                        onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
                        title="Toggle theme"
                    >
                        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                    </button>

                    {/* Profile */}
                    <div ref={profileDropdownRef} style={{ position: 'relative' }}>
                        <button
                            className="chat-header-avatar"
                            onClick={() => setShowProfileDropdown(v => !v)}
                            aria-label="Profile menu"
                            style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#7c6cfc,#38bdf8)', border: 'none', cursor: 'pointer', color: '#fff', fontWeight: 700, fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            {user?.picture
                                ? <img src={user.picture} alt={user.name} width={32} height={32} style={{ borderRadius: '50%', objectFit: 'cover' }} />
                                : initials}
                        </button>
                        {showProfileDropdown && (
                            <div className="profile-dropdown" style={{ position: 'absolute', right: 0, top: '40px', background: '#12121e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '6px', minWidth: '170px', zIndex: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                                <Link to="/settings" className="profile-menu-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 12px', borderRadius: '9px', color: 'var(--text-dim, rgba(255,255,255,0.6))', textDecoration: 'none', fontSize: '13px', fontWeight: 500 }}>
                                    <Layers size={14} /> Settings
                                </Link>
                                <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 12px', borderRadius: '9px', color: '#f472b6', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 500, width: '100%', textAlign: 'left' }}>
                                    <LogOut size={14} /> Sign out
                                </button>
                            </div>
                        )}
                    </div>
                </header>

                {/* ── Scrollable body ── */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '28px 20px 40px', minHeight: 0 }}>
                    <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>

                        {/* ── Prompt card ── */}
                        <div className="img-prompt-card">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                                <Wand2 size={16} style={{ color: '#c084fc' }} />
                                <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Describe your image</h2>
                            </div>

                            <div className="img-textarea-wrap">
                                <textarea
                                    id="image-prompt-input"
                                    className="img-prompt-textarea"
                                    placeholder="A mystical forest at twilight with glowing mushrooms and fireflies, ethereal lighting, ultra-detailed, photorealistic…"
                                    value={prompt}
                                    onChange={e => setPrompt(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    rows={3}
                                    disabled={generating}
                                />
                                {prompt && (
                                    <button
                                        className="img-clear-btn"
                                        onClick={() => setPrompt('')}
                                        title="Clear"
                                        type="button"
                                    >
                                        <X size={13} />
                                    </button>
                                )}
                            </div>

                            {/* Suggestions */}
                            <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {PROMPT_SUGGESTIONS.slice(0, 4).map((s, i) => (
                                    <button
                                        key={i}
                                        className="img-suggestion-pill"
                                        onClick={() => handleSuggestion(s)}
                                        type="button"
                                    >
                                        {s.length > 50 ? s.substring(0, 50) + '…' : s}
                                    </button>
                                ))}
                            </div>

                            {/* Controls row */}
                            <div className="img-controls-row">
                                {/* Model */}
                                <div ref={modelDropRef} className="img-dropdown-wrap">
                                    <button
                                        className="img-control-pill"
                                        onClick={() => { setShowModelDrop(v => !v); setShowStyleDrop(false); setShowRatioDrop(false); }}
                                        type="button"
                                    >
                                        <span className="img-model-dot" style={{ background: currentModel?.color || '#7c6cfc', boxShadow: `0 0 6px ${currentModel?.color || '#7c6cfc'}` }} />
                                        <span>{currentModel?.name || 'FLUX'}</span>
                                        <ChevronDown size={10} style={{ transform: showModelDrop ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                                    </button>
                                    {showModelDrop && (
                                        <div className="img-dropdown">
                                            <div className="img-dropdown-header">AI Model</div>
                                            {models.map(m => (
                                                <button
                                                    key={m.id}
                                                    className={`img-dropdown-item ${selectedModel === m.id ? 'active' : ''}`}
                                                    onClick={() => { setSelectedModel(m.id); setShowModelDrop(false); }}
                                                    type="button"
                                                >
                                                    <span className="img-model-dot" style={{ background: m.color, boxShadow: `0 0 5px ${m.color}` }} />
                                                    <div>
                                                        <div style={{ fontSize: '13px', fontWeight: 600 }}>{m.name}</div>
                                                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{m.desc}</div>
                                                    </div>
                                                    {selectedModel === m.id && <Check size={12} style={{ marginLeft: 'auto', color: '#7c6cfc' }} />}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Style */}
                                <div ref={styleDropRef} className="img-dropdown-wrap">
                                    <button
                                        className="img-control-pill"
                                        onClick={() => { setShowStyleDrop(v => !v); setShowModelDrop(false); setShowRatioDrop(false); }}
                                        type="button"
                                    >
                                        <Sparkles size={11} />
                                        <span>{currentStyle?.label || 'Default'}</span>
                                        <ChevronDown size={10} style={{ transform: showStyleDrop ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                                    </button>
                                    {showStyleDrop && (
                                        <div className="img-dropdown" style={{ maxHeight: '220px', overflowY: 'auto' }}>
                                            <div className="img-dropdown-header">Style</div>
                                            {styles.map(s => (
                                                <button
                                                    key={s.id}
                                                    className={`img-dropdown-item ${selectedStyle === s.id ? 'active' : ''}`}
                                                    onClick={() => { setSelectedStyle(s.id); setShowStyleDrop(false); }}
                                                    type="button"
                                                >
                                                    <span>{s.label}</span>
                                                    {selectedStyle === s.id && <Check size={12} style={{ marginLeft: 'auto', color: '#7c6cfc' }} />}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Aspect ratio */}
                                <div ref={ratioDropRef} className="img-dropdown-wrap">
                                    <button
                                        className="img-control-pill"
                                        onClick={() => { setShowRatioDrop(v => !v); setShowModelDrop(false); setShowStyleDrop(false); }}
                                        type="button"
                                    >
                                        <LayoutGrid size={11} />
                                        <span>{selectedRatio.label}</span>
                                        <ChevronDown size={10} style={{ transform: showRatioDrop ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                                    </button>
                                    {showRatioDrop && (
                                        <div className="img-dropdown">
                                            <div className="img-dropdown-header">Aspect Ratio</div>
                                            {ratios.map(r => (
                                                <button
                                                    key={r.id}
                                                    className={`img-dropdown-item ${selectedRatio.id === r.id ? 'active' : ''}`}
                                                    onClick={() => { setSelectedRatio(r); setShowRatioDrop(false); }}
                                                    type="button"
                                                >
                                                    <span style={{ fontSize: '15px' }}>{r.icon}</span>
                                                    <div>
                                                        <div style={{ fontSize: '13px', fontWeight: 600 }}>{r.label}</div>
                                                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{r.width}×{r.height}</div>
                                                    </div>
                                                    {selectedRatio.id === r.id && <Check size={12} style={{ marginLeft: 'auto', color: '#7c6cfc' }} />}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Enhance toggle */}
                                <label className="img-toggle-label" title="Use AI to enhance your prompt for better results">
                                    <div
                                        className={`img-toggle ${enhancePrompt ? 'on' : ''}`}
                                        onClick={() => setEnhancePrompt(v => !v)}
                                        role="switch"
                                        aria-checked={enhancePrompt}
                                    />
                                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', userSelect: 'none' }}>
                                        <Sparkles size={10} style={{ display: 'inline', marginRight: '3px', verticalAlign: 'middle', color: '#c084fc' }} />
                                        Enhance
                                    </span>
                                </label>

                                <div style={{ flex: 1 }} />

                                {/* Generate button */}
                                <button
                                    id="generate-image-btn"
                                    className={`img-generate-btn ${generating ? 'loading' : ''}`}
                                    onClick={handleGenerate}
                                    disabled={generating || !prompt.trim()}
                                    type="button"
                                >
                                    {generating ? (
                                        <>
                                            <div className="img-spinner" />
                                            <span>Generating…</span>
                                        </>
                                    ) : (
                                        <>
                                            <Wand2 size={14} />
                                            <span>Generate</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            {error && (
                                <div className="img-error-bar">
                                    ⚠️ {error}
                                </div>
                            )}
                        </div>

                        {/* ── Loading shimmer ── */}
                        {generating && (
                            <div className="img-generating-card">
                                <div className="img-shimmer-box" style={{ aspectRatio: `${selectedRatio.width} / ${selectedRatio.height}` }}>
                                    <div className="img-shimmer-inner" />
                                    <div className="img-shimmer-text">
                                        <Wand2 size={22} style={{ color: '#c084fc', opacity: 0.8 }} />
                                        <span>Crafting your vision…</span>
                                        <span style={{ fontSize: '12px', opacity: 0.5 }}>This may take up to 30 seconds</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Gallery ── */}
                        {gallery.length > 0 && (
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <ImageIcon size={16} style={{ color: 'rgba(255,255,255,0.4)' }} />
                                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>
                                            Generated Images ({gallery.length})
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setGallery([])}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                        title="Clear all"
                                    >
                                        <Trash2 size={12} /> Clear all
                                    </button>
                                </div>
                                <div className="img-gallery-grid">
                                    {gallery.map(img => (
                                        <div key={img.id} className="img-gallery-item">
                                            <div className="img-gallery-thumb-wrap" onClick={() => setLightbox(img)}>
                                                <img
                                                    src={img.dataUrl}
                                                    alt={img.prompt}
                                                    className="img-gallery-thumb"
                                                    loading="lazy"
                                                />
                                                <div className="img-gallery-overlay">
                                                    <ZoomIn size={22} color="#fff" />
                                                </div>
                                            </div>
                                            <div className="img-gallery-meta">
                                                <div className="img-gallery-prompt-text" title={img.originalPrompt || img.prompt}>
                                                    {(img.originalPrompt || img.prompt).length > 70
                                                        ? (img.originalPrompt || img.prompt).substring(0, 70) + '…'
                                                        : (img.originalPrompt || img.prompt)}
                                                </div>
                                                <div className="img-gallery-badges">
                                                    {img.model && (
                                                        <span className="img-badge img-badge-model">{img.model}</span>
                                                    )}
                                                    {img.style && (
                                                        <span className="img-badge">{img.style}</span>
                                                    )}
                                                    <span className="img-badge">{img.ratio}</span>
                                                </div>
                                                <div className="img-gallery-actions">
                                                    <button
                                                        className="img-action-btn"
                                                        onClick={() => handleDownload(img)}
                                                        title="Download"
                                                    >
                                                        <Download size={13} />
                                                    </button>
                                                    <button
                                                        className="img-action-btn"
                                                        onClick={() => handleCopyPrompt(img)}
                                                        title="Copy prompt"
                                                    >
                                                        {copied === img.id
                                                            ? <Check size={13} style={{ color: '#34d399' }} />
                                                            : <Copy size={13} />}
                                                    </button>
                                                    <button
                                                        className="img-action-btn"
                                                        onClick={() => handleReuse(img)}
                                                        title="Reuse prompt"
                                                    >
                                                        <RefreshCw size={13} />
                                                    </button>
                                                    <button
                                                        className="img-action-btn img-action-delete"
                                                        onClick={() => handleDeleteImage(img.id)}
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ── Empty state ── */}
                        {showEmpty && (
                            <div className="img-empty-state">
                                <div className="img-empty-icon">
                                    <Wand2 size={32} style={{ color: '#c084fc' }} />
                                </div>
                                <h3>Create AI Images</h3>
                                <p>Type a description above and hit <strong>Generate</strong> to bring your imagination to life.</p>
                                <div className="img-empty-features">
                                    <div className="img-empty-feature">
                                        <Sparkles size={14} style={{ color: '#7c6cfc' }} />
                                        Smart prompt enhancement
                                    </div>
                                    <div className="img-empty-feature">
                                        <LayoutGrid size={14} style={{ color: '#38bdf8' }} />
                                        Multiple aspect ratios
                                    </div>
                                    <div className="img-empty-feature">
                                        <ImageIcon size={14} style={{ color: '#f472b6' }} />
                                        Multiple art styles
                                    </div>
                                </div>
                                {!token && (
                                    <div style={{ marginTop: '20px' }}>
                                        <Link to="/login" className="img-signin-btn">
                                            Sign in to generate images
                                        </Link>
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                </div>
            </div>

            {/* ── Lightbox ── */}
            {lightbox && <Lightbox image={lightbox} onClose={() => setLightbox(null)} />}
        </div>
    );
};

export default ImageGen;
