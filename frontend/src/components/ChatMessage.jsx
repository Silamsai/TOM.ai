import React from 'react';
import { formatTime } from '../utils/validators';
import { CornerUpLeft, Copy, FileText, Check, Paperclip, Download, ZoomIn, X } from 'lucide-react';
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

const renderMarkdown = (text, onImageClick) => {
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
        const bb = rem.indexOf('**');
        const bt = rem.indexOf('`');
        const it = rem.search(/(?<!\*)\*(?!\*)/);
        const img = rem.indexOf('![');
        const link = rem.indexOf('[');

        const mins = [
          { type: 'bb', idx: bb },
          { type: 'bt', idx: bt },
          { type: 'it', idx: it },
          { type: 'img', idx: img },
          { type: 'link', idx: (link === img + 1 && img !== -1) ? -1 : link }
        ].filter(x => x.idx >= 0);

        if (!mins.length) { parts.push(<span key={k++}>{rem}</span>); break; }

        mins.sort((a, b) => a.idx - b.idx);
        const first = mins[0];

        if (first.idx > 0) {
          parts.push(<span key={k++}>{rem.slice(0, first.idx)}</span>);
        }

        rem = rem.slice(first.idx);

        if (first.type === 'bb' && rem.startsWith('**')) {
          const e = rem.indexOf('**', 2);
          if (e > 1) {
            parts.push(<strong key={k++}>{rem.slice(2, e)}</strong>);
            rem = rem.slice(e + 2);
            continue;
          }
        }
        if (first.type === 'bt' && rem.startsWith('`')) {
          const e = rem.indexOf('`', 1);
          if (e > 0) {
            parts.push(<code key={k++} className="msg-inline-code">{rem.slice(1, e)}</code>);
            rem = rem.slice(e + 1);
            continue;
          }
        }
        if (first.type === 'it' && rem.startsWith('*')) {
          const e = rem.indexOf('*', 1);
          if (e > 0) {
            parts.push(<em key={k++}>{rem.slice(1, e)}</em>);
            rem = rem.slice(e + 1);
            continue;
          }
        }
        if (first.type === 'img' && rem.startsWith('![')) {
          const closeBracket = rem.indexOf(']');
          if (closeBracket > 1) {
            const openParen = rem.indexOf('(', closeBracket);
            if (openParen === closeBracket + 1) {
              const closeParen = rem.indexOf(')', openParen);
              if (closeParen > openParen) {
                const alt = rem.slice(2, closeBracket);
                const url = rem.slice(openParen + 1, closeParen);
                parts.push(
                  <div
                    key={k++}
                    className="chat-msg-img-container"
                    onClick={() => onImageClick && onImageClick(url)}
                  >
                    <img src={url} alt={alt} />
                    <div className="chat-msg-img-hover-overlay">
                      <ZoomIn size={20} color="#fff" />
                    </div>
                  </div>
                );
                rem = rem.slice(closeParen + 1);
                continue;
              }
            }
          }
        }
        if (first.type === 'link' && rem.startsWith('[')) {
          const closeBracket = rem.indexOf(']');
          if (closeBracket > 0) {
            const openParen = rem.indexOf('(', closeBracket);
            if (openParen === closeBracket + 1) {
              const closeParen = rem.indexOf(')', openParen);
              if (closeParen > openParen) {
                const text = rem.slice(1, closeBracket);
                const url = rem.slice(openParen + 1, closeParen);
                parts.push(
                  <a key={k++} href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#38bdf8', textDecoration: 'underline' }}>
                    {text}
                  </a>
                );
                rem = rem.slice(closeParen + 1);
                continue;
              }
            }
          }
        }

        parts.push(<span key={k++}>{rem[0]}</span>);
        rem = rem.slice(1);
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
  const [lightboxUrl, setLightboxUrl] = React.useState(null);

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

  const handleDownloadImage = (e, url) => {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = url;
    a.download = `tomai-image-${Date.now()}.jpg`;
    a.target = '_blank';
    a.click();
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
          {isUser ? message : renderMarkdown(message, setLightboxUrl)}
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

      {/* Glassmorphic Lightbox overlay */}
      {lightboxUrl && (
        <div
          className="img-lightbox-overlay"
          onClick={() => setLightboxUrl(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(5, 5, 8, 0.9)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            cursor: 'zoom-out'
          }}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '90%',
              maxHeight: '90%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              animation: 'scaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxUrl}
              alt="Zoomed"
              style={{
                maxWidth: '100%',
                maxHeight: '80vh',
                objectFit: 'contain',
                borderRadius: '12px',
                boxShadow: '0 24px 50px rgba(0, 0, 0, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            />
            <div style={{ marginTop: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button
                onClick={(e) => handleDownloadImage(e, lightboxUrl)}
                style={{
                  background: 'linear-gradient(135deg, #7c6cfc, #38bdf8)',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 24px',
                  borderRadius: '30px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 15px rgba(124, 108, 252, 0.3)',
                  transition: 'transform 0.2s ease'
                }}
                className="img-lb-action-btn"
              >
                <Download size={14} />
                Download
              </button>
              <button
                onClick={() => setLightboxUrl(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: 'rgba(255, 255, 255, 0.8)',
                  padding: '10px 20px',
                  borderRadius: '30px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <X size={14} />
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
