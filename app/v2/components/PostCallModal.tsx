'use client';

import { useEffect, useRef } from 'react';

export interface PostCallModalProps {
  onNewCall: () => void;
  onGoHome: () => void;
}

export default function PostCallModal({ onNewCall, onGoHome }: PostCallModalProps) {
  const firstButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    firstButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onGoHome();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onGoHome]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="post-call-modal-title"
      aria-label="Call ended"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 320,
          background: 'var(--v2-surface)',
          borderRadius: 'var(--v2-radius-card)',
          boxShadow: 'var(--v2-shadow-menu)',
          padding: '28px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: 20,
        }}
      >
        <p
          id="post-call-modal-title"
          style={{
            margin: 0,
            fontSize: '1.25rem',
            fontWeight: 700,
            color: 'var(--v2-text-primary)',
            textAlign: 'center',
          }}
        >
          Call with Tammy ended
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            ref={firstButtonRef}
            type="button"
            onClick={onNewCall}
            style={{
              width: '100%',
              padding: '14px 24px',
              borderRadius: 'var(--v2-radius-pill)',
              border: 'none',
              background: 'var(--v2-primary)',
              color: 'white',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: 'var(--v2-shadow-card)',
              transition: 'transform var(--v2-transition-fast), opacity var(--v2-transition-fast)',
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            New call
          </button>
          <button
            type="button"
            onClick={onGoHome}
            style={{
              width: '100%',
              padding: '14px 24px',
              borderRadius: 'var(--v2-radius-pill)',
              border: '2px solid var(--v2-text-muted)',
              background: 'transparent',
              color: 'var(--v2-text-secondary)',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'border-color var(--v2-transition-fast), color var(--v2-transition-fast), transform var(--v2-transition-fast)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--v2-text-primary)';
              e.currentTarget.style.color = 'var(--v2-text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--v2-text-muted)';
              e.currentTarget.style.color = 'var(--v2-text-secondary)';
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            Go back home
          </button>
        </div>
      </div>
    </div>
  );
}
