'use client';

import { useState, useRef, useEffect } from 'react';
import { Zap, CheckCircle2, Check, MoreVertical, Trash2 } from 'lucide-react';
import { useMissions } from '@/app/hooks/useMissions';
import { useChildSession } from '@/app/hooks/useChildSession';
import BottomNav from '@/app/components/BottomNav';
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

function MissionCard({
  mission,
  onComplete,
  onDelete,
}: {
  mission: Mission;
  onComplete?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
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
    <div
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
    </div>
  );
}

function EmptyState({ tab }: { tab: 'active' | 'completed' }) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '48px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <span style={{ fontSize: 64 }}>{tab === 'active' ? '🌊' : '🏆'}</span>
      <p
        style={{
          color: 'var(--tt-text-secondary)',
          fontSize: 17,
          fontWeight: 600,
          textShadow: '0 1px 4px rgba(0,0,0,0.4)',
          margin: 0,
        }}
      >
        {tab === 'active' ? 'No active missions yet!' : 'No completed missions yet.'}
      </p>
      <p
        style={{
          color: 'var(--tt-text-muted)',
          fontSize: 14,
          margin: 0,
          maxWidth: 280,
        }}
      >
        {tab === 'active'
          ? 'Talk to Shelly and she might suggest a mission just for you!'
          : 'Complete an active mission and it will appear here.'}
      </p>
    </div>
  );
}

export default function MissionsPage() {
  const { child } = useChildSession();
  const { activeMissions, completedMissions, completeMission, deleteMission } = useMissions(child?.childId);
  const [tab, setTab] = useState<'active' | 'completed'>('active');

  const displayed = tab === 'active' ? activeMissions : completedMissions;

  return (
    <main
      style={{
        position: 'relative',
        zIndex: 10,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px 16px 120px',
      }}
    >
      {/* Header */}
      <div
        style={{
          width: '100%',
          maxWidth: 560,
          display: 'flex',
          justifyContent: 'center',
          marginBottom: 28,
        }}
      >
        <h1
          style={{
            color: 'var(--tt-text-primary)',
            fontSize: 26,
            fontWeight: 800,
            textShadow: '0 2px 8px rgba(0,0,0,0.4)',
            margin: 0,
            textAlign: 'center',
          }}
        >
          🐢 My Missions
        </h1>
      </div>

      {/* Tab switcher */}
      <div
        style={{
          display: 'flex',
          background: 'rgba(0,0,0,0.25)',
          borderRadius: 14,
          padding: 4,
          marginBottom: 24,
          gap: 4,
          backdropFilter: 'blur(8px)',
        }}
      >
        {(['active', 'completed'] as const).map((t) => {
          const count = t === 'active' ? activeMissions.length : completedMissions.length;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: tab === t ? 'rgba(255,255,255,0.2)' : 'transparent',
                border: 'none',
                borderRadius: 10,
                color: tab === t ? 'var(--tt-text-primary)' : 'var(--tt-text-muted)',
                padding: '10px 24px',
                fontSize: 15,
                fontWeight: tab === t ? 700 : 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {t === 'active' ? <><Zap size={14} strokeWidth={2.5} /> Active</> : <><CheckCircle2 size={14} strokeWidth={2.5} /> Completed</>}
              {count > 0 && (
                <span
                  style={{
                    background: tab === t ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)',
                    borderRadius: 20,
                    padding: '1px 8px',
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--tt-text-primary)',
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Section tile */}
      <div
        style={{
          width: '100%',
          maxWidth: 560,
          marginBottom: 16,
          padding: '12px 20px',
          borderRadius: 14,
          background: 'rgba(0,0,0,0.25)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.15)',
        }}
      >
        <h2
          style={{
            color: 'var(--tt-text-primary)',
            fontSize: 18,
            fontWeight: 700,
            margin: 0,
            textShadow: '0 1px 4px rgba(0,0,0,0.4)',
          }}
        >
          {tab === 'active' ? "Today's Missions" : 'Completed'}
        </h2>
      </div>

      {/* Mission list */}
      <div
        style={{
          width: '100%',
          maxWidth: 560,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {displayed.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          displayed.map((m) => (
            <MissionCard
              key={m.id}
              mission={m}
              onComplete={tab === 'active' ? completeMission : undefined}
              onDelete={deleteMission}
            />
          ))
        )}
      </div>

      <BottomNav />
    </main>
  );
}
