import React, { useState, useEffect, useRef } from 'react';
import {
  Plug,
  Settings,
  HelpCircle,
  Terminal,
  Database,
  Key,
  Lock,
  User as UserIcon,
  LogOut,
  Sparkles,
  Brain,
  Info,
  Plus,
  Trash2,
  Edit,
  LayoutDashboard,
  CheckCircle,
  AlertTriangle,
  Cpu,
  X,
  BookOpen
} from 'lucide-react';
import '../styles/admin.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const API = `${API_BASE_URL}/admin`;
const getToken = () => localStorage.getItem('tom_admin_token');
const authHdr = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

const renderIcon = (icon) => {
  if (!icon) return <Plug size={14} />;
  if (typeof icon !== 'string') return icon;
  const t = icon.trim();
  if (t === '🔌') return <Plug size={14} />;
  if (t.startsWith('<svg')) return <span className="mcp-svg-wrapper" dangerouslySetInnerHTML={{ __html: t }} />;
  if (t.startsWith('data:') || t.startsWith('http') || t.startsWith('/')) return <img src={t} alt="" />;
  return <span>{t}</span>;
};

const Toast = ({ msg, type, onDone }) => {
  useEffect(() => { const id = setTimeout(onDone, 3000); return () => clearTimeout(id); }, [onDone]);
  return <div className={`adm-toast ${type}`}>{msg}</div>;
};

/* ── Login ══════════════════════════════════════════════════════════ */
function LoginScreen({ onLogin }) {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
      document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    const uClean = u.trim();
    const pClean = p.trim();
    try {
      const r = await fetch(`${API}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: uClean, password: pClean }) });
      const d = await r.json();
      if (d.success) { localStorage.setItem('tom_admin_token', d.token); onLogin(); }
      else setErr(d.message || 'Login failed');
    } catch { setErr('Cannot reach backend. Is it running?'); }
    setBusy(false);
  };

  return (
    <div className="adm-login-wrap">
      <div className="adm-glow" />
      <div className="adm-login-card">
        <div className="adm-login-logo"><img src="/images/logo.png" alt="tom.ai" /></div>
        <div className="adm-login-title">Admin Panel</div>
        <div className="adm-login-sub">Sign in with your admin credentials</div>
        <form onSubmit={submit}>
          <div className="adm-field"><label className="adm-label">Username</label><input className="adm-input" value={u} onChange={e => setU(e.target.value)} placeholder="admin@tomai.com" required /></div>
          <div className="adm-field"><label className="adm-label">Password</label><input className="adm-input" type="password" value={p} onChange={e => setP(e.target.value)} placeholder="••••••••" required /></div>
          {err && <div className="adm-error">{err}</div>}
          <button className="adm-btn adm-btn-primary adm-btn-full" style={{ marginTop: 18 }} disabled={busy}>{busy ? 'Signing in…' : 'Sign In'}</button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'var(--adm-dim)' }}>Default: admin@tomai.com / Admin@123</div>
      </div>
    </div>
  );
}

/* ══ MCP Tab ═════════════════════════════════════════════════════════ */
function MCPsTab({ toast }) {
  const [mcps, setMcps] = useState([]);
  const [modal, setModal] = useState(null); // null | 'add' | {mcp obj}
  const [form, setForm] = useState({ name: '', desc: '', icon: '', apiKey: '', connectionString: '' });
  const [busy, setBusy] = useState(false);
  const fileRef = useRef();

  const load = () => fetch(`${API}/mcps`, { headers: authHdr() }).then(r => r.json()).then(d => { if (d.success) setMcps(d.data); });
  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm({ name: '', desc: '', icon: '', apiKey: '', connectionString: '' }); setModal('add'); };
  const openEdit = (m) => { setForm({ name: m.name, desc: m.desc, icon: m.icon, apiKey: m.apiKey, connectionString: m.connectionString }); setModal(m); };

  const handleFile = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => setForm(p => ({ ...p, icon: ev.target.result }));
    r.readAsDataURL(f);
  };

  const save = async () => {
    setBusy(true);
    try {
      if (modal === 'add') {
        await fetch(`${API}/mcps`, { method: 'POST', headers: authHdr(), body: JSON.stringify(form) });
        toast('MCP added', 'success');
      } else {
        await fetch(`${API}/mcps/${modal.id}`, { method: 'PUT', headers: authHdr(), body: JSON.stringify(form) });
        toast('MCP updated', 'success');
      }
      await load(); setModal(null);
    } catch { toast('Save failed', 'error'); }
    setBusy(false);
  };

  const del = async (id) => {
    if (!window.confirm('Delete this MCP?')) return;
    await fetch(`${API}/mcps/${id}`, { method: 'DELETE', headers: authHdr() });
    toast('MCP removed', 'success'); load();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div><div className="adm-section-title">MCP Integrations</div><div className="adm-section-sub">Manage connected applications and their API credentials</div></div>
        <button className="adm-btn adm-btn-primary" onClick={openAdd} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={14} /> Add MCP
        </button>
      </div>
      <div className="adm-mcp-grid">
        {mcps.map(m => (
          <div className="adm-mcp-card" key={m.id}>
            <div className="adm-mcp-icon-wrap">{renderIcon(m.icon)}</div>
            <div className="adm-mcp-info">
              <div className="adm-mcp-name">{m.name}</div>
              <div className="adm-mcp-desc">{m.desc || 'No description'}</div>
              {m.connectionString && <div className="adm-mcp-conn">{m.connectionString}</div>}
              <div className="adm-mcp-actions">
                <button className="adm-btn adm-btn-secondary adm-btn-sm" onClick={() => openEdit(m)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Edit size={12} /> Edit
                </button>
                <button className="adm-btn adm-btn-danger adm-btn-sm" onClick={() => del(m.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div className="adm-overlay" onClick={() => setModal(null)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-header">
              <div className="adm-modal-title">{modal === 'add' ? 'Add New MCP' : 'Edit MCP'}</div>
              <button className="adm-btn adm-btn-secondary adm-btn-sm" onClick={() => setModal(null)} style={{ display: 'inline-flex', alignItems: 'center' }}>
                <X size={14} />
              </button>
            </div>
            <div className="adm-modal-body">
              <div className="adm-logo-upload">
                <div className="adm-logo-preview">{form.icon ? renderIcon(form.icon) : <Plug size={20} />}</div>
                <div>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
                  <button className="adm-btn adm-btn-secondary adm-btn-sm" onClick={() => fileRef.current.click()}>Upload Logo</button>
                  <div className="adm-upload-hint">Or paste SVG / URL below</div>
                </div>
              </div>
              <div className="adm-field"><label className="adm-label">Icon (SVG / URL)</label><input className="adm-input" value={form.icon} onChange={e => setForm(p => ({ ...p, icon: e.target.value }))} placeholder="<svg>... or https://... or Plug icon" /></div>
              <div className="adm-field"><label className="adm-label">Name *</label><input className="adm-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Gmail" /></div>
              <div className="adm-field"><label className="adm-label">Description</label><input className="adm-input" value={form.desc} onChange={e => setForm(p => ({ ...p, desc: e.target.value }))} placeholder="Read emails & draft replies" /></div>
              <div className="adm-field"><label className="adm-label">API / Connection String</label><input className="adm-input" value={form.connectionString} onChange={e => setForm(p => ({ ...p, connectionString: e.target.value }))} placeholder="https://api.example.com" /></div>
              <div className="adm-field"><label className="adm-label">API Key</label><input className="adm-input" type="password" value={form.apiKey} onChange={e => setForm(p => ({ ...p, apiKey: e.target.value }))} placeholder="Enter API key…" /></div>
              <div className="adm-modal-actions">
                <button className="adm-btn adm-btn-secondary" onClick={() => setModal(null)}>Cancel</button>
                <button className="adm-btn adm-btn-primary" onClick={save} disabled={busy || !form.name}>{busy ? 'Saving…' : 'Save'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══ AI Tab (Read-Only Status View) ═════════════════════════════════ */
function AITab({ toast }) {
  const [ai, setAi] = useState({ provider: 'gemini', model: '', allProviders: [] });
  const [selectedProvId, setSelectedProvId] = useState('gemini');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [iconInput, setIconInput] = useState('');
  const [busy, setBusy] = useState(false);

  const loadAi = () => {
    fetch(`${API}/ai`, { headers: authHdr() })
      .then(r => r.json())
      .then(d => { if (d.success) setAi(d.data); });
  };

  useEffect(() => {
    loadAi();
  }, []);

  const activeProvider = (ai.allProviders || []).find(p => p.id === ai.provider);
  const selectedProvider = (ai.allProviders || []).find(p => p.id === selectedProvId) || (ai.allProviders || []).find(p => p.id === 'gemini');

  // get configured key for current selected provider
  const isKeyLinked = ai.apiKeys && !!ai.apiKeys[selectedProvId];
  const maskedKey = ai.apiKeys ? ai.apiKeys[selectedProvId] : '';

  useEffect(() => {
    if (selectedProvider) {
      setIconInput(selectedProvider.icon || '');
    }
  }, [selectedProvId, ai.allProviders]);

  const getProviderIcon = (idOrProv, size = 16) => {
    const prov = typeof idOrProv === 'string'
      ? (ai.allProviders || []).find(p => p.id === idOrProv)
      : idOrProv;

    if (prov && prov.icon) {
      const t = String(prov.icon).trim();
      if (t.startsWith('<svg')) {
        return <span className="mcp-svg-wrapper" style={{ width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} dangerouslySetInnerHTML={{ __html: t }} />;
      }
      if (t.startsWith('data:') || t.startsWith('http') || t.startsWith('/')) {
        return <img src={t} alt="" style={{ width: size, height: size, objectFit: 'contain' }} />;
      }
      return <span style={{ fontSize: `${size}px`, lineHeight: 1 }}>{t}</span>;
    }

    const id = prov?.id || idOrProv;
    switch (id) {
      case 'gemini': return <Sparkles size={size} />;
      case 'openai': return <Brain size={size} />;
      case 'anthropic': return <Cpu size={size} />;
      default: return <Brain size={size} />;
    }
  };

  const providerColors = {
    gemini: 'linear-gradient(135deg, #4285f4 0%, #34a853 100%)',
    openai: 'linear-gradient(135deg, #10a37f 0%, #1a7f64 100%)',
    anthropic: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
  };

  const handleLinkKey = async () => {
    if (!apiKeyInput.trim()) {
      toast('Please enter a valid API key', 'error');
      return;
    }
    setBusy(true);
    try {
      const defaultModel = selectedProvider?.models?.[0]?.id || '';
      const res = await fetch(`${API}/ai/keys`, {
        method: 'POST',
        headers: authHdr(),
        body: JSON.stringify({
          providerId: selectedProvId,
          apiKey: apiKeyInput.trim(),
          model: ai.provider === selectedProvId ? ai.model : defaultModel
        })
      });
      const data = await res.json();
      if (data.success) {
        setAi(data.data);
        setApiKeyInput('');
        toast(`${selectedProvider?.name || selectedProvId} API key linked successfully!`, 'success');
      } else {
        toast(data.message || 'Failed to link API key', 'error');
      }
    } catch (err) {
      toast('Network error linking API key', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveKey = async () => {
    if (!window.confirm(`Are you sure you want to remove the API key for ${selectedProvider?.name || selectedProvId}?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`${API}/ai/keys/${selectedProvId}`, {
        method: 'DELETE',
        headers: authHdr()
      });
      const data = await res.json();
      if (data.success) {
        setAi(data.data);
        toast(`API key for ${selectedProvider?.name || selectedProvId} removed`, 'success');
      } else {
        toast(data.message || 'Failed to remove API key', 'error');
      }
    } catch (err) {
      toast('Network error removing API key', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveIcon = async () => {
    setBusy(true);
    try {
      const res = await fetch(`${API}/ai`, {
        method: 'PUT',
        headers: authHdr(),
        body: JSON.stringify({
          icons: {
            [selectedProvId]: iconInput.trim()
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setAi(data.data);
        toast(`Icon for ${selectedProvider?.name || selectedProvId} updated successfully!`, 'success');
      } else {
        toast(data.message || 'Failed to update icon', 'error');
      }
    } catch (err) {
      toast('Network error updating icon', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleActivateProvider = async () => {
    if (!isKeyLinked) {
      toast(`You must link an API key for ${selectedProvider?.name} first.`, 'error');
      return;
    }
    setBusy(true);
    try {
      const defaultModel = selectedProvider?.models?.[0]?.id || '';
      const res = await fetch(`${API}/ai`, {
        method: 'PUT',
        headers: authHdr(),
        body: JSON.stringify({ provider: selectedProvId, model: defaultModel })
      });
      const data = await res.json();
      if (data.success) {
        setAi(data.data);
        toast(`Active AI provider changed to ${selectedProvider?.name}`, 'success');
      } else {
        toast(data.message || 'Failed to set active provider', 'error');
      }
    } catch (err) {
      toast('Network error setting active provider', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleActiveModelChange = async (e) => {
    const newModel = e.target.value;
    setBusy(true);
    try {
      const res = await fetch(`${API}/ai`, {
        method: 'PUT',
        headers: authHdr(),
        body: JSON.stringify({ provider: ai.provider, model: newModel })
      });
      const data = await res.json();
      if (data.success) {
        setAi(data.data);
        toast(`Active model set to ${newModel}`, 'success');
      } else {
        toast(data.message || 'Failed to update active model', 'error');
      }
    } catch (err) {
      toast('Network error changing model', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div className="adm-section-title">AI Provider & API Settings</div>
        <div className="adm-section-sub">Configure API keys, select active providers, and switch language models.</div>
      </div>

      {/* Active Provider Hero Card */}
      <div className="adm-card" style={{
        background: providerColors[ai.provider] || 'var(--adm-card)',
        marginBottom: 20,
        padding: '28px 24px',
        borderRadius: 16,
        color: '#fff',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: 20, top: 16, opacity: 0.18, pointerEvents: 'none' }}>
          {getProviderIcon(ai.provider, 64)}
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, opacity: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>
          Active AI Provider
        </div>
        <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 6 }}>
          {activeProvider?.name || ai.provider || 'Gemini'}
        </div>
        <div style={{ fontSize: 14, opacity: 0.85, fontWeight: 500 }}>
          Model: <strong>{ai.model || 'gemini-2.5-flash'}</strong>
        </div>

        {/* Model Selection Dropdown for Active Provider */}
        {activeProvider && (
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, opacity: 0.9 }}>Change Model:</span>
            <select
              value={ai.model}
              onChange={handleActiveModelChange}
              disabled={busy}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.25)',
                color: '#fff',
                fontSize: 13,
                fontWeight: 500,
                padding: '4px 10px',
                borderRadius: 6,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {(activeProvider.models || []).map(m => (
                <option key={m.id} value={m.id} style={{ background: '#1a1a28', color: '#fff' }}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          marginTop: 14, background: 'rgba(255,255,255,0.2)',
          borderRadius: 20, padding: '4px 14px', fontSize: 12, fontWeight: 600,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
          ACTIVE & POWERING CHAT
        </div>
      </div>

      {/* Select Provider Grid */}
      <div style={{ marginTop: 24, marginBottom: 12, fontWeight: 600, fontSize: 14 }}>
        Configure Available Providers
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginBottom: 20 }}>
        {(ai.allProviders || [
          { id: 'gemini', name: 'Google Gemini', models: [{ name: 'gemini-2.5-flash' }, { name: 'gemini-1.5-pro' }] },
          { id: 'openai', name: 'OpenAI', models: [{ name: 'gpt-4o' }, { name: 'gpt-4o-mini' }] },
          { id: 'anthropic', name: 'Anthropic', models: [{ name: 'claude-3.5-sonnet' }] },
        ]).map(p => {
          const hasKey = ai.apiKeys && !!ai.apiKeys[p.id];
          const isActive = p.id === ai.provider;
          return (
            <div
              key={p.id}
              onClick={() => setSelectedProvId(p.id)}
              className="adm-card"
              style={{
                padding: '16px',
                border: selectedProvId === p.id
                  ? '2px solid var(--adm-accent)'
                  : (isActive ? '2px solid rgba(34, 197, 94, 0.4)' : '2px solid transparent'),
                borderRadius: 12,
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: selectedProvId === p.id ? 'rgba(124, 108, 252, 0.05)' : 'var(--adm-card)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', color: selectedProvId === p.id ? 'var(--adm-accent2)' : 'inherit' }}>
                  {getProviderIcon(p.id, 18)}
                </span>
                <span style={{ fontWeight: 600, fontSize: 13.5 }}>{p.name}</span>
                {isActive && (
                  <span className="adm-ai-active-badge" style={{ marginLeft: 'auto' }}>ACTIVE</span>
                )}
              </div>
              <div style={{ fontSize: 11, color: 'var(--adm-dim)', marginBottom: 8 }}>
                {(p.models || []).map(m => m.shortName || m.name).slice(0, 3).join(' · ')}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, fontWeight: 500 }}>
                {hasKey ? (
                  <span style={{ color: 'var(--adm-green)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    ● Key Linked
                  </span>
                ) : (
                  <span style={{ color: 'var(--adm-dim)' }}>
                    ○ Unlinked
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Provider Details & Key configuration */}
      {selectedProvider && (
        <div className="adm-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span style={{ display: 'inline-flex', color: 'var(--adm-accent2)' }}>
              {getProviderIcon(selectedProvider.id, 24)}
            </span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Settings for {selectedProvider.name}</div>
              <div style={{ fontSize: 12, color: 'var(--adm-dim)' }}>Configure credentials and active settings below.</div>
            </div>
          </div>

          <div className="adm-field" style={{ marginBottom: 20 }}>
            <label className="adm-label">API Key Status</label>
            {isKeyLinked ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--adm-border)', borderRadius: 8, padding: '10px 14px' }}>
                <span style={{ fontSize: 13, fontFamily: 'monospace', color: 'var(--adm-dim)' }}>
                  {maskedKey}
                </span>
                <button
                  className="adm-btn adm-btn-danger adm-btn-sm"
                  onClick={handleRemoveKey}
                  disabled={busy}
                >
                  Remove Key
                </button>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--adm-dim)', fontStyle: 'italic', padding: '6px 0' }}>
                No API Key currently configured. Link a key below to enable this provider.
              </div>
            )}
          </div>

          <div className="adm-field" style={{ marginBottom: 20 }}>
            <label className="adm-label" htmlFor="prov-icon-input">
              Provider Icon (Emoji, SVG markup, or Image URL)
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                id="prov-icon-input"
                className="adm-input"
                value={iconInput}
                onChange={e => setIconInput(e.target.value)}
                placeholder="✨ or <svg>..."
                disabled={busy}
                style={{ flex: 1 }}
              />
              <button
                className="adm-btn adm-btn-secondary"
                onClick={handleSaveIcon}
                disabled={busy}
              >
                Save Icon
              </button>
            </div>
          </div>

          <div className="adm-field" style={{ marginBottom: 20 }}>
            <label className="adm-label" htmlFor="api-key-input">
              {isKeyLinked ? 'Update / Change API Key' : 'Link API Key'}
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                id="api-key-input"
                className="adm-input"
                type="password"
                value={apiKeyInput}
                onChange={e => setApiKeyInput(e.target.value)}
                placeholder={selectedProvider.id === 'gemini' ? 'Enter Gemini API key (starts with AIza...)' : 'Enter API Key...'}
                disabled={busy}
                style={{ flex: 1 }}
              />
              <button
                className="adm-btn adm-btn-primary"
                onClick={handleLinkKey}
                disabled={busy || !apiKeyInput.trim()}
              >
                {busy ? 'Saving...' : 'Link Key'}
              </button>
            </div>
            {selectedProvider.id === 'gemini' && (
              <div style={{ marginTop: 6, fontSize: 11.5, color: 'var(--adm-dim)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Info size={12} />
                <span>
                  Get a free key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--adm-accent2)', textDecoration: 'underline' }}>Google AI Studio</a>.
                </span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10, borderTop: '1px solid var(--adm-border)', paddingTop: 20 }}>
            {selectedProvId !== ai.provider ? (
              <button
                className="adm-btn adm-btn-primary"
                onClick={handleActivateProvider}
                disabled={busy || !isKeyLinked}
              >
                Make Active Provider
              </button>
            ) : (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--adm-green)' }}>
                <CheckCircle size={16} />
                <span>Currently Active provider powering TOM.AI chat</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══ RAG Tab ══════════════════════════════════════════════════════════ */
function RAGTab({ toast }) {
  const [rag, setRag] = useState({ enabled: false, source: '', chunkSize: 1000, overlap: 200 });
  const [busy, setBusy] = useState(false);
  useEffect(() => { fetch(`${API}/rag`, { headers: authHdr() }).then(r => r.json()).then(d => { if (d.success) setRag(d.data); }); }, []);
  const save = async () => { setBusy(true); await fetch(`${API}/rag`, { method: 'PUT', headers: authHdr(), body: JSON.stringify(rag) }); toast('RAG settings saved', 'success'); setBusy(false); };
  return (
    <div>
      <div className="adm-section-title">RAG — Knowledge Base</div>
      <div className="adm-section-sub">Configure Retrieval-Augmented Generation for TOM.AI</div>
      <div className="adm-card">
        <div className="adm-toggle-row">
          <div><div className="adm-toggle-label">Enable RAG</div><div className="adm-toggle-sub">Let TOM.AI query your knowledge base</div></div>
          <label className="adm-toggle">
            <input type="checkbox" checked={rag.enabled} onChange={e => setRag(r => ({ ...r, enabled: e.target.checked }))} />
            <div className="adm-toggle-track" /><div className="adm-toggle-thumb" />
          </label>
        </div>
        <div className="adm-field" style={{ marginTop: 16 }}><label className="adm-label">Knowledge Source URL / Path</label><input className="adm-input" value={rag.source} onChange={e => setRag(r => ({ ...r, source: e.target.value }))} placeholder="https://docs.example.com or /path/to/docs" /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="adm-field"><label className="adm-label">Chunk Size</label><input className="adm-input" type="number" value={rag.chunkSize} onChange={e => setRag(r => ({ ...r, chunkSize: +e.target.value }))} /></div>
          <div className="adm-field"><label className="adm-label">Overlap</label><input className="adm-input" type="number" value={rag.overlap} onChange={e => setRag(r => ({ ...r, overlap: +e.target.value }))} /></div>
        </div>
        <button className="adm-btn adm-btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save RAG Config'}</button>
      </div>
    </div>
  );
}

/* ══ Profile Tab ══════════════════════════════════════════════════════ */
function ProfileTab({ toast }) {
  const [prof, setProf] = useState({ adminName: 'Admin', adminEmail: '', appName: 'TOM.AI' });
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  useEffect(() => { fetch(`${API}/profile`, { headers: authHdr() }).then(r => r.json()).then(d => { if (d.success) setProf(d.data); }); }, []);

  const saveProf = async () => { setBusy(true); await fetch(`${API}/profile`, { method: 'PUT', headers: authHdr(), body: JSON.stringify(prof) }); toast('Profile saved', 'success'); setBusy(false); };
  const changePwd = async () => {
    if (pwd.next !== pwd.confirm) { toast('Passwords do not match', 'error'); return; }
    setBusy(true);
    const r = await fetch(`${API}/change-password`, { method: 'PUT', headers: authHdr(), body: JSON.stringify({ currentPassword: pwd.current, newPassword: pwd.next }) });
    const d = await r.json(); if (d.success) { toast('Password changed', 'success'); setPwd({ current: '', next: '', confirm: '' }); } else toast(d.message, 'error');
    setBusy(false);
  };

  return (
    <div>
      <div className="adm-section-title">Admin Profile</div>
      <div className="adm-section-sub">Update your admin details and app branding</div>
      <div className="adm-card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 14 }}>Profile Info</div>
        <div className="adm-field"><label className="adm-label">Admin Name</label><input className="adm-input" value={prof.adminName} onChange={e => setProf(p => ({ ...p, adminName: e.target.value }))} /></div>
        <div className="adm-field"><label className="adm-label">Email</label><input className="adm-input" type="email" value={prof.adminEmail} onChange={e => setProf(p => ({ ...p, adminEmail: e.target.value }))} /></div>
        <div className="adm-field"><label className="adm-label">App Name</label><input className="adm-input" value={prof.appName} onChange={e => setProf(p => ({ ...p, appName: e.target.value }))} /></div>
        <button className="adm-btn adm-btn-primary" onClick={saveProf} disabled={busy}>Save Profile</button>
      </div>
      <div className="adm-card">
        <div style={{ fontWeight: 600, marginBottom: 14 }}>Change Password</div>
        <div className="adm-field"><label className="adm-label">Current Password</label><input className="adm-input" type="password" value={pwd.current} onChange={e => setPwd(p => ({ ...p, current: e.target.value }))} /></div>
        <div className="adm-field"><label className="adm-label">New Password</label><input className="adm-input" type="password" value={pwd.next} onChange={e => setPwd(p => ({ ...p, next: e.target.value }))} /></div>
        <div className="adm-field"><label className="adm-label">Confirm Password</label><input className="adm-input" type="password" value={pwd.confirm} onChange={e => setPwd(p => ({ ...p, confirm: e.target.value }))} /></div>
        <button className="adm-btn adm-btn-secondary" onClick={changePwd} disabled={busy}>Change Password</button>
      </div>
    </div>
  );
}

/* ══ Dashboard ═══════════════════════════════════════════════════════ */
function DashboardTab() {
  const [stats, setStats] = useState({ mcps: 0, ai: '', model: '', aiKeys: 0 });
  useEffect(() => {
    Promise.all([
      fetch(`${API}/mcps`, { headers: authHdr() }).then(r => r.json()),
      fetch(`${API}/ai`, { headers: authHdr() }).then(r => r.json()),
    ]).then(([m, a]) => setStats({ mcps: m.data?.length || 0, ai: a.data?.provider || '', model: a.data?.model || '', aiKeys: Object.keys(a.data?.apiKeys || {}).length }));
  }, []);
  return (
    <div>
      <div className="adm-section-title">Dashboard</div>
      <div className="adm-section-sub">Overview of your TOM.AI admin panel</div>
      <div className="adm-stats">
        <div className="adm-stat-card"><div className="adm-stat-num">{stats.mcps}</div><div className="adm-stat-label">MCP Integrations</div></div>
        <div className="adm-stat-card"><div className="adm-stat-num">{stats.aiKeys}</div><div className="adm-stat-label">AI Keys Configured</div></div>
        <div className="adm-stat-card"><div className="adm-stat-num" style={{ fontSize: 18, paddingTop: 4 }}>{stats.ai || '—'}</div><div className="adm-stat-label">Active AI Provider</div></div>
        <div className="adm-stat-card"><div className="adm-stat-num" style={{ fontSize: 14, paddingTop: 8 }}>{stats.model || '—'}</div><div className="adm-stat-label">Active Model</div></div>
      </div>
      <div className="adm-card" style={{ lineHeight: 1.7, color: 'var(--adm-dim)', fontSize: 13.5 }}>
        <div style={{ fontWeight: 600, color: 'var(--adm-text)', marginBottom: 8 }}>Quick Guide</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Plug size={16} style={{ flexShrink: 0 }} />
          <span><strong>MCPs</strong> — Add or remove integrations like Gmail, Drive, Slack. Each MCP needs its API key to work.</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Brain size={16} style={{ flexShrink: 0 }} />
          <span><strong>AI</strong> — View the active AI provider and model. API keys are managed via server environment variables.</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Database size={16} style={{ flexShrink: 0 }} />
          <span><strong>RAG</strong> — Enable the knowledge base so TOM.AI can reference your documents.</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserIcon size={16} style={{ flexShrink: 0 }} />
          <span><strong>Profile</strong> — Update admin name, email, and change your password.</span>
        </div>
      </div>
    </div>
  );
}

/* ══ Main Admin Panel ════════════════════════════════════════════════ */
const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={14} /> },
  { id: 'mcps', label: 'MCPs', icon: <Plug size={14} /> },
  { id: 'ai', label: 'AI', icon: <Brain size={14} /> },
  { id: 'rag', label: 'RAG', icon: <Database size={14} /> },
  { id: 'profile', label: 'Profile', icon: <UserIcon size={14} /> },
];

export default function AdminPanel() {
  const [authed, setAuthed] = useState(!!getToken());
  const [tab, setTab] = useState('dashboard');
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => setToast({ msg, type, key: Date.now() });
  const logout = () => { localStorage.removeItem('tom_admin_token'); setAuthed(false); };

  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />;

  const tabMap = { dashboard: <DashboardTab />, mcps: <MCPsTab toast={showToast} />, ai: <AITab toast={showToast} />, rag: <RAGTab toast={showToast} />, profile: <ProfileTab toast={showToast} /> };
  const cur = TABS.find(t => t.id === tab) || TABS[0];

  return (
    <div className="adm-root">
      <aside className="adm-sidebar">
        <div className="adm-sidebar-logo">
          <img src="/images/logo.png" alt="tom.ai" />
          <span className="adm-sidebar-logo-text">TOM.AI</span>
          <span className="adm-sidebar-logo-badge">ADMIN</span>
        </div>
        <nav className="adm-nav">
          {TABS.map(t => (
            <button key={t.id} className={`adm-nav-item ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              {renderIcon(t.icon)} {t.label}
            </button>
          ))}
        </nav>
        <div className="adm-sidebar-footer">
          <button className="adm-logout-btn" onClick={logout} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </aside>

      <div className="adm-main">
        <div className="adm-topbar">
          <div>
            <div className="adm-topbar-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {renderIcon(cur.icon)} {cur.label}
            </div>
            <div className="adm-topbar-sub">TOM.AI Admin Panel</div>
          </div>
          <div className="adm-topbar-right">
            <div className="adm-status-dot" title="Backend connected" />
            <span style={{ fontSize: 12, color: 'var(--adm-dim)' }}>Live</span>
          </div>
        </div>
        <div className="adm-content">{tabMap[tab]}</div>
      </div>

      {toast && <Toast key={toast.key} msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
