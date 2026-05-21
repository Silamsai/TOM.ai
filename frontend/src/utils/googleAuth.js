/**
 * googleAuth.js
 * Builds the Google OAuth URL directly in the frontend.
 * No backend call required — avoids failures if backend is down.
 */

export const redirectToGoogle = () => {
  const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
  const redirectUri =
    process.env.REACT_APP_GOOGLE_REDIRECT_URI ||
    `${window.location.origin}/auth/google/callback`;

  if (!clientId || clientId === 'your_google_client_id_here') {
    throw new Error('GOOGLE_NOT_CONFIGURED');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid profile email',
    access_type: 'offline',
    prompt: 'select_account',
  });

  window.location.href =
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};
