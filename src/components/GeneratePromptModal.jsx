import React, { useEffect, useMemo, useRef, useState } from 'react';
import { buildProjectPrompt } from '../utils/projectPrompt.js';

const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: 16,
};

const dialogStyle = {
  background: '#fff',
  borderRadius: 8,
  padding: 20,
  width: '100%',
  maxWidth: 720,
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
  boxSizing: 'border-box',
};

const hintStyle = {
  margin: '0 0 12px',
  fontSize: 14,
  color: '#555',
};

const textareaStyle = {
  flex: 1,
  width: '100%',
  minHeight: 280,
  padding: '8px 10px',
  fontSize: 12,
  fontFamily: 'monospace',
  border: '1px solid #ccc',
  borderRadius: 4,
  boxSizing: 'border-box',
  resize: 'vertical',
};

const errorStyle = {
  color: '#b00020',
  fontSize: 13,
  marginTop: 8,
};

const actionsStyle = {
  display: 'flex',
  justifyContent: 'flex-end',
  alignItems: 'center',
  gap: 8,
  marginTop: 12,
};

const statusStyle = {
  fontSize: 13,
  color: '#2e7d32',
  marginRight: 'auto',
};

const COPIED_FEEDBACK_MS = 2000;

function fallbackCopy(textarea, text) {
  try {
    if (textarea) {
      textarea.focus();
      textarea.select();
    }
    if (typeof document !== 'undefined' && document.execCommand) {
      return document.execCommand('copy');
    }
  } catch (e) {
    return false;
  }
  return Boolean(text) && false;
}

export default function GeneratePromptModal({
  projectName,
  projectDescription,
  githubUrl,
  zipFileName,
  onClose,
}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const textareaRef = useRef(null);
  const timerRef = useRef(null);

  const prompt = useMemo(
    () =>
      buildProjectPrompt({
        projectName,
        projectDescription,
        githubUrl,
        zipFileName,
      }),
    [projectName, projectDescription, githubUrl, zipFileName]
  );

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && typeof onClose === 'function') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  function showCopied() {
    setError('');
    setCopied(true);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      setCopied(false);
    }, COPIED_FEEDBACK_MS);
  }

  function showFailure() {
    setCopied(false);
    setError('Could not copy automatically. Select the text and copy it manually.');
  }

  async function handleCopy() {
    if (
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === 'function'
    ) {
      try {
        await navigator.clipboard.writeText(prompt);
        showCopied();
        return;
      } catch (e) {
        // fall through to the legacy copy method
      }
    }
    if (fallbackCopy(textareaRef.current, prompt)) {
      showCopied();
    } else {
      showFailure();
    }
  }

  function handleOverlayClick(event) {
    if (event.target === event.currentTarget && typeof onClose === 'function') {
      onClose();
    }
  }

  return (
    <div style={overlayStyle} onClick={handleOverlayClick}>
      <div
        style={dialogStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby="generate-prompt-title"
      >
        <h2 id="generate-prompt-title" style={{ margin: '0 0 8px', fontSize: 18 }}>
          AI prompt
        </h2>
        <p style={hintStyle}>
          Copy this prompt and paste it into an AI. It asks for a detailed project
          document returned as JSON.
        </p>
        <textarea
          ref={textareaRef}
          style={textareaStyle}
          value={prompt}
          readOnly
          aria-label="Generated AI prompt"
          onFocus={(event) => event.target.select()}
        />
        {error ? (
          <div style={errorStyle} role="alert">
            {error}
          </div>
        ) : null}
        <div style={actionsStyle}>
          {copied ? (
            <span style={statusStyle} role="status">
              Copied to clipboard
            </span>
          ) : null}
          <button type="button" onClick={onClose}>
            Close
          </button>
          <button type="button" onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy to clipboard'}
          </button>
        </div>
      </div>
    </div>
  );
}