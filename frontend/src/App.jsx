import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getToken } from './utils/storage';
import Welcome from './pages/Welcome';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import Chat from './pages/Chat';
import TodoList from './pages/TodoList';
import GoogleCallback from './pages/GoogleCallback';
import AdminPanel from './pages/AdminPanel';
import Mascot from './components/Mascot';
import './index.css';

/** Protected route: redirects to /login if unauthenticated */
const ProtectedRoute = ({ children }) => {
  const token = getToken();
  return token ? children : <Navigate to="/login" replace />;
};

/** Layout that wraps auth pages — includes the mascot */
const AuthLayout = ({ children }) => (
  <>
    {children}
    <Mascot />
  </>
);

const App = () => (
  <BrowserRouter>
    <Routes>
      {/* Root: landing page — if already logged in go to chat */}
      <Route
        path="/"
        element={<Welcome />}
      />

      {/* Main chat — accessible to guests too */}
      <Route path="/chat" element={<Chat />} />

      {/* Protected pages */}
      <Route path="/todos" element={<ProtectedRoute><TodoList /></ProtectedRoute>} />

      {/* Auth pages (kept for direct-link access) */}
      <Route path="/login"           element={<AuthLayout><Login /></AuthLayout>} />
      <Route path="/signup"          element={<AuthLayout><Signup /></AuthLayout>} />
      <Route path="/forgot-password" element={<AuthLayout><ForgotPassword /></AuthLayout>} />
      <Route path="/auth/google/callback" element={<GoogleCallback />} />
      <Route path="/admin"           element={<AdminPanel />} />

      {/* 404 */}
      <Route
        path="*"
        element={
          <div style={{
            display:'flex', flexDirection:'column', alignItems:'center',
            justifyContent:'center', minHeight:'100vh', gap:'16px',
            color:'var(--text-dim)', fontFamily:'var(--font-sans)',
            background:'var(--black)',
          }}>
            <img src="/images/logo.png" alt="tom.ai" width="72" height="72" style={{borderRadius:'16px',objectFit:'contain'}} />
            <h1 style={{ color:'var(--white)' }}>404 — Page Not Found</h1>
            <a href="/chat" style={{ color:'var(--grey-200)' }}>Go to Chat →</a>
          </div>
        }
      />
    </Routes>
  </BrowserRouter>
);

export default App;
