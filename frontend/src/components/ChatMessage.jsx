import React from 'react';
import { formatTime } from '../utils/validators';
import '../styles/components.css';

const renderMarkdown = (text) => {
  if (!text) return '';
  const lines = text.split('\n');
  let inCode = false, codeLines = [], codeLang = '';
  const result = [];

  lines.forEach((raw, i) => {
    if (raw.startsWith('```')) {
      if (!inCode) { inCode = true; codeLang = raw.slice(3).trim(); codeLines = []; }
      else {
        result.push(
          <pre key={`cb-${i}`} className="msg-code-block">
            {codeLang && <span className="msg-code-lang">{codeLang}</span>}
            <code>{codeLines.join('\n')}</code>
          </pre>
        );
        inCode = false; codeLines = []; codeLang = '';
      }
      return;
    }
    if (inCode) { codeLines.push(raw); return; }
    if (!raw.trim()) { result.push(<div key={`sp-${i}`} style={{ height: 8 }} />); return; }

    const inline = (str) => {
      const parts = []; let rem = str, k = 0;
      while (rem.length) {
        const bb = rem.indexOf('**'), bt = rem.indexOf('`');
        const it = rem.search(/(?<!\*)\*(?!\*)/);
        const mins = [bb, bt, it].filter(x => x >= 0);
        if (!mins.length) { parts.push(<span key={k++}>{rem}</span>); break; }
        const f = Math.min(...mins);
        if (f > 0) parts.push(<span key={k++}>{rem.slice(0, f)}</span>);
        if (f === bb && rem.startsWith('**', f)) {
          const e = rem.indexOf('**', f + 2);
          if (e > f) { parts.push(<strong key={k++}>{rem.slice(f + 2, e)}</strong>); rem = rem.slice(e + 2); continue; }
        }
        if (f === bt) {
          const e = rem.indexOf('`', f + 1);
          if (e > f) { parts.push(<code key={k++} className="msg-inline-code">{rem.slice(f + 1, e)}</code>); rem = rem.slice(e + 1); continue; }
        }
        if (f === it) {
          const e = rem.indexOf('*', f + 1);
          if (e > f) { parts.push(<em key={k++}>{rem.slice(f + 1, e)}</em>); rem = rem.slice(e + 1); continue; }
        }
        parts.push(<span key={k++}>{rem[f]}</span>); rem = rem.slice(f + 1);
      }
      return parts;
    };

    if (/^[-*•] /.test(raw)) { result.push(<div key={i} className="msg-bullet">• {inline(raw.replace(/^[-*•] /, ''))}</div>); return; }
    if (/^\d+\. /.test(raw)) { result.push(<div key={i} className="msg-bullet">{inline(raw)}</div>); return; }
    result.push(<div key={i} className="msg-line">{inline(raw)}</div>);
  });
  return result;
};

const ChatMessage = ({ message, type, timestamp, userPicture, onReply }) => {
  const [isHovered, React_setIsHovered] = React.useState(false);
  const isUser = type === 'user';
  return (
    <div 
      className={`message-row ${isUser ? 'user' : 'bot'}`}
      onMouseEnter={() => React_setIsHovered(true)}
      onMouseLeave={() => React_setIsHovered(false)}
    >
      {/* Avatar */}
      <div className="message-avatar" aria-hidden="true">
        {isUser ? (
          userPicture
            ? <img src={userPicture} alt="You" className="msg-avatar-img" referrerPolicy="no-referrer" />
            : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16"><rect x="3" y="8" width="18" height="12" rx="3"/><circle cx="9" cy="14" r="1.5" fill="currentColor"/><circle cx="15" cy="14" r="1.5" fill="currentColor"/><path d="M9 8V5a3 3 0 016 0v3"/><path d="M12 3v2"/></svg>
        )}
      </div>
      <div className="message-content-wrap">
        <div className="message-bubble">{isUser ? message : renderMarkdown(message)}</div>
        <div className="message-meta-wrap" style={{display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px'}}>
          {timestamp && <div className="message-meta" style={{marginTop: 0}}>{formatTime(timestamp)}</div>}
          {isHovered && onReply && (
            <button 
              onClick={() => onReply(message)} 
              className="msg-reply-btn" 
              style={{background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '12px', padding: 0}}
              title="Reply"
            >
              ↩
            </button>
          )}
          {isHovered && (
            <button 
              onClick={() => navigator.clipboard.writeText(message)} 
              className="msg-copy-btn" 
              style={{background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: 0}}
              title="Copy"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
