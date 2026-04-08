'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, MoreVertical, Trash2 } from 'lucide-react';
import { Card } from '@/app/components/ui';
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

const menuItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
  padding: '10px 14px',
  border: 'none',
  borderRadius: 8,
  background: 'transparent',
  color: 'var(--tt-text-primary)',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
  textAlign: 'left',
  whiteSpace: 'nowrap',
};

export interface MissionCardProps {
  mission: Mission;
  onComplete?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function MissionCard({ mission, onComplete, onDelete }: MissionCardProps) {
  const isActive = mission.status === 'active';
  const [menuOpen, setMenuOpen] = useState(false);
  const [doneSuccess, setDoneSuccess] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!doneSuccess) return;
    const t = setTimeout(() => setDoneSuccess(false), 500);
    return () => clearTimeout(t);
  }, [doneSuccess]);

  function handleMenuAction(fn: () => void) {
    fn();
    setMenuOpen(false);
  }

  function handleDoneClick() {
    if (!onComplete) return;
    setDoneSuccess(true);
    onComplete(mission.id);
  }

  const showRemove = onDelete;
  const showMarkDone = isActive && onComplete;

  return (
    <Card
      style={{
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: 16,
        padding: '16px 20px',
        display: 'flex',
        gap: 16,
        alignItems: 'flex-start',
        backdropFilter: 'blur(8px)',
        backgroundColor: isActive ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.07)',
      }}
    >
      <span style={{ fontSize: 36, lineHeight: 1, flexShrink: 0 }}>
        {THEME_EMOJI[mission.theme]}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            color: 'var(--tt-text-primary)',
            fontWeight: 700,
            fontSize: 17,
            margin: 0,
            textShadow: '0 1px 4px rgba(0,0,0,0.4)',
            ...(isActive ? {} : { textDecoration: 'line-through' }),
          }}
        >
          {mission.title}
        </p>
        {isActive && mission.difficulty && (
          <span
            data-difficulty={mission.difficulty}
            style={{
              display: 'inline-block',
              marginTop: 4,
              padding: '2px 8px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              background:
                mission.difficulty === 'easy' ? 'rgba(34,197,94,0.25)' :
                mission.difficulty === 'medium' ? 'rgba(234,179,8,0.25)' :
                'rgba(239,68,68,0.25)',
              color:
                mission.difficulty === 'easy' ? '#86efac' :
                mission.difficulty === 'medium' ? '#fde047' :
                '#fca5a5',
            }}
          >
            {mission.difficulty}
          </span>
        )}
        <p
          style={{
            color: 'var(--tt-text-secondary)',
            fontSize: 14,
            margin: '4px 0 0',
            textShadow: '0 1px 3px rgba(0,0,0,0.3)',
            ...(isActive ? {} : { textDecoration: 'line-through' }),
          }}
        >
          {mission.description}
        </p>
        {!isActive && mission.completedAt && (
          <p style={{ color: 'var(--tt-text-muted)', fontSize: 12, margin: '6px 0 0' }}>
            Completed {formatDate(mission.completedAt)}
          </p>
        )}
        {isActive && (
          <p style={{ color: 'var(--tt-text-muted)', fontSize: 11, margin: '6px 0 0' }}>
            Started {formatDate(mission.createdAt)}
          </p>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flexShrink: 0 }}>
        {isActive && onComplete && (
          <button
            type="button"
            className={`tt-tap-shake ${doneSuccess ? 'tt-success-pop' : ''}`}
            onClick={handleDoneClick}
            style={{
              background: 'rgba(34, 197, 94, 0.8)',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              padding: '8px 14px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Check size={14} strokeWidth={2.5} /> Done!
          </button>
        )}
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            type="button"
            className="tt-tap-shake"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              padding: 0,
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.1)',
              color: 'var(--tt-text-secondary)',
              cursor: 'pointer',
            }}
          >
            <MoreVertical size={18} strokeWidth={2} />
          </button>
          {menuOpen && (showMarkDone || showRemove) && (
            <div
              role="menu"
              style={{
                position: 'absolute',
                right: 0,
                top: '100%',
                marginTop: 4,
                minWidth: 160,
                padding: 4,
                background: 'rgba(0,0,0,0.4)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 12,
                zIndex: 20,
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              }}
            >
              {showMarkDone && (
                <button
                  type="button"
                  role="menuitem"
                  className="tt-tap-shake"
                  style={menuItemStyle}
                  onClick={() => handleMenuAction(() => handleDoneClick())}
                >
                  <Check size={16} strokeWidth={2.5} /> Mark as done
                </button>
              )}
              {showRemove && (
                <button
                  type="button"
                  role="menuitem"
                  style={{ ...menuItemStyle, color: 'var(--tt-text-tertiary)' }}
                  onClick={() => handleMenuAction(() => onDelete?.(mission.id))}
                >
                  <Trash2 size={16} strokeWidth={2} /> Remove
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
