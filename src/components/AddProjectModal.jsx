import React, { useEffect, useRef, useState } from 'react';

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const dialogStyle = {
  background: '#fff',
  color: '#111',
  borderRadius: 8,
  padding: 24,
  width: '100%',
  maxWidth: 480,
  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
  boxSizing: 'border-box',
};

const fieldStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  marginBottom: 16,
};

const inputStyle = {
  padding: '8px 10px',
  fontSize: 14,
  border: '1px solid #bbb',
  borderRadius: 4,
  boxSizing: 'border-box',
  width: '100%',
};

const tabsStyle = {
  display: 'flex',
  gap: 8,
  marginBottom: 16,
};

const errorStyle = {
  color: '#b00020',
  fontSize: 13,
  marginBottom: 12,
};

const actionsStyle = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 8,
};

function tabButtonStyle(active) {
  return {
    flex: 1,
    padding: '8px 12px',
    fontSize: 14,
    cursor: 'pointer',
    borderRadius: 4,
    border: active ? '1px solid #2b6cb0' : '1px solid #bbb',
    background: active ? '#ebf4ff' : '#fff',
    color: '#111',
  };
}

const GITHUB_REPO_PATTERN =
  /^https:\/\/(?:www\.)?github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+?(?:\.git)?\/?$/i;

function validateGithubUrl(value) {
  const url = value.trim();
  if (!url) {
    return 'Enter a GitHub repository link.';
  }
  const withoutQuery = url.replace(/[?#].*$/, '');
  if (!GITHUB_REPO_PATTERN.test(withoutQuery)) {
    return 'Enter a valid public GitHub repository link, e.g. https://github.com/owner/repo.';
  }
  return '';
}

function validateZipFile(file) {
  if (!file) {
    return 'Choose a zip file to upload.';
  }
  if (!/\.zip$/i.test(file.name || '')) {
    return 'The selected file must be a .zip file.';
  }
  if (file.size === 0) {
    return 'The selected zip file is empty.';
  }
  return '';
}

export default function AddProjectModal({ onClose, onSubmit }) {
  const [mode, setMode] = useState('github');
  const [githubUrl, setGithubUrl] = useState('');
  const [zipFile, setZipFile] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const firstInputRef = useRef(null);

  useEffect(() => {
    if (firstInputRef.current) {
      firstInputRef.current.focus();
    }
  }, [mode]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && typeof onClose === 'function') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  function switchMode(next) {
    setMode(next);
    setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) {
      return;
    }

    let source;
    if (mode === 'github') {
      const message = validateGithubUrl(githubUrl);
      if (message) {
        setError(message);
        return;
      }
      source = { type: 'github', url: githubUrl.trim() };
    } else {
      const message = validateZipFile(zipFile);
      if (message) {
        setError(message);
        return;
      }
      source = {
        type: 'zip',
        file: zipFile,
        fileName: zipFile.name,
        size: zipFile.size,
      };
    }

    setError('');
    if (typeof onSubmit !== 'function') {
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(source);
    } catch (err) {
      setError(err && err.message ? err.message : 'Could not add the project.');
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
  }

  function handleOverlayClick(event) {
    if (event.target === event.currentTarget && typeof onClose === 'function') {
      onClose();
    }
  }

  return (
    <div style={overlayStyle} onMouseDown={handleOverlayClick}>
      <form
        style={dialogStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-project-title"
        onSubmit={handleSubmit}
        noValidate
      >
        <h2 id="add-project-title" style={{ marginTop: 0 }}>
          Add project
        </h2>

        <div style={tabsStyle}>
          <button
            type="button"
            style={tabButtonStyle(mode === 'github')}
            onClick={() => switchMode('github')}
            aria-pressed={mode === 'github'}
          >
            GitHub link
          </button>
          <button
            type="button"
            style={tabButtonStyle(mode === 'zip')}
            onClick={() => switchMode('zip')}
            aria-pressed={mode === 'zip'}
          >
            Upload zip
          </button>
        </div>

        {mode === 'github' ? (
          <div style={fieldStyle}>
            <label htmlFor="add-project-github-url">Public GitHub repository link</label>
            <input
              id="add-project-github-url"
              ref={firstInputRef}
              style={inputStyle}
              type="url"
              value={githubUrl}
              placeholder="https://github.com/owner/repo"
              onChange={(event) => {
                setGithubUrl(event.target.value);
                if (error) setError('');
              }}
              disabled={submitting}
            />
          </div>
        ) : (
          <div style={fieldStyle}>
            <label htmlFor="add-project-zip-file">Project zip file</label>
            <input
              id="add-project-zip-file"
              ref={firstInputRef}
              style={inputStyle}
              type="file"
              accept=".zip,application/zip,application/x-zip-compressed"
              onChange={(event) => {
                const files = event.target.files;
                setZipFile(files && files.length > 0 ? files[0] : null);
                if (error) setError('');
              }}
              disabled={submitting}
            />
            {zipFile ? (
              <span style={{ fontSize: 12, color: '#555' }}>
                {zipFile.name} ({Math.max(1, Math.round(zipFile.size / 1024))} KB)
              </span>
            ) : null}
          </div>
        )}

        {error ? (
          <div style={errorStyle} role="alert">
            {error}
          </div>
        ) : null}

        <div style={actionsStyle}>
          <button type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Adding...' : 'Add project'}
          </button>
        </div>
      </form>
    </div>
  );
}