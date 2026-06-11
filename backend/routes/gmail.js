/**
 * gmail.js — Gmail API route for TOM.AI
 * Reads user's emails using their stored Google access token.
 * Requires Gmail API enabled in Google Cloud Console.
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';

/**
 * Fetch emails from Gmail API using user's access token.
 * Returns a list of emails with sender, subject, snippet, date.
 */
const fetchEmails = async (accessToken, query = '', maxResults = 10) => {
  // Step 1: List message IDs
  const listRes = await axios.get(`${GMAIL_API}/messages`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: { q: query, maxResults },
  });

  const messages = listRes.data.messages || [];
  if (messages.length === 0) return [];

  // Step 2: Fetch each message's details in parallel (limit to 8)
  const details = await Promise.all(
    messages.slice(0, 8).map(async ({ id }) => {
      try {
        const res = await axios.get(`${GMAIL_API}/messages/${id}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: { format: 'metadata', metadataHeaders: ['From', 'Subject', 'Date'] },
        });
        const headers = res.data.payload?.headers || [];
        const get = (name) => headers.find(h => h.name === name)?.value || '';
        return {
          id,
          from:    get('From'),
          subject: get('Subject'),
          date:    get('Date'),
          snippet: res.data.snippet || '',
        };
      } catch { return null; }
    })
  );

  return details.filter(Boolean);
};

/**
 * GET /api/gmail/emails?q=<search_query>&max=<count>
 * Returns emails matching the query from the authenticated user's Gmail.
 */
router.get('/emails', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('+googleToken +googleRefreshToken');

    if (!user?.googleToken || !user?.permissions?.gmail) {
      return res.status(403).json({
        success: false,
        message: 'Gmail not connected. Please connect Gmail in the sidebar to grant Gmail access.',
      });
    }

    const query = req.query.q || '';
    const maxResults = Math.min(parseInt(req.query.max) || 10, 20);

    let emails;
    try {
      emails = await fetchEmails(user.googleToken, query, maxResults);
    } catch (err) {
      // Token may be expired — try refresh if we have a refresh token
      if (err.response?.status === 401 && user.googleRefreshToken) {
        try {
          const refreshRes = await axios.post('https://oauth2.googleapis.com/token', {
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            refresh_token: user.googleRefreshToken,
            grant_type: 'refresh_token',
          });
          const newToken = refreshRes.data.access_token;
          user.googleToken = newToken;
          if (user.tokens) {
            user.tokens.gmail = newToken;
          }
          await user.save({ validateBeforeSave: false });
          emails = await fetchEmails(newToken, query, maxResults);
        } catch {
          return res.status(401).json({ success: false, message: 'Gmail access expired. Please log in with Google again.' });
        }
      } else {
        throw err;
      }
    }

    // Index fetched emails for RAG Search in the background
    if (emails && emails.length > 0) {
      try {
        const { indexEmail } = require('../services/ragService');
        emails.forEach((email) => {
          indexEmail(req.userId, email).catch((e) =>
            console.error('[RAG] Index email error:', e.message)
          );
        });
      } catch (e) {
        console.error('[RAG] Index email import error:', e);
      }
    }

    res.json({ success: true, data: { emails, query, count: emails.length } });
  } catch (err) {
    console.error('[Gmail] Error:', err.response?.data || err.message);
    res.status(500).json({
      success: false,
      message: err.response?.data?.error?.message || 'Failed to fetch Gmail. Make sure Gmail API is enabled.',
    });
  }
});

module.exports = router;
