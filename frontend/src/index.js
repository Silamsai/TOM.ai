import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

console.log('[TOM.AI] API →', process.env.REACT_APP_API_URL);

// ── Global click ripple effect ──────────────────────────────────────────────
document.addEventListener('click', (e) => {
  const ripple = document.createElement('div');
  ripple.className = 'ripple-effect';

  const size = 80;
  ripple.style.cssText = `
    width:${size}px;
    height:${size}px;
    left:${e.clientX - size / 2}px;
    top:${e.clientY - size / 2}px;
  `;

  document.body.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove());
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
