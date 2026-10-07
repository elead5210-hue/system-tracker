import React, { useEffect, useRef, useState } from 'react';

const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const dialogStyle = {
  background: '#ffffff',
  color: '#111111',
  borderRadius: 8,
  padding: 24,
  width: '100%',
  maxWidth: 420,
  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
};

const fieldStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  marginBottom: 16,
};

const inputStyle = {
  padding: '8px 10px',
  fontSize: 16,
  border: '1px solid #999999',
  borderRadius: 4,
};

const errorStyle = {
  color: '#b00020',
  fontSize: 14,
};

const actionsStyle = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 8,
};

export default function NewSystemModal({ onSave, onClose }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && typeof onClose === 'function') {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError('System name is required.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      if (typeof onSave === 'function') {
        await onSave(trimmed);
      }
    } catch (err) {
      setError('Could not save the system. Please try again.');
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
    <div style={overlayStyle} onClick={handleOverlayClick}>
      <div
        style={dialogStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-system-modal-title"
      >
        <h2 id="new-system-modal-title" style={{ marginTop: 0 }}>
          New system
        </h2>
        <form onSubmit={handleSubmit} noValidate>
          <div style={fieldStyle}>
            <label htmlFor="new-system-name">System name</label>
            <input
              id="new-system-name"
              ref={inputRef}
              type="text"
              style={inputStyle}
              value={name}
              required
              aria-required="true"
              aria-invalid={error ? 'true' : 'false'}
              onChange={(event) => {
                setName(event.target.value);
                if (error) setError('');
              }}
            />
            {error ? (
              <span role="alert" style={errorStyle}>
                {error}
              </span>
            ) : null}
          </div>
          <div style={actionsStyle}>
            <button type="button" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" disabled={submitting}>
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}