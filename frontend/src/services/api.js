import axios from 'axios';
import { getToken, clearAll } from '../utils/storage';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

console.log('[TOM.AI] API URL:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

// ---- Request interceptor: attach JWT --------------------------------
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ---- Response interceptor: handle 401 ------------------------------
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAll();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ============================================================
// AUTH
// ============================================================
export const signupSendOTP = (email) =>
  api.post('/auth/signup-send-otp', { email });

export const signupVerifyOTP = (data) =>
  api.post('/auth/signup-verify-otp', data);

export const login = (email, password) =>
  api.post('/auth/login', { email, password });

export const forgotPassword = (email) =>
  api.post('/auth/forgot-password', { email });

export const verifyResetOTP = (email, otp) =>
  api.post('/auth/verify-reset-otp', { email, otp });

export const resetPassword = (email, otp, newPassword) =>
  api.post('/auth/reset-password', { email, otp, newPassword });

export const logout = () => clearAll();

// ============================================================
// GOOGLE OAUTH
// ============================================================
export const getGoogleAuthUrl = () =>
  api.get('/auth/google/url');

export const getGmailAuthUrl = () =>
  api.get('/auth/google/gmail-url');

export const exchangeGoogleCode = (code) =>
  api.post('/auth/google/callback', { code });

// ============================================================
// CHAT
// ============================================================
export const sendChatMessage = (message, attachments = [], conversationId = null, model = 'gemini-2.5-flash', mode = 'standard') =>
  api.post('/chat/message', { message, attachments, conversationId, model, mode });

export const getChatHistory = (conversationId = null) =>
  api.get('/chat/history', { params: { conversationId } });

export const deleteChatConversation = (conversationId) =>
  api.delete(`/chat/conversation/${conversationId}`);

// ============================================================
// TASKS
// ============================================================
export const createTask = (data) =>
  api.post('/tasks/create', data);

export const getTasks = (params = {}) =>
  api.get('/tasks/list', { params });

export const getTask = (id) =>
  api.get(`/tasks/${id}`);

export const updateTask = (id, data) =>
  api.put(`/tasks/update/${id}`, data);

export const completeTask = (id) =>
  api.put(`/tasks/complete/${id}`);

export const deleteTask = (id) =>
  api.delete(`/tasks/delete/${id}`);

// ============================================================
// REMINDERS
// ============================================================
export const createReminder = (data) =>
  api.post('/reminders/create', data);

export const getReminders = () =>
  api.get('/reminders/list');

export const deleteReminder = (id) =>
  api.delete(`/reminders/delete/${id}`);

// ============================================================
// GMAIL
// ============================================================
export const fetchGmailEmails = (query = '', max = 10) =>
  api.get('/gmail/emails', { params: { q: query, max } });

// ============================================================
// ADMIN / MCP
// ============================================================
export const getPublicMcps = () =>
  api.get('/admin/mcps-public');

// ============================================================
// USER / SETTINGS
// ============================================================
export const getCurrentUser = () => api.get('/user/me');

export const updateProfile = (data) => api.patch('/user/profile', data);

export const getUserAccess = () => api.get('/user/access');

export const getUserStorage = () => api.get('/user/storage');

export const clearServerChatHistory = () => api.delete('/user/chat-history');

export const revokeGmailAccess = () => api.post('/oauth/revoke/gmail');

export const revokeCalendarAccess = () => api.post('/oauth/revoke/calendar');

// ============================================================
// RAG — Personal Knowledge Base
// ============================================================

/**
 * Upload a document (PDF, TXT, MD) to the user's personal RAG pipeline.
 * formData must have a field called 'file'.
 */
export const uploadRagDocument = (formData) =>
  api.post('/rag/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000, // 2 min — indexing takes time for large docs
  });

/** List all documents the user has uploaded to their knowledge base. */
export const getRagDocuments = () => api.get('/rag/documents');

/** Delete a document and all its indexed vector chunks. */
export const deleteRagDocument = (id) => api.delete(`/rag/documents/${id}`);

export default api;
