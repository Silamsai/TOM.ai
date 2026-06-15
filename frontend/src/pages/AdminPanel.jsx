import React, { useState, useEffect, useRef } from 'react';
import '../styles/admin.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const API = `${API_BASE_URL}/admin`;
const getToken = () => localStorage.getItem('tom_admin_token');
const authHdr  = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

const renderIcon = (icon) => {
  if (!icon) return <span>🔌</span>;
  const t = icon.trim();
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
          <div className="adm-field"><label className="adm-label">Username</label><input className="adm-input" value={u} onChange={e=>setU(e.target.value)} placeholder="admin@tomai.com" required /></div>
          <div className="adm-field"><label className="adm-label">Password</label><input className="adm-input" type="password" value={p} onChange={e=>setP(e.target.value)} placeholder="••••••••" required /></div>
          {err && <div className="adm-error">{err}</div>}
          <button className="adm-btn adm-btn-primary adm-btn-full" style={{marginTop:18}} disabled={busy}>{busy ? 'Signing in…' : 'Sign In'}</button>
        </form>
        <div style={{textAlign:'center',marginTop:16,fontSize:12,color:'var(--adm-dim)'}}>Default: admin@tomai.com / Admin@123</div>
      </div>
    </div>
  );
}

/* ══ MCP Tab ═════════════════════════════════════════════════════════ */
function MCPsTab({ toast }) {
  const [mcps, setMcps] = useState([]);
  const [modal, setModal] = useState(null); // null | 'add' | {mcp obj}
  const [form, setForm] = useState({ name:'', desc:'', icon:'', apiKey:'', connectionString:'' });
  const [busy, setBusy] = useState(false);
  const fileRef = useRef();

  const load = () => fetch(`${API}/mcps`, { headers: authHdr() }).then(r=>r.json()).then(d=>{ if(d.success) setMcps(d.data); });
  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm({ name:'', desc:'', icon:'', apiKey:'', connectionString:'' }); setModal('add'); };
  const openEdit = (m) => { setForm({ name:m.name, desc:m.desc, icon:m.icon, apiKey:m.apiKey, connectionString:m.connectionString }); setModal(m); };

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
        await fetch(`${API}/mcps`, { method:'POST', headers: authHdr(), body: JSON.stringify(form) });
        toast('MCP added', 'success');
      } else {
        await fetch(`${API}/mcps/${modal.id}`, { method:'PUT', headers: authHdr(), body: JSON.stringify(form) });
        toast('MCP updated', 'success');
      }
      await load(); setModal(null);
    } catch { toast('Save failed', 'error'); }
    setBusy(false);
  };

  const del = async (id) => {
    if (!window.confirm('Delete this MCP?')) return;
    await fetch(`${API}/mcps/${id}`, { method:'DELETE', headers: authHdr() });
    toast('MCP removed', 'success'); load();
  };

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div><div className="adm-section-title">MCP Integrations</div><div className="adm-section-sub">Manage connected applications and their API credentials</div></div>
        <button className="adm-btn adm-btn-primary" onClick={openAdd}>+ Add MCP</button>
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
                <button className="adm-btn adm-btn-secondary adm-btn-sm" onClick={()=>openEdit(m)}>Edit</button>
                <button className="adm-btn adm-btn-danger adm-btn-sm" onClick={()=>del(m.id)}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div className="adm-overlay" onClick={()=>setModal(null)}>
          <div className="adm-modal" onClick={e=>e.stopPropagation()}>
            <div className="adm-modal-header">
              <div className="adm-modal-title">{modal==='add'?'Add New MCP':'Edit MCP'}</div>
              <button className="adm-btn adm-btn-secondary adm-btn-sm" onClick={()=>setModal(null)}>✕</button>
            </div>
            <div className="adm-modal-body">
              <div className="adm-logo-upload">
                <div className="adm-logo-preview">{form.icon ? renderIcon(form.icon) : <span>🔌</span>}</div>
                <div>
                  <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleFile} />
                  <button className="adm-btn adm-btn-secondary adm-btn-sm" onClick={()=>fileRef.current.click()}>Upload Logo</button>
                  <div className="adm-upload-hint">Or paste SVG / URL below</div>
                </div>
              </div>
              <div className="adm-field"><label className="adm-label">Icon (SVG / URL / emoji)</label><input className="adm-input" value={form.icon} onChange={e=>setForm(p=>({...p,icon:e.target.value}))} placeholder="<svg>... or https://... or 🔌" /></div>
              <div className="adm-field"><label className="adm-label">Name *</label><input className="adm-input" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="Gmail" /></div>
              <div className="adm-field"><label className="adm-label">Description</label><input className="adm-input" value={form.desc} onChange={e=>setForm(p=>({...p,desc:e.target.value}))} placeholder="Read emails & draft replies" /></div>
              <div className="adm-field"><label className="adm-label">API / Connection String</label><input className="adm-input" value={form.connectionString} onChange={e=>setForm(p=>({...p,connectionString:e.target.value}))} placeholder="https://api.example.com" /></div>
              <div className="adm-field"><label className="adm-label">API Key</label><input className="adm-input" type="password" value={form.apiKey} onChange={e=>setForm(p=>({...p,apiKey:e.target.value}))} placeholder="Enter API key…" /></div>
              <div className="adm-modal-actions">
                <button className="adm-btn adm-btn-secondary" onClick={()=>setModal(null)}>Cancel</button>
                <button className="adm-btn adm-btn-primary" onClick={save} disabled={busy||!form.name}>{busy?'Saving…':'Save'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══ AI Tab (Read-Only Status View) ═════════════════════════════════ */
function AITab() {
  const [ai, setAi] = useState({ provider: 'gemini', model: '', allProviders: [] });

  useEffect(() => {
    fetch(`${API}/ai`, { headers: authHdr() })
      .then(r => r.json())
      .then(d => { if (d.success) setAi(d.data); });
  }, []);

  const activeProvider = (ai.allProviders || []).find(p => p.id === ai.provider);

  const providerIcons = {
    gemini: '✨',
    openai: '🤖',
    anthropic: '🧠',
  };

  const providerColors = {
    gemini: 'linear-gradient(135deg, #4285f4 0%, #34a853 100%)',
    openai: 'linear-gradient(135deg, #10a37f 0%, #1a7f64 100%)',
    anthropic: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div className="adm-section-title">AI Status</div>
        <div className="adm-section-sub">Current AI provider and model powering TOM.AI</div>
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
        <div style={{ position: 'absolute', right: 20, top: 16, fontSize: 64, opacity: 0.18, lineHeight: 1 }}>
          {providerIcons[ai.provider] || '🤖'}
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
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          marginTop: 14, background: 'rgba(255,255,255,0.2)',
          borderRadius: 20, padding: '4px 14px', fontSize: 12, fontWeight: 600,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
          ACTIVE & RUNNING
        </div>
      </div>

      {/* Info Note */}
      <div className="adm-card" style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '18px 20px' }}>
        <div style={{ fontSize: 24, lineHeight: 1 }}>ℹ️</div>
        <div>
          <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 14 }}>API Key Management</div>
          <div style={{ fontSize: 13, color: 'var(--adm-dim)', lineHeight: 1.6 }}>
            API keys are configured securely via environment variables on the server.
            To update the Gemini API key, go to your <strong>Render Dashboard → Environment Variables</strong> and set <code style={{ background: 'var(--adm-border)', padding: '1px 6px', borderRadius: 4 }}>GEMINI_API_KEY</code> to a valid key starting with <code style={{ background: 'var(--adm-border)', padding: '1px 6px', borderRadius: 4 }}>AIza...</code>
          </div>
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="adm-btn adm-btn-secondary adm-btn-sm"
            style={{ marginTop: 12, display: 'inline-block', textDecoration: 'none' }}
          >
            🔑 Get API Key from Google AI Studio ↗
          </a>
        </div>
      </div>

      {/* Available Providers */}
      <div style={{ marginTop: 24, marginBottom: 10, fontWeight: 600, fontSize: 13 }}>Available Providers</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 }}>
        {(ai.allProviders || [
          { id: 'gemini', name: 'Google Gemini', models: [{ name: 'gemini-2.5-flash' }, { name: 'gemini-1.5-pro' }] },
          { id: 'openai', name: 'OpenAI', models: [{ name: 'gpt-4o' }, { name: 'gpt-4o-mini' }] },
          { id: 'anthropic', name: 'Anthropic', models: [{ name: 'claude-3.5-sonnet' }] },
        ]).map(p => (
          <div key={p.id} className="adm-card" style={{
            padding: '14px 16px',
            border: p.id === ai.provider ? '2px solid #4285f4' : '2px solid transparent',
            borderRadius: 12,
            opacity: p.id === ai.provider ? 1 : 0.6,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 20 }}>{providerIcons[p.id] || '🤖'}</span>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</span>
              {p.id === ai.provider && (
                <span className="adm-ai-active-badge" style={{ marginLeft: 'auto' }}>ACTIVE</span>
              )}
            </div>
            <div style={{ fontSize: 11, color: 'var(--adm-dim)' }}>
              {(p.models || []).map(m => m.shortName || m.name).slice(0, 3).join(' · ')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══ RAG Tab ══════════════════════════════════════════════════════════ */
function RAGTab({ toast }) {
  const [rag, setRag] = useState({ enabled:false, source:'', chunkSize:1000, overlap:200 });
  const [busy, setBusy] = useState(false);
  useEffect(() => { fetch(`${API}/rag`,{headers:authHdr()}).then(r=>r.json()).then(d=>{ if(d.success) setRag(d.data); }); }, []);
  const save = async () => { setBusy(true); await fetch(`${API}/rag`,{method:'PUT',headers:authHdr(),body:JSON.stringify(rag)}); toast('RAG settings saved','success'); setBusy(false); };
  return (
    <div>
      <div className="adm-section-title">RAG — Knowledge Base</div>
      <div className="adm-section-sub">Configure Retrieval-Augmented Generation for TOM.AI</div>
      <div className="adm-card">
        <div className="adm-toggle-row">
          <div><div className="adm-toggle-label">Enable RAG</div><div className="adm-toggle-sub">Let TOM.AI query your knowledge base</div></div>
          <label className="adm-toggle">
            <input type="checkbox" checked={rag.enabled} onChange={e=>setRag(r=>({...r,enabled:e.target.checked}))} />
            <div className="adm-toggle-track"/><div className="adm-toggle-thumb"/>
          </label>
        </div>
        <div className="adm-field" style={{marginTop:16}}><label className="adm-label">Knowledge Source URL / Path</label><input className="adm-input" value={rag.source} onChange={e=>setRag(r=>({...r,source:e.target.value}))} placeholder="https://docs.example.com or /path/to/docs" /></div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div className="adm-field"><label className="adm-label">Chunk Size</label><input className="adm-input" type="number" value={rag.chunkSize} onChange={e=>setRag(r=>({...r,chunkSize:+e.target.value}))} /></div>
          <div className="adm-field"><label className="adm-label">Overlap</label><input className="adm-input" type="number" value={rag.overlap} onChange={e=>setRag(r=>({...r,overlap:+e.target.value}))} /></div>
        </div>
        <button className="adm-btn adm-btn-primary" onClick={save} disabled={busy}>{busy?'Saving…':'Save RAG Config'}</button>
      </div>
    </div>
  );
}

/* ══ Profile Tab ══════════════════════════════════════════════════════ */
function ProfileTab({ toast }) {
  const [prof, setProf] = useState({ adminName:'Admin', adminEmail:'', appName:'TOM.AI' });
  const [pwd, setPwd] = useState({ current:'', next:'', confirm:'' });
  const [busy, setBusy] = useState(false);
  useEffect(() => { fetch(`${API}/profile`,{headers:authHdr()}).then(r=>r.json()).then(d=>{ if(d.success) setProf(d.data); }); }, []);

  const saveProf = async () => { setBusy(true); await fetch(`${API}/profile`,{method:'PUT',headers:authHdr(),body:JSON.stringify(prof)}); toast('Profile saved','success'); setBusy(false); };
  const changePwd = async () => {
    if (pwd.next !== pwd.confirm) { toast('Passwords do not match','error'); return; }
    setBusy(true);
    const r = await fetch(`${API}/change-password`,{method:'PUT',headers:authHdr(),body:JSON.stringify({currentPassword:pwd.current,newPassword:pwd.next})});
    const d = await r.json(); if(d.success) { toast('Password changed','success'); setPwd({current:'',next:'',confirm:''}); } else toast(d.message,'error');
    setBusy(false);
  };

  return (
    <div>
      <div className="adm-section-title">Admin Profile</div>
      <div className="adm-section-sub">Update your admin details and app branding</div>
      <div className="adm-card" style={{marginBottom:16}}>
        <div style={{fontWeight:600,marginBottom:14}}>Profile Info</div>
        <div className="adm-field"><label className="adm-label">Admin Name</label><input className="adm-input" value={prof.adminName} onChange={e=>setProf(p=>({...p,adminName:e.target.value}))} /></div>
        <div className="adm-field"><label className="adm-label">Email</label><input className="adm-input" type="email" value={prof.adminEmail} onChange={e=>setProf(p=>({...p,adminEmail:e.target.value}))} /></div>
        <div className="adm-field"><label className="adm-label">App Name</label><input className="adm-input" value={prof.appName} onChange={e=>setProf(p=>({...p,appName:e.target.value}))} /></div>
        <button className="adm-btn adm-btn-primary" onClick={saveProf} disabled={busy}>Save Profile</button>
      </div>
      <div className="adm-card">
        <div style={{fontWeight:600,marginBottom:14}}>Change Password</div>
        <div className="adm-field"><label className="adm-label">Current Password</label><input className="adm-input" type="password" value={pwd.current} onChange={e=>setPwd(p=>({...p,current:e.target.value}))} /></div>
        <div className="adm-field"><label className="adm-label">New Password</label><input className="adm-input" type="password" value={pwd.next} onChange={e=>setPwd(p=>({...p,next:e.target.value}))} /></div>
        <div className="adm-field"><label className="adm-label">Confirm Password</label><input className="adm-input" type="password" value={pwd.confirm} onChange={e=>setPwd(p=>({...p,confirm:e.target.value}))} /></div>
        <button className="adm-btn adm-btn-secondary" onClick={changePwd} disabled={busy}>Change Password</button>
      </div>
    </div>
  );
}

/* ══ Dashboard ═══════════════════════════════════════════════════════ */
function DashboardTab() {
  const [stats, setStats] = useState({ mcps:0, ai:'', model:'', aiKeys:0 });
  useEffect(() => {
    Promise.all([
      fetch(`${API}/mcps`,{headers:authHdr()}).then(r=>r.json()),
      fetch(`${API}/ai`,{headers:authHdr()}).then(r=>r.json()),
    ]).then(([m,a]) => setStats({ mcps: m.data?.length||0, ai: a.data?.provider||'', model: a.data?.model||'', aiKeys: Object.keys(a.data?.apiKeys||{}).length }));
  }, []);
  return (
    <div>
      <div className="adm-section-title">Dashboard</div>
      <div className="adm-section-sub">Overview of your TOM.AI admin panel</div>
      <div className="adm-stats">
        <div className="adm-stat-card"><div className="adm-stat-num">{stats.mcps}</div><div className="adm-stat-label">MCP Integrations</div></div>
        <div className="adm-stat-card"><div className="adm-stat-num">{stats.aiKeys}</div><div className="adm-stat-label">AI Keys Configured</div></div>
        <div className="adm-stat-card"><div className="adm-stat-num" style={{fontSize:18,paddingTop:4}}>{stats.ai||'—'}</div><div className="adm-stat-label">Active AI Provider</div></div>
        <div className="adm-stat-card"><div className="adm-stat-num" style={{fontSize:14,paddingTop:8}}>{stats.model||'—'}</div><div className="adm-stat-label">Active Model</div></div>
      </div>
      <div className="adm-card" style={{lineHeight:1.7,color:'var(--adm-dim)',fontSize:13.5}}>
        <div style={{fontWeight:600,color:'var(--adm-text)',marginBottom:8}}>Quick Guide</div>
        <div>📦 <strong>MCPs</strong> — Add or remove integrations like Gmail, Drive, Slack. Each MCP needs its API key to work.</div>
        <div>🤖 <strong>AI</strong> — View the active AI provider and model. API keys are managed via server environment variables.</div>
        <div>📚 <strong>RAG</strong> — Enable the knowledge base so TOM.AI can reference your documents.</div>
        <div>👤 <strong>Profile</strong> — Update admin name, email, and change your password.</div>
      </div>
    </div>
  );
}

/* ══ Main Admin Panel ════════════════════════════════════════════════ */
const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>' },
  { id: 'mcps', label: 'MCPs', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l4 4h-3v6h-2V6H8l4-4zM4 20v-5h2v5h12v-5h2v5c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2z"/></svg>' },
  { id: 'ai', label: 'AI', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>' },
  { id: 'rag', label: 'RAG', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h16v16H4z"/><path d="M4 12h16"/></svg>' },
  { id: 'profile', label: 'Profile', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8" r="4"/><path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/></svg>' },
];

export default function AdminPanel() {
  const [authed, setAuthed]   = useState(!!getToken());
  const [tab,    setTab]      = useState('dashboard');
  const [toast,  setToast]    = useState(null);

  const showToast = (msg, type='success') => setToast({ msg, type, key: Date.now() });
  const logout = () => { localStorage.removeItem('tom_admin_token'); setAuthed(false); };

  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />;

  const tabMap = { dashboard: <DashboardTab />, mcps: <MCPsTab toast={showToast} />, ai: <AITab />, rag: <RAGTab toast={showToast} />, profile: <ProfileTab toast={showToast} /> };
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
            <button key={t.id} className={`adm-nav-item ${tab===t.id?'active':''}`} onClick={()=>setTab(t.id)}>
              {renderIcon(t.icon)} {t.label}
            </button>
          ))}
        </nav>
        <div className="adm-sidebar-footer">
          <button className="adm-logout-btn" onClick={logout}>
            <svg viewBox="0 0 24 24" fill="currentColor" style={{width:'1.2em',height:'1.2em',verticalAlign:'middle',marginRight:'6px'}}>
              <path d="M10 14V7l5 3.5-5 3.5zM5 5h14v2H5V5zm0 12h14v2H5v-2z"/>
            </svg>
            Logout
          </button>
        </div>
      </aside>

      <div className="adm-main">
        <div className="adm-topbar">
          <div>
            <div className="adm-topbar-title" style={{display:'flex',alignItems:'center',gap:'8px'}}>
              {renderIcon(cur.icon)} {cur.label}
            </div>
            <div className="adm-topbar-sub">TOM.AI Admin Panel</div>
          </div>
          <div className="adm-topbar-right">
            <div className="adm-status-dot" title="Backend connected" />
            <span style={{fontSize:12,color:'var(--adm-dim)'}}>Live</span>
          </div>
        </div>
        <div className="adm-content">{tabMap[tab]}</div>
      </div>

      {toast && <Toast key={toast.key} msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
