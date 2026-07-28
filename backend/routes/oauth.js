const express = require('../config/expressCompat');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const axios = require('axios');

/**
 * Google OAuth Integration Routes for TOM.AI
 * Handles connecting Google services (Gmail, Calendar, Tasks) to user accounts.
 *
 * Required .env variables:
 *   GOOGLE_CLIENT_ID=xxx
 *   GOOGLE_CLIENT_SECRET=xxx
 *   GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
 */

const GOOGLE_SCOPES = {
  gmail: 'https://www.googleapis.com/auth/gmail.readonly',
  calendar: 'https://www.googleapis.com/auth/calendar',
  tasks: 'https://www.googleapis.com/auth/tasks',
};

const DEFAULT_REDIRECT_URI = 'http://localhost:3000/auth/google/callback';
const isValidRedirectUri = (value) => /^https?:\/\/.+/i.test(value || '');
const resolveConnectRedirectUri = (overrideUri) => {
  if (isValidRedirectUri(overrideUri)) return overrideUri;
  if (isValidRedirectUri(process.env.GOOGLE_CONNECT_REDIRECT_URI)) return process.env.GOOGLE_CONNECT_REDIRECT_URI;
  if (isValidRedirectUri(process.env.GOOGLE_REDIRECT_URI)) return process.env.GOOGLE_REDIRECT_URI;
  return DEFAULT_REDIRECT_URI;
};

// ============================================================
// GET /api/oauth/google/connect-url
// Generates a Google OAuth URL for connecting Google services.
// This is SEPARATE from the sign-in flow — it requests sensitive
// scopes (Gmail, Calendar, Tasks) for the logged-in user.
// ============================================================
router.get('/google/connect-url', authMiddleware, (req, res) => {
  try {
    const scopes = [
      'openid profile email',
      GOOGLE_SCOPES.gmail,
      GOOGLE_SCOPES.calendar,
      GOOGLE_SCOPES.tasks,
    ].join(' ');

    const redirectUri = resolveConnectRedirectUri(req.query?.redirectUri);

    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes,
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
      state: `connect_${req.userId}`,
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    res.status(200).json({ success: true, data: { authUrl } });
  } catch (error) {
    console.error('[OAuth] Failed to generate connect URL:', error.message);
    res.status(500).json({ success: false, message: 'Failed to generate Google connect URL.' });
  }
});

// ============================================================
// POST /api/oauth/google/connect-callback
// Exchanges authorization code for tokens and stores them
// on the authenticated user's profile.
// ============================================================
router.post('/google/connect-callback', authMiddleware, async (req, res, next) => {
  try {
    const { code, redirectUri: redirectUriOverride } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Authorization code missing.' });
    }

    // Must match the redirect_uri used in connect-url
    const redirectUri = resolveConnectRedirectUri(redirectUriOverride);

    // Exchange code for tokens
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });

    const { access_token, refresh_token, scope: grantedScopes } = tokenResponse.data;
    const scopeStr = grantedScopes || '';

    // Determine which scopes were actually granted
    const hasGmail = scopeStr.includes('gmail');
    const hasCalendar = scopeStr.includes('calendar');
    const hasTasks = scopeStr.includes('tasks');

    // Build update object
    const update = {
      googleToken: access_token,
    };
    if (refresh_token) {
      update.googleRefreshToken = refresh_token;
    }

    // Set tokens and permissions based on granted scopes
    if (hasGmail) {
      update['tokens.gmail'] = access_token;
      update['permissions.gmail'] = true;
    }
    if (hasCalendar) {
      update['tokens.calendar'] = access_token;
      update['permissions.calendar'] = true;
    }
    if (hasTasks) {
      update['tokens.tasks'] = access_token;
      update['permissions.tasks'] = true;
    }

    await User.findByIdAndUpdate(req.userId, update);

    // Fetch updated user to return current integrations state
    const user = await User.findById(req.userId).select('permissions tokens');

    res.status(200).json({
      success: true,
      message: 'Google services connected successfully.',
      data: {
        integrations: {
          gmail: { connected: !!user.permissions?.gmail },
          calendar: { connected: !!user.permissions?.calendar },
          tasks: { connected: !!user.permissions?.tasks },
        },
      },
    });
  } catch (error) {
    console.error('[OAuth] Connect callback error:', error.response?.data || error.message);
    const googleError = error.response?.data?.error_description || error.response?.data?.error || error.message;
    res.status(400).json({
      success: false,
      message: `Failed to connect Google services. ${googleError}`,
    });
  }
});

// ============================================================
// GET /api/oauth/google/auth  (legacy, kept for compatibility)
// ============================================================
router.get('/google/auth', authMiddleware, (req, res) => {
  const scopes = [
    GOOGLE_SCOPES.gmail,
    GOOGLE_SCOPES.calendar,
    GOOGLE_SCOPES.tasks,
  ].join(' ');

  const authUrl =
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${process.env.GOOGLE_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(resolveConnectRedirectUri(req.query?.redirectUri))}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&access_type=offline` +
    `&prompt=consent` +
    `&state=${req.userId}`;

  res.status(200).json({ success: true, data: { authUrl } });
});

// ============================================================
// GET /api/oauth/google/callback (legacy)
// ============================================================
router.get('/google/callback', authMiddleware, async (req, res, next) => {
  try {
    const { code, state: userId } = req.query;
    if (!code) return res.status(400).json({ success: false, message: 'Authorization code missing.' });

    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: resolveConnectRedirectUri(req.query?.redirectUri),
      grant_type: 'authorization_code',
    });

    const { access_token, refresh_token } = tokenResponse.data;

    const update = {
      googleToken: access_token,
      'tokens.gmail': access_token,
      'tokens.calendar': access_token,
      'tokens.tasks': access_token,
      'permissions.gmail': true,
      'permissions.calendar': true,
      'permissions.tasks': true,
    };
    if (refresh_token) update.googleRefreshToken = refresh_token;

    await User.findByIdAndUpdate(userId, update);

    res.status(200).json({ success: true, message: 'Google account connected successfully.' });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// POST /api/oauth/revoke/gmail
// ============================================================
router.post('/revoke/gmail', authMiddleware, async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.userId, {
      'tokens.gmail': null,
      'permissions.gmail': false,
    });
    res.status(200).json({ success: true, message: 'Gmail access revoked.' });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// POST /api/oauth/revoke/calendar
// ============================================================
router.post('/revoke/calendar', authMiddleware, async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.userId, {
      'tokens.calendar': null,
      'permissions.calendar': false,
    });
    res.status(200).json({ success: true, message: 'Calendar access revoked.' });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// POST /api/oauth/revoke/tasks
// ============================================================
router.post('/revoke/tasks', authMiddleware, async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.userId, {
      'tokens.tasks': null,
      'permissions.tasks': false,
    });
    res.status(200).json({ success: true, message: 'Tasks access revoked.' });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// POST /api/oauth/revoke/all-google
// Revokes all Google integrations at once
// ============================================================
router.post('/revoke/all-google', authMiddleware, async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.userId, {
      'tokens.gmail': null,
      'tokens.calendar': null,
      'tokens.tasks': null,
      'permissions.gmail': false,
      'permissions.calendar': false,
      'permissions.tasks': false,
    });
    res.status(200).json({ success: true, message: 'All Google integrations disconnected.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
