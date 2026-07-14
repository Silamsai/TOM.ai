const express = require('../config/expressCompat');
const router = express.Router();
const {
  getGoogleAuthUrl,
  getGmailAuthUrl,
  exchangeCodeForToken,
  getUserInfoFromGoogle,
} = require('../services/googleAuthService');
const User = require('../models/User');

// ============================================================
// GET /api/auth/google/url
// Returns the Google OAuth URL for basic sign-in (no sensitive scopes).
// ============================================================
router.get('/url', (_req, res) => {
  try {
    const authUrl = getGoogleAuthUrl();
    res.status(200).json({ success: true, authUrl });
  } catch (error) {
    console.error('[Google Auth] Failed to generate auth URL:', error.message);
    res.status(500).json({ success: false, message: 'Failed to generate Google auth URL.' });
  }
});

// ============================================================
// GET /api/auth/google/gmail-url
// Returns the OAuth URL for Gmail connection (includes gmail.readonly scope).
// ============================================================
router.get('/gmail-url', (_req, res) => {
  try {
    const authUrl = getGmailAuthUrl();
    res.status(200).json({ success: true, authUrl });
  } catch (error) {
    console.error('[Google Auth] Failed to generate Gmail auth URL:', error.message);
    res.status(500).json({ success: false, message: 'Failed to generate Gmail auth URL.' });
  }
});

// ============================================================
// POST /api/auth/google/callback
// Receives the authorization code from the frontend,
// exchanges it for tokens, fetches user info,
// creates or updates the user, returns a TOM.AI JWT.
// ============================================================
router.post('/callback', async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Authorization code is required.' });
    }

    // Determine the exact redirect URI based on the request's origin to prevent redirect_uri_mismatch
    const origin = req.headers.origin || 'http://localhost:3000';
    const redirectUri = `${origin}/auth/google/callback`;

    // 1. Exchange authorization code for Google tokens
    let tokenData;
    try {
      tokenData = await exchangeCodeForToken(code, redirectUri);
    } catch (err) {
      console.error('[Google Auth] Token exchange failed:', err.response?.data || err.message);
      const googleError = err.response?.data?.error_description || err.response?.data?.error || err.message;
      return res.status(400).json({
        success: false,
        message: `Failed to exchange Google authorization code. Google error: ${googleError}`,
      });
    }

    const { access_token, refresh_token } = tokenData;
    const grantedScopes = tokenData.scope || '';
    const hasGmailScope = grantedScopes.includes('gmail.readonly');

    // 2. Fetch user profile from Google
    let googleUser;
    try {
      googleUser = await getUserInfoFromGoogle(access_token);
    } catch (err) {
      console.error('[Google Auth] User info fetch failed:', err.response?.data || err.message);
      return res.status(400).json({ success: false, message: 'Failed to retrieve user info from Google.' });
    }

    const { id: googleId, email, name, picture, verified_email } = googleUser;

    if (!email) {
      return res.status(400).json({ success: false, message: 'No email address provided by Google.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 3. Check if user already exists (by Google ID first, then by email)
    let user = await User.findOne({ googleId });

    if (!user) {
      // Check if email account exists without Google linked
      user = await User.findOne({ email: normalizedEmail });

      if (user) {
        // Link Google account to existing email-based user
        user.googleId = googleId;
        user.googleToken = access_token;
        if (refresh_token) user.googleRefreshToken = refresh_token;
        if (picture && !user.picture) user.picture = picture;
        user.lastLoginMethod = 'google';
        user.lastLogin = new Date();

        if (hasGmailScope) {
          user.tokens = user.tokens || {};
          user.tokens.gmail = access_token;
          user.permissions = user.permissions || {};
          user.permissions.gmail = true;
        }

        await user.save({ validateBeforeSave: false });
      } else {
        // Create a brand-new user from Google data
        user = await User.create({
          email: normalizedEmail,
          name: name || email.split('@')[0],
          googleId,
          googleToken: access_token,
          googleRefreshToken: refresh_token || null,
          picture: picture || null,
          emailVerified: verified_email || false,
          signupMethod: 'google',
          lastLoginMethod: 'google',
          lastLogin: new Date(),
          tokens: hasGmailScope ? { gmail: access_token } : {},
          permissions: hasGmailScope ? { gmail: true } : {},
        });
      }
    } else {
      // User exists and already linked to Google — update tokens
      user.googleToken = access_token;
      if (refresh_token) user.googleRefreshToken = refresh_token;
      user.lastLoginMethod = 'google';
      user.lastLogin = new Date();
      if (picture) user.picture = picture;

      if (hasGmailScope) {
        user.tokens = user.tokens || {};
        user.tokens.gmail = access_token;
        user.permissions = user.permissions || {};
        user.permissions.gmail = true;
      }

      await user.save({ validateBeforeSave: false });
    }

    // 4. Generate TOM.AI JWT
    const token = user.generateJWT();

    res.status(200).json({
      success: true,
      message: 'Google login successful!',
      data: { token, user: user.toJSON() },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
