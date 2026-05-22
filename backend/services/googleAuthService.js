/**
 * googleAuthService.js
 * Handles all Google OAuth 2.0 operations for TOM.AI.
 */

const axios = require('axios');

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

/**
 * The redirect_uri MUST be identical in both:
 *  1. The initial authorization URL (sent to Google)
 *  2. The code exchange request (sent from backend to Google)
 * We use the FRONTEND callback URL since GoogleCallback.jsx handles the redirect.
 */
const REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback';

/**
 * Build the Google OAuth authorization URL.
 * The frontend redirects the user to this URL.
 * @returns {string} full authorization URL
 */
const getGoogleAuthUrl = () => {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: [
      'openid profile email',
      'https://www.googleapis.com/auth/gmail.readonly',  // Read Gmail
    ].join(' '),
    access_type: 'offline',    // request refresh_token
    prompt: 'select_account',  // always show account chooser
    state: Math.random().toString(36).substring(2), // basic CSRF token
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

/**
 * Exchange an authorization code for Google tokens.
 * @param {string} code - Authorization code received from Google callback
 * @returns {Promise<{ access_token, refresh_token, id_token }>}
 */
const exchangeCodeForToken = async (code, customRedirectUri) => {
  const redirectUri = customRedirectUri || REDIRECT_URI;
  const response = await axios.post(GOOGLE_TOKEN_URL, {
    code,
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });
  return response.data;
};

/**
 * Get user profile info from Google using an access token.
 * @param {string} accessToken - Google access token
 * @returns {Promise<{ id, email, name, picture, verified_email }>}
 */
const getUserInfoFromGoogle = async (accessToken) => {
  const response = await axios.get(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.data;
};

module.exports = { getGoogleAuthUrl, exchangeCodeForToken, getUserInfoFromGoogle };
