/**
 * tom.ai — Chat session management (localStorage)
 * Supports multiple chat sessions with auto-generated titles.
 */

const SESSIONS_KEY = 'tom_ai_sessions';
const CURRENT_KEY  = 'tom_ai_current_session';

const load = () => {
  try { return JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]'); }
  catch { return []; }
};
const save = (sessions) => localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));

export const getAllSessions  = () => [...load()].sort((a, b) => b.updatedAt - a.updatedAt);
export const getCurrentId    = () => localStorage.getItem(CURRENT_KEY);
export const setCurrentId    = (id) => localStorage.setItem(CURRENT_KEY, id);

export const getSession = (id) => load().find(s => s.id === id) || null;

export const createSession = () => {
  const id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const session = { id, title: 'New Chat', messages: [], createdAt: Date.now(), updatedAt: Date.now() };
  const sessions = load();
  sessions.push(session);
  save(sessions);
  setCurrentId(id);
  return session;
};

export const updateSessionTitle = (id, firstUserMessage) => {
  const title = firstUserMessage.length > 40
    ? firstUserMessage.slice(0, 40).trim() + '…'
    : firstUserMessage.trim();
  const sessions = load().map(s => s.id === id ? { ...s, title } : s);
  save(sessions);
};

export const renameSession = (id, newTitle) => {
  const sessions = load().map(s => s.id === id ? { ...s, title: newTitle } : s);
  save(sessions);
};

export const addMessage = (id, message) => {
  const sessions = load().map(s => {
    if (s.id !== id) return s;
    const messages = [...s.messages, message];
    return { ...s, messages, updatedAt: Date.now() };
  });
  save(sessions);
};

export const deleteSession = (id) => {
  const sessions = load().filter(s => s.id !== id);
  save(sessions);
  if (getCurrentId() === id) localStorage.removeItem(CURRENT_KEY);
};

export const clearAllSessions = () => {
  localStorage.removeItem(SESSIONS_KEY);
  localStorage.removeItem(CURRENT_KEY);
};

/** Get or create the current active session */
export const getOrCreateCurrentSession = () => {
  const currentId = getCurrentId();
  if (currentId) {
    const session = getSession(currentId);
    if (session) return session;
  }
  return createSession();
};
