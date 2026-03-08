'use client';

import { useEffect, useRef } from 'react';
import type { Mission, MissionTheme } from '@/lib/speech/types';

const THEME_LABEL: Record<MissionTheme, string> = {
  brave: 'Brave',
  kind: 'Kind',
  calm: 'Calm',
  confident: 'Confident',
  creative: 'Creative',
  social: 'Social',
  curious: 'Curious',
};

export interface MissionDetailModalV2Props {
  mission: Mission;
  onDone: () => void;
  onDoItLater: () => void;
  onDismiss: () => void;
}

export default function MissionDetailModalV2({
  mission,
  onDone,
  onDoItLater,
  onDismiss,
}: MissionDetailModalV2Props) {
  const primaryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    primaryRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onDismiss]);

  const theme = mission.theme ?? 'curious';
  const categoryLabel = THEME_LABEL[theme] ?? 'Mission';
  const isCompleted = mission.status === 'completed';

  const handleDoItLater = () => {
    onDoItLater();
  };

  const handleDone = () => {
    onDone();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mission-detail-v2-title"
      aria-label="Mission details"
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
      onClick={(e) => e.target === e.currentTarget && onDismiss()}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 360,
          background: 'var(--v2-surface)',
          borderRadius: 'var(--v2-radius-card)',
          boxShadow: 'var(--v2-shadow-menu)',
          padding: '24px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: 16,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <p
          id="mission-detail-v2-category"
          style={{
            margin: 0,
            fontSize: '0.75rem',
            fontWeight: 600,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: 'var(--v2-text-muted)',
          }}
        >
          {categoryLabel}
        </p>
        <h2
          id="mission-detail-v2-title"
          style={{
            margin: 0,
            fontSize: '1.25rem',
            fontWeight: 700,
            color: 'var(--v2-text-primary)',
            lineHeight: 1.3,
          }}
        >
          {mission.title}
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: '0.9375rem',
            color: 'var(--v2-text-secondary)',
            lineHeight: 1.5,
          }}
        >
          {mission.description}
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
          <button
            type="button"
            onClick={handleDoItLater}
            aria-label="Do it later"
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--v2-radius-card)',
              border: 'none',
              background: 'transparent',
              color: 'var(--v2-text-secondary)',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'color var(--v2-transition-fast)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--v2-text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--v2-text-secondary)')}
          >
            Do it later
          </button>
        </div>

        {!isCompleted && (
          <button
            ref={primaryRef}
            type="button"
            onClick={handleDone}
            aria-label="I am done"
            style={{
              width: '100%',
              padding: '14px 28px',
              borderRadius: 'var(--v2-radius-pill)',
              border: 'none',
              background: 'var(--v2-primary)',
              color: 'white',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: 'var(--v2-shadow-card)',
              transition: 'background var(--v2-transition-fast), transform var(--v2-transition-fast)',
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.background = 'var(--v2-primary)';
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--v2-primary-dark)')}
          >
            I am done
          </button>
        )}
      </div>
    </div>
  );
}
