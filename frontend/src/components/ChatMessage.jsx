import React from 'react';
import { formatTime } from '../utils/validators';
import { CornerUpLeft, Copy, FileText, Check, Paperclip } from 'lucide-react';
import '../styles/components.css';
import { jsPDF } from 'jspdf';

const CodeBlock = ({ lang, code }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(err => {
          console.error('Failed to copy text: ', err);
          fallbackCopy();
        });
    } else {
      fallbackCopy();
    }
  };

  const fallbackCopy = () => {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = code;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Fallback copy failed', err);
    }
  };

  return (
    <div className="msg-code-container">
      <div className="msg-code-header">
        <span className="msg-code-lang">{lang || 'code'}</span>
        <button className="msg-code-copy-btn" onClick={handleCopy}>
          {copied ? (
            <>
              <Check size={12} style={{ marginRight: '4px' }} />
              Copied!
            </>
          ) : (
            <>
              <Copy size={12} style={{ marginRight: '4px' }} />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="msg-code-block">
        <code>{code}</code>
      </pre>
    </div>
  );
};

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
          <CodeBlock key={`cb-${i}`} lang={codeLang} code={codeLines.join('\n')} />
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
  if (inCode && codeLines.length > 0) {
    result.push(
      <CodeBlock key="cb-unclosed" lang={codeLang} code={codeLines.join('\n')} />
    );
  }
  return result;
};

const renderAttachments = (attachments) => {
  if (!attachments || attachments.length === 0) return null;
  return (
    <div className="msg-attachments-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px', maxWidth: '100%' }}>
      {attachments.map((att, i) => {
        const isImage = att.inlineData?.mimeType?.startsWith('image/');
        if (isImage) {
          const imgSrc = `data:${att.inlineData.mimeType};base64,${att.inlineData.data}`;
          return (
            <div key={i} className="msg-attachment-image-wrap" style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', maxWidth: '320px', maxHeight: '320px' }}>
              <img
                src={imgSrc}
                alt={att.fileName || "Uploaded image"}
                style={{ width: '100%', height: 'auto', maxHeight: '320px', objectFit: 'contain', display: 'block' }}
              />
            </div>
          );
        } else {
          return (
            <div key={i} className="msg-attachment-file-pill" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '100px', fontSize: '12px', color: '#a5f3fc', width: 'fit-content' }}>
              <Paperclip size={12} />
              <span>{att.fileName || 'Attached file'}</span>
            </div>
          );
        }
      })}
    </div>
  );
};

const ChatMessage = ({ message, type, timestamp, userPicture, userName, onReply, attachments }) => {
  const [isHovered, React_setIsHovered] = React.useState(false);
  const isUser = type === 'user';
  const initials = userName
    ? userName.trim().split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'G';

  const downloadPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      // Style A4 PDF
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(33, 33, 33);
      doc.text("TOM.AI Assistant Response", 14, 20);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 26);
      doc.line(14, 28, 196, 28);

      doc.setFontSize(10.5);
      doc.setTextColor(50, 50, 50);

      // Clean markdown tags for the PDF
      const cleanMessage = message
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/`(.*?)`/g, '$1');

      const splitText = doc.splitTextToSize(cleanMessage, 180);

      let y = 36;
      const pageHeight = 275;

      splitText.forEach(line => {
        if (y > pageHeight) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, 14, y);
        y += 6.5;
      });

      doc.save(`tom-ai-response-${Date.now()}.pdf`);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      alert("Error generating PDF: " + err.message);
    }
  };

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
            : <span className="msg-avatar-initials">{initials}</span>
        ) : (
          <img src="/images/logo.png" alt="tom.ai" className="msg-avatar-img msg-avatar-bot" style={{ width: 18, height: 18, objectFit: 'contain', borderRadius: '4px' }} />
        )}
      </div>
      <div className="message-content-wrap">
        <div className="message-bubble">
          {isUser ? message : renderMarkdown(message)}
          {renderAttachments(attachments)}
        </div>
        <div className="message-meta-wrap" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
          {timestamp && <div className="message-meta" style={{ marginTop: 0 }}>{formatTime(timestamp)}</div>}
          {isHovered && onReply && (
            <button
              onClick={() => onReply(message)}
              className="msg-reply-btn"
              style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
              title="Reply"
            >
              <CornerUpLeft size={12} />
            </button>
          )}
          {isHovered && (
            <button
              onClick={() => navigator.clipboard.writeText(message)}
              className="msg-copy-btn"
              style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
              title="Copy"
            >
              <Copy size={12} />
            </button>
          )}
          {isHovered && !isUser && (
            <button
              onClick={downloadPDF}
              className="msg-pdf-btn"
              style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
              title="Export as PDF"
            >
              <FileText size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
