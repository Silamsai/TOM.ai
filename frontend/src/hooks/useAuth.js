import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../services/api';
import { getToken, setToken, setUser, getUser, clearAll } from '../utils/storage';

/**
 * Custom hook for authentication state management.
 * Provides login, signup, logout helpers and auth state.
 */
const useAuth = () => {
  const navigate = useNavigate();
  const [token, setTokenState] = useState(getToken());
  const [user, setUserState] = useState(getUser());

  const isAuthenticated = !!token;

  /** Call after successful login or signup */
  const handleAuthSuccess = useCallback((tokenValue, userData) => {
    setToken(tokenValue);
    setUser(userData);
    setTokenState(tokenValue);
    setUserState(userData);
  }, []);

  /** Login flow */
  const loginUser = useCallback(
    async (email, password) => {
      const res = await api.login(email, password);
      const { token: t, user: u } = res.data.data;
      handleAuthSuccess(t, u);
      navigate('/chat');
      return res.data;
    },
    [handleAuthSuccess, navigate]
  );

  /** Signup flow (step 2 – verify OTP and create account) */
  const signupUser = useCallback(
    async (data) => {
      const res = await api.signupVerifyOTP(data);
      const { token: t, user: u } = res.data.data;
      handleAuthSuccess(t, u);
      navigate('/chat');
      return res.data;
    },
    [handleAuthSuccess, navigate]
  );

  /** Logout */
  const logoutUser = useCallback(() => {
    clearAll();
    setTokenState(null);
    setUserState(null);
    navigate('/login');
  }, [navigate]);

  return {
    token,
    user,
    isAuthenticated,
    loginUser,
    signupUser,
    logoutUser,
  };
};

export default useAuth;
