/** Keys used in localStorage */
const TOKEN_KEY        = 'tom_ai_token';
const USER_KEY         = 'tom_ai_user';
const GUEST_PROFILE_KEY = 'tom_ai_guest';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export const getUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
export const setUser = (user) => localStorage.setItem(USER_KEY, JSON.stringify(user));
export const clearUser = () => localStorage.removeItem(USER_KEY);

export const clearAll = () => {
  clearToken();
  clearUser();
};

// Guest profile (name / age / gender — no auth required)
export const getGuestProfile = () => {
  try {
    const raw = localStorage.getItem(GUEST_PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};
export const setGuestProfile = (profile) =>
  localStorage.setItem(GUEST_PROFILE_KEY, JSON.stringify(profile));
export const clearGuestProfile = () => localStorage.removeItem(GUEST_PROFILE_KEY);

const THEME_KEY = 'tom_theme';
const NOTIF_KEY = 'tom_notifications_enabled';

export const getTheme = () => localStorage.getItem(THEME_KEY) || 'dark';
export const setTheme = (theme) => localStorage.setItem(THEME_KEY, theme);

export const getNotificationsPref = () => localStorage.getItem(NOTIF_KEY) === 'true';
export const setNotificationsPref = (on) =>
  localStorage.setItem(NOTIF_KEY, on ? 'true' : 'false');

/** Clear app local data (keeps auth token/user unless includeAuth) */
export const clearLocalAppData = ({ includeAuth = false } = {}) => {
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (key.startsWith('tom_') || key.startsWith('tom_ai')) {
      if (!includeAuth && (key === TOKEN_KEY || key === USER_KEY)) continue;
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
  return keysToRemove.length;
};
