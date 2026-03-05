'use client';

import { useState } from 'react';

const EMOJI_OPTIONS = ['🐢', '🦊', '🦋', '🐻', '🦁', '🐸', '🐶', '🐱', '🌟'];

interface ChildLoginModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ChildLoginModal({ open, onClose, onSuccess }: ChildLoginModalProps) {
  const [firstName, setFirstName] = useState('');
  const [code, setCode] = useState('');
  const [emoji, setEmoji] = useState('🐢');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const name = firstName.trim();
    const key = code.trim().replace(/\s/g, '').toUpperCase().slice(0, 6);
    if (!name) {
      setError('Please enter your name');
      return;
    }
    if (key.length !== 6) {
      setError('Code should be 6 characters (ask your grown-up)');
      return;
    }
    if (!emoji) {
      setError('Please pick your emoji');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/child-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          loginKey: key,
          firstName: name,
          emoji,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error || 'Invalid code, name, or emoji. Check with your grown-up.';
        setError(data.hint ? `${msg} ${data.hint}` : msg);
        return;
      }
      setFirstName('');
      setCode('');
      setEmoji('🐢');
      onSuccess();
      onClose();
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="child-login-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 380,
          padding: 28,
          borderRadius: 24,
          background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.98) 0%, rgba(8, 22, 48, 0.98) 100%)',
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
        }}
      >
        <h2
          id="child-login-title"
          style={{
            margin: '0 0 8px',
            fontSize: '1.35rem',
            fontWeight: 800,
            color: 'var(--tt-text-primary)',
            textAlign: 'center',
          }}
        >
          Log in 🐢
        </h2>
        <p
          style={{
            margin: '0 0 24px',
            fontSize: '0.9rem',
            color: 'var(--tt-text-secondary)',
            textAlign: 'center',
          }}
        >
          Use your name, code and emoji from your grown-up
        </p>

        <form onSubmit={handleSubmit}>
          <label
            htmlFor="child-login-name"
            style={{
              display: 'block',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--tt-text-primary)',
              marginBottom: 6,
            }}
          >
            Your name
          </label>
          <input
            id="child-login-name"
            type="text"
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="e.g. Sam"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '12px 16px',
              marginBottom: 16,
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.25)',
              background: 'rgba(255,255,255,0.08)',
              color: 'var(--tt-text-primary)',
              fontSize: '1rem',
            }}
          />

          <label
            htmlFor="child-login-code"
            style={{
              display: 'block',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--tt-text-primary)',
              marginBottom: 6,
            }}
          >
            Code (6 letters/numbers from your grown-up)
          </label>
          <input
            id="child-login-code"
            type="text"
            autoComplete="off"
            inputMode="text"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            placeholder="e.g. ABC123"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '12px 16px',
              marginBottom: 16,
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.25)',
              background: 'rgba(255,255,255,0.08)',
              color: 'var(--tt-text-primary)',
              fontSize: '1.1rem',
              letterSpacing: 2,
              fontFamily: 'monospace',
            }}
          />

          <label
            style={{
              display: 'block',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--tt-text-primary)',
              marginBottom: 8,
            }}
          >
            Your emoji (same as your grown-up chose)
          </label>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
              marginBottom: 24,
            }}
          >
            {EMOJI_OPTIONS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  border: emoji === e ? '3px solid #22c55e' : '2px solid rgba(255,255,255,0.2)',
                  background: emoji === e ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                }}
                aria-label={`Select ${e}`}
              >
                {e}
              </button>
            ))}
          </div>

          {error && (
            <p
              style={{
                margin: '0 0 16px',
                fontSize: '0.9rem',
                color: '#f87171',
                textAlign: 'center',
                whiteSpace: 'pre-line',
              }}
            >
              {error}
            </p>
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '14px 20px',
                borderRadius: 14,
                border: '1px solid rgba(255,255,255,0.25)',
                background: 'rgba(255,255,255,0.08)',
                color: 'var(--tt-text-primary)',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: '14px 20px',
                borderRadius: 14,
                border: 'none',
                background: 'linear-gradient(135deg, #16a34a, #22c55e)',
                color: 'white',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: loading ? 'wait' : 'pointer',
              }}
            >
              {loading ? 'Logging in…' : 'Log in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
