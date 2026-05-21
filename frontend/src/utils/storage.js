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
