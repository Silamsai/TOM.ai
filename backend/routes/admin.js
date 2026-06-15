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

// All known providers catalogue — never changes
const ALL_PROVIDERS = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    icon: '✨',
    color: '#38bdf8',
    models: [
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', shortName: 'Flash 2.5', desc: 'Fast, responsive & multimodal', icon: '⚡' },
      { id: 'gemini-2.5-pro',   name: 'Gemini 2.5 Pro',   shortName: 'Pro 2.5',   desc: 'Advanced reasoning & complex coding', icon: '🧠' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', shortName: 'Flash 1.5', desc: 'Stable & reliable Gemini 1.5', icon: '⚡' },
      { id: 'gemini-1.5-pro',   name: 'Gemini 1.5 Pro',   shortName: 'Pro 1.5',   desc: 'Gemini 1.5 Pro power', icon: '🧠' },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    icon: '🤖',
    color: '#10b981',
    models: [
      { id: 'gpt-4o',      name: 'GPT-4o',      shortName: 'GPT-4o',      desc: 'OpenAI flagship language & vision model', icon: '🤖' },
      { id: 'gpt-4o-mini', name: 'GPT-4o mini', shortName: 'GPT-4o mini', desc: 'Fast, lightweight & highly capable',       icon: '🔹' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', shortName: 'GPT-3.5', desc: 'Quick & cost-efficient',                  icon: '⚡' },
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    icon: '✍️',
    color: '#f59e0b',
    models: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', shortName: 'Sonnet 3.5', desc: 'Anthropic state-of-the-art precision & writing', icon: '✍️' },
      { id: 'claude-3-haiku-20240307',    name: 'Claude 3 Haiku',   shortName: 'Haiku 3',    desc: 'Fast & cost-efficient Claude',                  icon: '🎍' },
    ],
  },
];

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
    model: 'gemini-2.5-flash',
    // apiKeys: { providerId: 'actual-key' } — only providers with a key here are active
    apiKeys: {},
  },
  rag: { enabled: false, source: '', chunkSize: 1000, overlap: 200 },
  profile: { adminName: 'Admin', adminEmail: '', appName: 'TOM.AI' },
};

let configCache = null;

const readConfig = () => {
  if (configCache) return configCache;
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
      // Migrate legacy single apiKey to new apiKeys map
      let aiMerged = { ...DEFAULT_CONFIG.ai, ...raw.ai };
      if (!aiMerged.apiKeys) aiMerged.apiKeys = {};
      if (raw.ai && raw.ai.apiKey && !aiMerged.apiKeys[aiMerged.provider]) {
        aiMerged.apiKeys[aiMerged.provider] = raw.ai.apiKey;
      }
      
      let modified = false;
      if (raw.ai && raw.ai.hasOwnProperty('apiKey')) {
        delete aiMerged.apiKey;
        modified = true;
      }
      
      // Seed from process.env if not configured in JSON yet
      if (!aiMerged.apiKeys.gemini && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
        aiMerged.apiKeys.gemini = process.env.GEMINI_API_KEY;
        modified = true;
      }
      
      configCache = {
        ...DEFAULT_CONFIG, ...raw,
        ai:      aiMerged,
        rag:     { ...DEFAULT_CONFIG.rag,     ...raw.rag },
        profile: { ...DEFAULT_CONFIG.profile, ...raw.profile },
      };
      
      if (modified) {
        writeConfig(configCache);
      }
      return configCache;
    }
  } catch (e) { console.error('[admin] config read error:', e.message); }
  
  // If config doesn't exist, build from DEFAULT_CONFIG and seed gemini if available
  let aiMerged = { ...DEFAULT_CONFIG.ai };
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
    aiMerged.apiKeys = { gemini: process.env.GEMINI_API_KEY };
  }
  configCache = { ...DEFAULT_CONFIG, ai: aiMerged };
  // Save it immediately so file is created
  try {
    writeConfig(configCache);
  } catch (e) { console.error('[admin] config write error on startup:', e.message); }
  return configCache;
};

const writeConfig = (cfg) => {
  configCache = cfg;
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
};

// Helper to apply all stored API keys to process.env
const applyApiKeysToEnv = (ai) => {
  const keys = ai.apiKeys || {};
  if (keys.gemini)    process.env.GEMINI_API_KEY    = keys.gemini;    else delete process.env.GEMINI_API_KEY;
  if (keys.openai)    process.env.OPENAI_API_KEY    = keys.openai;    else delete process.env.OPENAI_API_KEY;
  if (keys.anthropic) process.env.ANTHROPIC_API_KEY = keys.anthropic; else delete process.env.ANTHROPIC_API_KEY;
};

// Load config on startup to apply saved API keys to process.env immediately
try {
  const bootCfg = readConfig();
  applyApiKeysToEnv(bootCfg.ai);
  const keyCount = Object.keys(bootCfg.ai.apiKeys || {}).length;
  console.log(`🔑 [TOM.AI Admin] Loaded ${keyCount} AI provider key(s) from config.`);
} catch (bootErr) {
  console.error('⚠️ [TOM.AI Admin] Failed to boot-load API keys:', bootErr.message);
}

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

// GET /api/admin/ai-models-public — returns only providers that have a configured API key
// Used by the Chat page to populate the model dropdown dynamically
router.get('/ai-models-public', (_req, res) => {
  const cfg = readConfig();
  const keys = cfg.ai.apiKeys || {};
  // Only return providers that have an API key set
  const available = ALL_PROVIDERS
    .filter(p => !!keys[p.id])
    .map(p => ({ id: p.id, name: p.name, icon: p.icon, color: p.color, models: p.models }));
  res.json({ success: true, data: available, activeProvider: cfg.ai.provider, activeModel: cfg.ai.model });
});

// GET /api/admin/ai-providers-catalogue — full catalogue for admin UI (no auth needed for list)
router.get('/ai-providers-catalogue', (_req, res) => {
  res.json({ success: true, data: ALL_PROVIDERS });
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
  // Mask all stored keys before sending to client
  const maskedKeys = {};
  Object.entries(cfg.ai.apiKeys || {}).forEach(([k, v]) => { maskedKeys[k] = mask(v); });
  res.json({ success: true, data: { ...cfg.ai, apiKeys: maskedKeys, allProviders: ALL_PROVIDERS } });
});

// PUT /api/admin/ai — update active provider/model
router.put('/ai', (req, res) => {
  const cfg = readConfig();
  const { provider, model } = req.body || {};
  if (provider) cfg.ai.provider = provider;
  if (model)    cfg.ai.model    = model;
  writeConfig(cfg);
  const maskedKeys = {};
  Object.entries(cfg.ai.apiKeys || {}).forEach(([k, v]) => { maskedKeys[k] = mask(v); });
  res.json({ success: true, data: { ...cfg.ai, apiKeys: maskedKeys, allProviders: ALL_PROVIDERS } });
});

// POST /api/admin/ai/keys — add or update a provider API key
router.post('/ai/keys', (req, res) => {
  const { providerId, apiKey, model } = req.body || {};
  if (!providerId) return res.status(400).json({ success: false, message: 'providerId is required' });
  if (!apiKey || apiKey.includes('•')) return res.status(400).json({ success: false, message: 'A valid API key is required' });
  const provider = ALL_PROVIDERS.find(p => p.id === providerId);
  if (!provider) return res.status(400).json({ success: false, message: 'Unknown provider' });
  const cfg = readConfig();
  if (!cfg.ai.apiKeys) cfg.ai.apiKeys = {};
  cfg.ai.apiKeys[providerId] = apiKey;
  // If a default model is provided, use it; otherwise use the first model of the provider
  if (model) cfg.ai.model = model;
  if (!cfg.ai.model && provider.models.length) cfg.ai.model = provider.models[0].id;
  writeConfig(cfg);
  applyApiKeysToEnv(cfg.ai);
  const maskedKeys = {};
  Object.entries(cfg.ai.apiKeys).forEach(([k, v]) => { maskedKeys[k] = mask(v); });
  res.json({ success: true, data: { ...cfg.ai, apiKeys: maskedKeys, allProviders: ALL_PROVIDERS } });
});

// DELETE /api/admin/ai/keys/:providerId — remove a provider API key
router.delete('/ai/keys/:providerId', (req, res) => {
  const { providerId } = req.params;
  const cfg = readConfig();
  if (cfg.ai.apiKeys) delete cfg.ai.apiKeys[providerId];
  // If the active provider was removed, fall back to the first provider that still has a key
  if (cfg.ai.provider === providerId) {
    const remaining = Object.keys(cfg.ai.apiKeys || {});
    cfg.ai.provider = remaining[0] || 'gemini';
    const fallbackProvider = ALL_PROVIDERS.find(p => p.id === cfg.ai.provider);
    cfg.ai.model = fallbackProvider?.models[0]?.id || 'gemini-2.5-flash';
  }
  writeConfig(cfg);
  const maskedKeys = {};
  Object.entries(cfg.ai.apiKeys || {}).forEach(([k, v]) => { maskedKeys[k] = mask(v); });
  res.json({ success: true, data: { ...cfg.ai, apiKeys: maskedKeys, allProviders: ALL_PROVIDERS } });
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
