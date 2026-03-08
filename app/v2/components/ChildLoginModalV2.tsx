'use client';

import { useState, useEffect } from 'react';

const EMOJI_OPTIONS = ['🐢', '🦊', '🦋', '🐻', '🦁', '🐸', '🐶', '🐱', '🌟'];

export interface ChildLoginModalV2Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ChildLoginModalV2({
  open,
  onClose,
  onSuccess,
}: ChildLoginModalV2Props) {
  const [firstName, setFirstName] = useState('');
  const [code, setCode] = useState('');
  const [emoji, setEmoji] = useState('🐢');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      setLoginSuccess(false);
      setError(null);
    }
  }, [open]);

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
        const msg =
          data.error || 'Invalid code, name, or emoji. Check with your grown-up.';
        setError(data.hint ? `${msg} ${data.hint}` : msg);
        return;
      }
      setFirstName('');
      setCode('');
      setEmoji('🐢');
      setLoginSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 550);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="child-login-title-v2"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 120,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(6px)',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          padding: 24,
          borderRadius: 'var(--v2-radius-card)',
          background: 'var(--v2-surface)',
          boxShadow: 'var(--v2-shadow-menu)',
          border: '1px solid var(--v2-glass-border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="child-login-title-v2"
          style={{
            margin: '0 0 4px',
            fontSize: '1.3rem',
            fontWeight: 800,
            color: 'var(--v2-text-primary)',
            textAlign: 'center',
          }}
        >
          Log in to Shelly
        </h2>
        <p
          style={{
            margin: '0 0 20px',
            fontSize: '0.9rem',
            color: 'var(--v2-text-secondary)',
            textAlign: 'center',
          }}
        >
          Use your name, code, and emoji from your grown-up.
        </p>

        {loginSuccess ? (
          <p
            style={{
              margin: 0,
              fontSize: '1.25rem',
              fontWeight: 700,
              color: 'var(--v2-text-primary)',
              textAlign: 'center',
              padding: '24px 0',
            }}
          >
            You&apos;re in! 🐢
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <label
              htmlFor="child-login-name-v2"
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--v2-text-primary)',
                marginBottom: 6,
              }}
            >
              Your name
            </label>
            <input
              id="child-login-name-v2"
              type="text"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="e.g. Sam"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 14px',
                marginBottom: 14,
                borderRadius: 12,
                border: '1px solid var(--v2-glass-border)',
                background: 'var(--v2-glass)',
                color: 'var(--v2-text-primary)',
                fontSize: '1rem',
              }}
            />

            <label
              htmlFor="child-login-code-v2"
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--v2-text-primary)',
                marginBottom: 6,
              }}
            >
              Code (6 letters/numbers from your grown-up)
            </label>
            <input
              id="child-login-code-v2"
              type="text"
              autoComplete="off"
              inputMode="text"
              maxLength={6}
              value={code}
              onChange={(e) =>
                setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
              }
              placeholder="e.g. ABC123"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 14px',
                marginBottom: 14,
                borderRadius: 12,
                border: '1px solid var(--v2-glass-border)',
                background: 'var(--v2-glass)',
                color: 'var(--v2-text-primary)',
                fontSize: '1.05rem',
                letterSpacing: 2,
                fontFamily: 'monospace',
              }}
            />

            <label
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--v2-text-primary)',
                marginBottom: 8,
              }}
            >
              Your emoji (same as your grown-up chose)
            </label>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                marginBottom: 18,
              }}
            >
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    border:
                      emoji === e
                        ? '2px solid var(--v2-primary)'
                        : '1px solid var(--v2-glass-border)',
                    background:
                      emoji === e ? 'rgba(0,207,185,0.16)' : 'var(--v2-glass)',
                    fontSize: '1.4rem',
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
                  margin: '0 0 14px',
                  fontSize: '0.9rem',
                  color: '#dc2626',
                  textAlign: 'center',
                  whiteSpace: 'pre-line',
                }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: 'var(--v2-radius-pill)',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 700,
                color: '#ffffff',
                background: 'var(--v2-primary)',
                boxShadow: 'var(--v2-shadow-card)',
                opacity: loading ? 0.8 : 1,
              }}
            >
              {loading ? 'Checking…' : 'Log in'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

