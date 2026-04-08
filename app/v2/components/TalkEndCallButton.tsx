'use client';

import { useState, useRef, useEffect } from 'react';
import { PhoneOff, RotateCcw, Phone } from 'lucide-react';
import confetti from 'canvas-confetti';
import type { VoiceSessionState } from '@/lib/speech/voice/types';

const ACTIVE_STATES = new Set<VoiceSessionState>([
  'listening',
  'recording',
  'processing',
  'speaking',
  'muted',
]);

const ROUND_SIZE = 56;
const EXPAND_DELAY_MS = 280;

export interface TalkEndCallButtonProps {
  state: VoiceSessionState;
  hasError: boolean;
  /** When true, show gold styling and fire confetti (mission generated during call). */
  missionGenerated?: boolean;
  /** Custom label for the idle-state "tap to talk" button. */
  label?: string;
  onEnd: () => void;
  onRetry: () => Promise<void>;
  onStart?: () => Promise<void>;
}

export default function TalkEndCallButton({
  state,
  hasError,
  missionGenerated = false,
  label = 'Tap to talk to Shelly',
  onEnd,
  onRetry,
  onStart,
}: TalkEndCallButtonProps) {
  const [expanded, setExpanded] = useState(false);
  const expandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confettiFiredRef = useRef(false);

  useEffect(() => {
    return () => {
      if (expandTimerRef.current) clearTimeout(expandTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (missionGenerated && !confettiFiredRef.current) {
      confettiFiredRef.current = true;
      const count = 80;
      const defaults = { origin: { y: 0.6 }, zIndex: 200 };
      const fire = (particleRatio: number, opts: confetti.Options) => {
        confetti({ ...defaults, ...opts, particleCount: Math.floor(count * particleRatio) });
      };
      fire(0.25, { spread: 26, startVelocity: 55 });
      fire(0.2, { spread: 60 });
      fire(0.35, { spread: 100, decay: 0.91 });
      fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92 });
      fire(0.15, { spread: 120, startVelocity: 45 });
    }
    if (!missionGenerated) confettiFiredRef.current = false;
  }, [missionGenerated]);

  const isConnecting = state === 'connecting';
  const isActive = ACTIVE_STATES.has(state);
  const isEnded = state === 'ended';
  const isIdle = state === 'idle';

  const showRetry = hasError && (isEnded || isIdle || !isActive);
  const showStart = isIdle && !hasError && onStart;
  const showEndCall = isActive || isEnded;

  const handleClick = () => {
    if (showRetry) {
      onRetry();
      return;
    }
    if (showStart) {
      onStart?.();
      return;
    }
    if (showEndCall && !isConnecting) {
      onEnd();
    }
  };

  const handlePointerEnter = () => {
    expandTimerRef.current = setTimeout(() => setExpanded(true), EXPAND_DELAY_MS);
  };

  const handlePointerLeave = () => {
    if (expandTimerRef.current) {
      clearTimeout(expandTimerRef.current);
      expandTimerRef.current = null;
    }
    setExpanded(false);
  };

  if (isConnecting) {
    return (
      <div
        className="v2-shelly-connecting"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          minHeight: ROUND_SIZE,
          padding: '12px 24px',
          borderRadius: 'var(--v2-radius-pill)',
          background: 'var(--v2-primary)',
          color: 'white',
          fontSize: '1rem',
          fontWeight: 700,
          opacity: 0.95,
        }}
        aria-live="polite"
      >
        <span style={{ fontSize: 22, lineHeight: 1 }} aria-hidden>🐢</span>
        Connecting to Shelly
      </div>
    );
  }

  if (showRetry) {
    return (
      <button
        type="button"
        className="v2-btn-nudge-green"
        onClick={handleClick}
        aria-label="Try again"
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          height: ROUND_SIZE,
          width: expanded ? 'auto' : ROUND_SIZE,
          minWidth: ROUND_SIZE,
          padding: expanded ? '0 24px' : 0,
          borderRadius: expanded ? 'var(--v2-radius-pill)' : '50%',
          background: 'var(--v2-primary)',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          fontSize: '1rem',
          fontWeight: 700,
          boxShadow: 'var(--v2-shadow-card)',
          transition: 'width 0.32s cubic-bezier(0.34, 1.56, 0.64, 1), padding 0.25s ease, transform 0.15s ease, border-radius 0.25s ease',
        }}
        onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
        onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        <RotateCcw size={22} strokeWidth={2} aria-hidden />
        <span
          style={{
            overflow: 'hidden',
            maxWidth: expanded ? 90 : 0,
            opacity: expanded ? 1 : 0,
            transition: 'max-width 0.28s ease, opacity 0.2s ease',
            whiteSpace: 'nowrap',
          }}
        >
          Try again
        </span>
      </button>
    );
  }

  if (showStart) {
    return (
      <button
        type="button"
        className="v2-btn-nudge-green v2-btn-primary-pill"
        onClick={handleClick}
        aria-label={label}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          height: ROUND_SIZE + 4,
          width: 'auto',
          minWidth: 200,
          padding: '0 32px',
          borderRadius: 'var(--v2-radius-pill)',
          background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          fontSize: '1.1rem',
          fontWeight: 700,
          boxShadow: '0 4px 20px rgba(34,197,94,0.35), 0 1px 4px rgba(0,0,0,0.1)',
          transition: 'width 0.32s cubic-bezier(0.34, 1.56, 0.64, 1), padding 0.25s ease, transform 0.15s ease, border-radius 0.25s ease',
        }}
        onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
        onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        <Phone size={22} strokeWidth={2} aria-hidden />
        <span
          style={{
            overflow: 'hidden',
            maxWidth: 'none',
            opacity: 1,
            transition: 'max-width 0.28s ease, opacity 0.2s ease',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className="v2-btn-nudge-green v2-btn-primary-pill"
      onClick={handleClick}
      aria-label="End call"
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        height: ROUND_SIZE + 4,
        width: 'auto',
        minWidth: 180,
        padding: '0 32px',
        borderRadius: 'var(--v2-radius-pill)',
        background: missionGenerated
          ? 'linear-gradient(135deg, var(--v2-gold) 0%, var(--v2-gold-dark) 100%)'
          : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
        color: 'white',
        border: 'none',
        cursor: 'pointer',
        fontSize: '1.05rem',
        fontWeight: 700,
        boxShadow: '0 4px 20px rgba(34,197,94,0.35), 0 1px 4px rgba(0,0,0,0.1)',
        transition: 'width 0.32s cubic-bezier(0.34, 1.56, 0.64, 1), padding 0.25s ease, transform 0.15s ease, border-radius 0.25s ease, background 0.3s ease',
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
      onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
    >
      <PhoneOff size={22} strokeWidth={2} aria-hidden />
      <span
        style={{
          overflow: 'hidden',
          maxWidth: 'none',
          opacity: 1,
          transition: 'max-width 0.28s ease, opacity 0.2s ease',
          whiteSpace: 'nowrap',
        }}
      >
        End call
      </span>
    </button>
  );
}
