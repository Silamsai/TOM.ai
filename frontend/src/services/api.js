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

export const exchangeGoogleCode = (code) =>
  api.post('/auth/google/callback', { code });

// ============================================================
// CHAT
// ============================================================
export const sendChatMessage = (message, attachments = []) =>
  api.post('/chat/message', { message, attachments });

export const getChatHistory = () =>
  api.get('/chat/history');

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

export default api;
