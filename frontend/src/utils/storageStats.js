import { getAllSessions } from './chatSessions';

const APP_KEYS_PREFIX = 'tom_';

/** Estimate bytes used by tom.ai keys in localStorage */
export const getLocalStorageUsage = () => {
  if (typeof localStorage === 'undefined') return { bytes: 0, keys: [] };

  const keys = [];
  let bytes = 0;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || (!key.startsWith('tom_') && !key.startsWith('tom_ai'))) continue;
    const val = localStorage.getItem(key) || '';
    const size = (key.length + val.length) * 2;
    bytes += size;
    keys.push({ key, bytes: size });
  }

  keys.sort((a, b) => b.bytes - a.bytes);
  return { bytes, keys };
};

export const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export const getGuestSessionStats = () => {
  const sessions = getAllSessions();
  const messageCount = sessions.reduce((n, s) => n + (s.messages?.length || 0), 0);
  return { sessions: sessions.length, messages: messageCount };
};
