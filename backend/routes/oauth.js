const express = require('../config/expressCompat');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

/**
 * NOTE: Full Google OAuth requires a Google Cloud Project with OAuth credentials.
 * Set these in your .env:
 *   GOOGLE_CLIENT_ID=xxx
 *   GOOGLE_CLIENT_SECRET=xxx
 *   GOOGLE_REDIRECT_URI=http://localhost:5000/api/oauth/google/callback
 */

// ============================================================
// GET /api/oauth/google/auth
// Generates the Google OAuth authorization URL
// ============================================================
router.get('/google/auth', authMiddleware, (req, res) => {
  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/tasks',
  ].join(' ');

  const authUrl =
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${process.env.GOOGLE_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(process.env.GOOGLE_REDIRECT_URI || '')}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&access_type=offline` +
    `&prompt=consent` +
    `&state=${req.userId}`;

  res.status(200).json({ success: true, data: { authUrl } });
});

// ============================================================
// GET /api/oauth/google/callback
// Exchanges authorization code for access token
// ============================================================
router.get('/google/callback', authMiddleware, async (req, res, next) => {
  try {
    const { code, state: userId } = req.query;
    if (!code) return res.status(400).json({ success: false, message: 'Authorization code missing.' });

    // Exchange code for tokens via Google Token endpoint
    const axios = require('axios');
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    });

    const { access_token, refresh_token } = tokenResponse.data;

    // Store tokens in user document
    await User.findByIdAndUpdate(userId, {
      'tokens.gmail': access_token,
      'tokens.calendar': access_token,
      'tokens.tasks': access_token,
      'permissions.gmail': true,
      'permissions.calendar': true,
      'permissions.tasks': true,
    });

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

module.exports = router;
