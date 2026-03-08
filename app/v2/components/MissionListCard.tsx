'use client';

import type { Mission, MissionTheme } from '@/lib/speech/types';

const THEME_EMOJI: Record<MissionTheme, string> = {
  brave: '🦁',
  kind: '💛',
  calm: '🌊',
  confident: '⭐',
  creative: '🎨',
  social: '🤝',
  curious: '🔍',
};

const THEME_LABEL: Record<MissionTheme, string> = {
  brave: 'Brave',
  kind: 'Kind',
  calm: 'Calm',
  confident: 'Confident',
  creative: 'Creative',
  social: 'Social',
  curious: 'Curious',
};

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: 'Easy',
  medium: 'Medium',
  stretch: 'Stretch',
};

export interface MissionListCardProps {
  mission: Mission;
  onClick: () => void;
  completed?: boolean;
}

export default function MissionListCard({ mission, onClick, completed = false }: MissionListCardProps) {
  const theme = mission.theme ?? 'curious';
  const emoji = THEME_EMOJI[theme] ?? '🔍';
  const categoryLabel = THEME_LABEL[theme] ?? 'Mission';
  const difficultyLabel = mission.difficulty ? DIFFICULTY_LABEL[mission.difficulty] ?? mission.difficulty : null;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        maxWidth: 380,
        padding: '14px 18px',
        borderRadius: 'var(--v2-radius-card)',
        border: '1px solid var(--v2-glass-border)',
        background: 'var(--v2-glass)',
        boxShadow: 'var(--v2-shadow-card)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        textAlign: 'left',
        transition: 'transform var(--v2-transition-fast), box-shadow var(--v2-transition-fast)',
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
      onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = 'var(--v2-shadow-card)';
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = 'var(--v2-shadow-menu)';
      }}
    >
      <span style={{ fontSize: '1.5rem', flexShrink: 0 }} aria-hidden="true">
        {emoji}
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
        <span
          style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: completed ? 'var(--v2-text-muted)' : 'var(--v2-text-secondary)',
          }}
        >
          {categoryLabel}
          {difficultyLabel ? ` · ${difficultyLabel}` : ''}
        </span>
        <span
          style={{
            fontSize: '1rem',
            fontWeight: 700,
            color: completed ? 'var(--v2-text-muted)' : 'var(--v2-text-primary)',
            textDecoration: completed ? 'line-through' : 'none',
          }}
        >
          {mission.title}
        </span>
      </span>
    </button>
  );
}
