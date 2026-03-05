'use client';

import Link from 'next/link';
import { PhoneOff, Mic, MicOff, Star, Home, RotateCcw } from 'lucide-react';

const BAR_STYLE: React.CSSProperties = {
  position: 'fixed',
  bottom: 'max(16px, env(safe-area-inset-bottom))',
  left: '50%',
  transform: 'translateX(-50%)',
  width: 'calc(100% - 24px)',
  maxWidth: 500,
  zIndex: 50,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '16px 20px max(14px, env(safe-area-inset-bottom))',
  borderRadius: 32,
  background: 'rgba(8, 22, 48, 0.88)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.12)',
  boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
};

interface TalkBottomBarProps {
  /** true = show post-call actions (Continue, My Missions, Home); false = show End call only */
  callEnded: boolean;
  onEndCall: () => void;
  onContinueConversation: () => void;
  /** In-call only: mute state and toggle (ignored when callEnded) */
  isMuted?: boolean;
  onToggleMute?: () => void;
  /** When true, show Try again button next to End call (in-call only) */
  hasError?: boolean;
  onTryAgain?: () => void;
}

export default function TalkBottomBar({
  callEnded,
  onEndCall,
  onContinueConversation,
  isMuted = false,
  onToggleMute,
  hasError = false,
  onTryAgain,
}: TalkBottomBarProps) {
  if (callEnded) {
    return (
      <nav className="talk-bottom-bar talk-bottom-bar-post-call" style={{ ...BAR_STYLE, justifyContent: 'stretch' }}>
        <div
          className="talk-bottom-bar-actions"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            gap: 12,
          }}
        >
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
            <Link
              href="/missions"
              aria-label="My Missions"
              className="tt-tap-shake"
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}
            >
              <div
                className="talk-bar-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  minHeight: 44,
                  minWidth: 44,
                  padding: '10px 16px',
                  borderRadius: 9999,
                  border: '1px solid rgba(255,255,255,0.25)',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  transition: 'transform 0.15s, opacity 0.15s',
                }}
              >
                <Star size={20} strokeWidth={2} aria-hidden />
                <span className="talk-bar-secondary-label">My Missions</span>
              </div>
            </Link>
          </div>
          <button
            type="button"
            className="tt-tap-shake active:scale-[0.98] active:opacity-90"
            onClick={onContinueConversation}
            style={{
              flex: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              minHeight: 44,
              padding: '10px 20px',
              borderRadius: 9999,
              background: 'linear-gradient(135deg, #16a34a, #22c55e)',
              boxShadow: '0 4px 20px rgba(22,163,74,0.5)',
              border: '2px solid rgba(255,255,255,0.25)',
              color: 'white',
              fontSize: '0.95rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'transform 0.15s, opacity 0.15s',
            }}
          >
            <Mic size={22} strokeWidth={2} />
            Keep talking
          </button>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <Link
              href="/"
              aria-label="Home"
              className="tt-tap-shake"
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}
            >
              <div
                className="talk-bar-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  minHeight: 44,
                  minWidth: 44,
                  padding: '10px 16px',
                  borderRadius: 9999,
                  border: '1px solid rgba(255,255,255,0.25)',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  transition: 'transform 0.15s, opacity 0.15s',
                }}
              >
                <Home size={20} strokeWidth={2} aria-hidden />
                <span className="talk-bar-secondary-label">Home</span>
              </div>
            </Link>
          </div>
        </div>
      </nav>
    );
  }

  const secondaryBtnStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    minWidth: 44,
    padding: '10px 16px',
    borderRadius: 9999,
    border: '1px solid rgba(255,255,255,0.25)',
    background: 'rgba(255,255,255,0.1)',
    color: 'white',
    cursor: 'pointer',
    transition: 'transform 0.15s, opacity 0.15s',
  };

  return (
    <nav className="talk-bottom-bar" style={BAR_STYLE}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
        }}
      >
        {onToggleMute && (
          <button
            type="button"
            className="tt-tap-shake active:scale-[0.98] active:opacity-90"
            onClick={onToggleMute}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            style={secondaryBtnStyle}
          >
            {isMuted ? (
              <MicOff size={22} strokeWidth={2} color="#fbbf24" />
            ) : (
              <Mic size={22} strokeWidth={2} />
            )}
          </button>
        )}
        {hasError && onTryAgain && (
          <button
            type="button"
            className="tt-tap-shake active:scale-[0.98] active:opacity-90"
            onClick={onTryAgain}
            aria-label="Try again"
            style={{
              ...secondaryBtnStyle,
              borderColor: 'rgba(34, 197, 94, 0.5)',
              background: 'rgba(34, 197, 94, 0.2)',
            }}
          >
            <RotateCcw size={20} strokeWidth={2} />
            Try again
          </button>
        )}
        <button
          type="button"
          className="tt-tap-shake active:scale-[0.98] active:opacity-90"
          onClick={onEndCall}
          aria-label="End call"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            minHeight: 44,
            padding: '10px 24px',
            borderRadius: 9999,
            background: 'linear-gradient(135deg, #dc2626, #ef4444)',
            boxShadow: '0 4px 20px rgba(220,38,38,0.5)',
            border: '2px solid rgba(255,255,255,0.25)',
            color: 'white',
            fontSize: '0.95rem',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'transform 0.15s, opacity 0.15s',
          }}
        >
          <PhoneOff size={22} strokeWidth={2} />
          End call
        </button>
      </div>
    </nav>
  );
}
