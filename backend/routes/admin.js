const express = require('express');
const router  = express.Router();
const fs      = require('fs');
const path    = require('path');
const jwt     = require('jsonwebtoken');

const DATA_DIR   = path.join(__dirname, '../data');
const CONFIG_PATH = path.join(DATA_DIR, 'admin-config.json');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin@tomai.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123';
const ADMIN_SECRET   = (process.env.JWT_SECRET || 'secret') + '-admin';

console.log('🔑 [TOM.AI Admin] Credentials Configured:', { username: ADMIN_USERNAME, password: ADMIN_PASSWORD });

const DEFAULT_CONFIG = {
  mcps: [
    { id: 'gmail',    name: 'Gmail',           desc: 'Read emails & draft replies',       icon: '', apiKey: '', connectionString: 'https://gmail.googleapis.com' },
    { id: 'calendar', name: 'Google Calendar', desc: 'Read & create calendar events',     icon: '', apiKey: '', connectionString: 'https://www.googleapis.com/calendar/v3' },
    { id: 'drive',    name: 'Google Drive',    desc: 'Access files & documents',          icon: '', apiKey: '', connectionString: 'https://www.googleapis.com/drive/v3' },
    { id: 'notion',   name: 'Notion',          desc: 'Read & write Notion pages',         icon: '', apiKey: '', connectionString: 'https://api.notion.com/v1' },
    { id: 'slack',    name: 'Slack',           desc: 'Send & read messages',              icon: '', apiKey: '', connectionString: 'https://slack.com/api' },
    { id: 'github',   name: 'GitHub',          desc: 'Access repos & issues',             icon: '', apiKey: '', connectionString: 'https://api.github.com' },
  ],
  ai: {
    provider: 'gemini',
    apiKey: '',
    model: 'gemini-1.5-flash',
    providers: [
      { id: 'gemini',    name: 'Google Gemini',     models: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'] },
      { id: 'openai',    name: 'OpenAI',            models: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'] },
      { id: 'anthropic', name: 'Anthropic Claude',  models: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'] },
    ]
  },
  rag: { enabled: false, source: '', chunkSize: 1000, overlap: 200 },
  profile: { adminName: 'Admin', adminEmail: '', appName: 'TOM.AI' },
};

const readConfig = () => {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
      return {
        ...DEFAULT_CONFIG, ...raw,
        ai:      { ...DEFAULT_CONFIG.ai,      ...raw.ai },
        rag:     { ...DEFAULT_CONFIG.rag,     ...raw.rag },
        profile: { ...DEFAULT_CONFIG.profile, ...raw.profile },
      };
    }
  } catch (e) { console.error('[admin] config read error:', e.message); }
  return { ...DEFAULT_CONFIG };
};

const writeConfig = (cfg) => fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));

const mask = (str) => str ? '•'.repeat(Math.min(str.length, 24)) : '';

/* ── Auth middleware ─────────────────────────────────────────── */
const adminAuth = (req, res, next) => {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'Unauthorized' });
  try { jwt.verify(auth.slice(7), ADMIN_SECRET); next(); }
  catch { res.status(401).json({ success: false, message: 'Invalid or expired token' }); }
};

/* ── Public endpoints ────────────────────────────────────────── */

// POST /api/admin/login
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  const uClean = (username || '').trim().toLowerCase();
  const pClean = (password || '').trim();
  const expectedU = ADMIN_USERNAME.trim().toLowerCase();
  const expectedP = ADMIN_PASSWORD.trim();

  console.log('[Admin Login Debug] Cleaned Sent:', { uClean, pClean });
  console.log('[Admin Login Debug] Cleaned Expected:', { expectedU, expectedP });

  if (uClean === expectedU && pClean === expectedP) {
    const token = jwt.sign({ role: 'admin', username: uClean }, ADMIN_SECRET, { expiresIn: '7d' });
    return res.json({ success: true, token });
  }
  res.status(401).json({ success: false, message: 'Invalid admin credentials' });
});

// GET /api/admin/mcps-public  — used by ChatSidebar (no auth needed)
router.get('/mcps-public', (_req, res) => {
  const cfg = readConfig();
  const safe = (cfg.mcps || []).map(({ id, name, desc, icon }) => ({ id, name, desc, icon }));
  res.json({ success: true, data: safe });
});

/* ── Protected endpoints ─────────────────────────────────────── */
router.use(adminAuth);

// GET /api/admin/config
router.get('/config', (_req, res) => {
  const cfg = readConfig();
  res.json({
    success: true,
    data: {
      ...cfg,
      ai:   { ...cfg.ai,   apiKey: mask(cfg.ai.apiKey) },
      mcps: cfg.mcps.map(m => ({ ...m, apiKey: mask(m.apiKey) })),
    }
  });
});

/* ── MCPs ─────────────────────────── */
router.get('/mcps', (_req, res) => {
  const cfg = readConfig();
  res.json({ success: true, data: cfg.mcps.map(m => ({ ...m, apiKey: mask(m.apiKey) })) });
});

router.post('/mcps', (req, res) => {
  const { name, desc = '', icon = '', apiKey = '', connectionString = '' } = req.body || {};
  if (!name) return res.status(400).json({ success: false, message: 'Name is required' });
  const cfg = readConfig();
  const id  = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
  cfg.mcps.push({ id, name, desc, icon, apiKey, connectionString });
  writeConfig(cfg);
  res.json({ success: true, data: cfg.mcps.map(m => ({ ...m, apiKey: mask(m.apiKey) })) });
});

router.put('/mcps/:id', (req, res) => {
  const cfg = readConfig();
  const idx = cfg.mcps.findIndex(m => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'MCP not found' });
  const upd = { ...cfg.mcps[idx], ...req.body };
  if (req.body.apiKey && req.body.apiKey.includes('•')) upd.apiKey = cfg.mcps[idx].apiKey; // keep original if masked
  cfg.mcps[idx] = upd;
  writeConfig(cfg);
  res.json({ success: true, data: { ...cfg.mcps[idx], apiKey: mask(cfg.mcps[idx].apiKey) } });
});

router.delete('/mcps/:id', (req, res) => {
  const cfg = readConfig();
  cfg.mcps = cfg.mcps.filter(m => m.id !== req.params.id);
  writeConfig(cfg);
  res.json({ success: true, data: cfg.mcps.map(m => ({ ...m, apiKey: mask(m.apiKey) })) });
});

/* ── AI ───────────────────────────── */
router.get('/ai', (_req, res) => {
  const cfg = readConfig();
  res.json({ success: true, data: { ...cfg.ai, apiKey: mask(cfg.ai.apiKey) } });
});

router.put('/ai', (req, res) => {
  const cfg = readConfig();
  const upd = { ...req.body };
  if (upd.apiKey && upd.apiKey.includes('•')) delete upd.apiKey;
  cfg.ai = { ...cfg.ai, ...upd };
  writeConfig(cfg);
  if (cfg.ai.apiKey) {
    if (cfg.ai.provider === 'gemini')    process.env.GEMINI_API_KEY    = cfg.ai.apiKey;
    if (cfg.ai.provider === 'openai')    process.env.OPENAI_API_KEY    = cfg.ai.apiKey;
    if (cfg.ai.provider === 'anthropic') process.env.ANTHROPIC_API_KEY = cfg.ai.apiKey;
  }
  res.json({ success: true, data: { ...cfg.ai, apiKey: mask(cfg.ai.apiKey) } });
});

/* ── RAG ──────────────────────────── */
router.get('/rag', (_req, res) => res.json({ success: true, data: readConfig().rag }));
router.put('/rag', (req, res) => {
  const cfg = readConfig(); cfg.rag = { ...cfg.rag, ...req.body };
  writeConfig(cfg); res.json({ success: true, data: cfg.rag });
});

/* ── Profile ──────────────────────── */
router.get('/profile', (_req, res) => res.json({ success: true, data: readConfig().profile }));
router.put('/profile', (req, res) => {
  const cfg = readConfig(); cfg.profile = { ...cfg.profile, ...req.body };
  writeConfig(cfg); res.json({ success: true, data: cfg.profile });
});

router.put('/change-password', (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (currentPassword !== (process.env.ADMIN_PASSWORD || 'Admin@123'))
    return res.status(400).json({ success: false, message: 'Current password is incorrect' });
  process.env.ADMIN_PASSWORD = newPassword;
  res.json({ success: true, message: 'Password updated (until server restart). Add ADMIN_PASSWORD to .env to persist.' });
});

module.exports = router;
