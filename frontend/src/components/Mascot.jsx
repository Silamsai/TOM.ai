import React, { useState, useEffect } from 'react';
import '../styles/components.css';

/**
 * Mascot — an animated robot cat that runs across the bottom of the screen
 * and watches the user's cursor with its eyes.
 */
const Mascot = () => {
  const [pupil, setPupil] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      // Calculate pupil offset based on cursor position relative to screen center
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const angle = Math.atan2(e.clientY - cy, e.clientX - cx);
      const dist = 2.8;
      setPupil({
        x: +(Math.cos(angle) * dist).toFixed(2),
        y: +(Math.sin(angle) * dist).toFixed(2),
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const px = pupil.x;
  const py = pupil.y;

  return (
    <div className="mascot-wrapper" aria-hidden="true">
      <div className="mascot-runner">
        <svg
          width="88"
          height="106"
          viewBox="0 0 88 106"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* ── Tail ─────────────────────────────────────── */}
          <path
            className="mascot-tail"
            d="M 56 78 C 72 72 80 58 74 44 C 70 36 62 34 60 40"
            stroke="#2a2a2a"
            strokeWidth="7"
            strokeLinecap="round"
            fill="none"
          />
          <path
            className="mascot-tail"
            d="M 56 78 C 72 72 80 58 74 44"
            stroke="#3d3d3d"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />

          {/* ── Body ─────────────────────────────────────── */}
          <ellipse cx="44" cy="76" rx="22" ry="16" fill="#1c1c1c" />
          <ellipse cx="44" cy="76" rx="22" ry="16" fill="url(#bodyGrad)" />

          {/* Body detail — panel lines */}
          <ellipse cx="44" cy="76" rx="10" ry="7" fill="#242424" />
          <circle cx="44" cy="76" r="3.5" fill="#2e2e2e" />
          <circle cx="44" cy="76" r="1.8" fill="#3d3d3d" />

          {/* ── Neck ─────────────────────────────────────── */}
          <rect x="38" y="58" width="12" height="8" rx="4" fill="#1c1c1c" />

          {/* ── Head ─────────────────────────────────────── */}
          <ellipse cx="44" cy="42" rx="24" ry="22" fill="#222222" />
          <ellipse cx="44" cy="42" rx="24" ry="22" fill="url(#headGrad)" />

          {/* ── Ears ─────────────────────────────────────── */}
          {/* Left ear */}
          <path d="M 24 26 L 16 5 L 34 18 Z" fill="#1c1c1c" />
          <path d="M 24 24 L 19 9 L 31 18 Z" fill="#2e2e2e" />
          {/* Right ear */}
          <path d="M 64 26 L 72 5 L 54 18 Z" fill="#1c1c1c" />
          <path d="M 64 24 L 69 9 L 57 18 Z" fill="#2e2e2e" />

          {/* ── Eyes — white sclera ───────────────────────── */}
          <circle cx="33" cy="40" r="9.5" fill="white" />
          <circle cx="55" cy="40" r="9.5" fill="white" />

          {/* Eye inner ring */}
          <circle cx="33" cy="40" r="9.5" fill="none" stroke="#ddd" strokeWidth="0.5" />
          <circle cx="55" cy="40" r="9.5" fill="none" stroke="#ddd" strokeWidth="0.5" />

          {/* ── Pupils (follow cursor) ────────────────────── */}
          <circle cx={33 + px} cy={40 + py} r="5.5" fill="#111111" />
          <circle cx={55 + px} cy={40 + py} r="5.5" fill="#111111" />

          {/* Pupil highlight */}
          <circle cx={33 + px + 1.8} cy={40 + py - 1.8} r="1.8" fill="white" />
          <circle cx={55 + px + 1.8} cy={40 + py - 1.8} r="1.8" fill="white" />

          {/* ── Nose ─────────────────────────────────────── */}
          <ellipse cx="44" cy="51" rx="3.5" ry="2.5" fill="#333333" />

          {/* ── Mouth ────────────────────────────────────── */}
          <path
            d="M 37 55 Q 44 60 51 55"
            stroke="#333333"
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
          />

          {/* ── Whiskers ─────────────────────────────────── */}
          <line x1="20" y1="51" x2="36" y2="53" stroke="#2e2e2e" strokeWidth="1" strokeLinecap="round" />
          <line x1="20" y1="55" x2="36" y2="55" stroke="#2e2e2e" strokeWidth="1" strokeLinecap="round" />
          <line x1="52" y1="53" x2="68" y2="51" stroke="#2e2e2e" strokeWidth="1" strokeLinecap="round" />
          <line x1="52" y1="55" x2="68" y2="55" stroke="#2e2e2e" strokeWidth="1" strokeLinecap="round" />

          {/* ── Legs ─────────────────────────────────────── */}
          {/* Front-left + Back-right: group A */}
          <g className="mascot-leg-a">
            <rect x="26" y="88" width="10" height="16" rx="5" fill="#1c1c1c" />
          </g>
          <g className="mascot-leg-b">
            <rect x="52" y="88" width="10" height="16" rx="5" fill="#1c1c1c" />
          </g>
          {/* Front-right + Back-left: group B */}
          <g className="mascot-leg-b">
            <rect x="34" y="86" width="10" height="15" rx="5" fill="#242424" />
          </g>
          <g className="mascot-leg-a">
            <rect x="44" y="86" width="10" height="15" rx="5" fill="#242424" />
          </g>

          {/* ── Foot pads ────────────────────────────────── */}
          <ellipse cx="31" cy="104" rx="5" ry="2.5" fill="#161616" />
          <ellipse cx="57" cy="104" rx="5" ry="2.5" fill="#161616" />

          {/* ── Defs ─────────────────────────────────────── */}
          <defs>
            <radialGradient id="bodyGrad" cx="40%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#2e2e2e" />
              <stop offset="100%" stopColor="#111111" />
            </radialGradient>
            <radialGradient id="headGrad" cx="40%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#333333" />
              <stop offset="100%" stopColor="#161616" />
            </radialGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
};

export default Mascot;
