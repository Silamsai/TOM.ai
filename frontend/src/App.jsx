import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { getToken } from './utils/storage';
import { FEATURES } from './config/assets';
import Welcome from './pages/Welcome';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import Chat from './pages/Chat';
import TodoList from './pages/TodoList';
import GoogleCallback from './pages/GoogleCallback';
import AdminPanel from './pages/AdminPanel';
import Settings from './pages/Settings';
import ImageGen from './pages/ImageGen';
import Mascot from './components/Mascot';
import './index.css';

const ProtectedRoute = ({ children }) => {
  const token = getToken();
  return token ? children : <Navigate to="/login" replace />;
};

const AuthLayout = ({ children }) => (
  <>
    {children}
    <Mascot />
  </>
);

const pageMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

const AnimatedRoutes = () => {
  const location = useLocation();
  const reduced = FEATURES.prefersReducedMotion();

  const routes = (
    <Routes location={location}>
      <Route path="/" element={<Welcome />} />
      <Route path="/chat" element={<Chat />} />
      <Route path="/todos" element={<ProtectedRoute><TodoList /></ProtectedRoute>} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/login" element={<AuthLayout><Login /></AuthLayout>} />
      <Route path="/signup" element={<AuthLayout><Signup /></AuthLayout>} />
      <Route path="/forgot-password" element={<AuthLayout><ForgotPassword /></AuthLayout>} />
      <Route path="/auth/google/callback" element={<GoogleCallback />} />
      <Route path="/admin" element={<AdminPanel />} />
      <Route path="/image-gen" element={<ImageGen />} />
      <Route
        path="*"
        element={
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', minHeight: '100vh', gap: '16px',
            color: 'var(--text-dim)', fontFamily: 'var(--font-sans)',
            background: 'var(--black)',
          }}>
            <img src="/images/logo.png" alt="tom.ai" width="72" height="72" style={{ borderRadius: '16px', objectFit: 'contain' }} />
            <h1 style={{ color: 'var(--white)' }}>404 — Page Not Found</h1>
            <a href="/chat" style={{ color: 'var(--grey-200)' }}>Go to Chat →</a>
          </div>
        }
      />
    </Routes>
  );

  if (reduced) return routes;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={pageMotion}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        style={{ minHeight: '100vh', width: '100%' }}
      >
        {routes}
      </motion.div>
    </AnimatePresence>
  );
};

const App = () => (
  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <AnimatedRoutes />
  </BrowserRouter>
);

export default App;
