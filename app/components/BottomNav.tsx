'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Leaf, Star, Phone, Mic, MicOff, PhoneOff, RotateCcw } from 'lucide-react';
import JournalModal from '@/app/components/JournalModal';

export interface TalkNavProps {
  state: 'idle' | 'connecting' | 'listening' | 'recording' | 'processing' | 'speaking' | 'muted' | 'ended';
  isMuted: boolean;
  isMeaningful: boolean;
  hasError: boolean;
  onStart: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  onContinue: () => void;
}

interface BottomNavProps {
  talkProps?: TalkNavProps;
}

const LONG_PRESS_MS = 500;
const ACTIVE_CALL_STATES = new Set(['listening', 'recording', 'processing', 'speaking']);

const LEFT_ITEM = { href: '/v2/garden', icon: Leaf, label: 'Garden', color: '#06b6d4' };
const RIGHT_ITEM  = { href: '/v2/missions', icon: Star, label: 'My Missions', color: '#f97316' };

function NavItem({ href, icon: Icon, label, color, active }: {
  href: string; icon: typeof Home; label: string; color: string; active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="tt-tap-shake"
      style={{ textDecoration: 'none', flex: 1, display: 'flex', justifyContent: 'center' }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          minHeight: 44,
          padding: '8px 12px',
          opacity: active ? 1 : 0.6,
          transition: 'opacity 0.15s',
        }}
      >
        <span className="tt-icon-wiggle" style={{ display: 'inline-flex' }}>
          <Icon size={22} color={active ? color : 'var(--tt-text-primary)'} strokeWidth={active ? 2.5 : 1.75} aria-hidden />
        </span>
        <span
          className="nav-item-label"
          style={{
            fontSize: '0.85rem',
            fontWeight: 700,
            color: active ? color : 'var(--tt-text-secondary)',
            letterSpacing: '0.01em',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </span>
      </div>
    </Link>
  );
}

export default function BottomNav({ talkProps }: BottomNavProps = {}) {
  const pathname = usePathname();
  const [talkExpanded, setTalkExpanded] = useState(false);
  const [journalModalOpen, setJournalModalOpen] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressHandledRef = useRef(false);

  const isCallActive = talkProps ? ACTIVE_CALL_STATES.has(talkProps.state) : false;
  const isConnecting = talkProps?.state === 'connecting';
  const isEnded = talkProps?.state === 'ended';
  const isIdle = !talkProps || talkProps.state === 'idle';

  const holdEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endCallHoldingRef = useRef(false);
  const [endCallHoldingDisplay, setEndCallHoldingDisplay] = useState(false);

  useEffect(() => {
    return () => {
      if (holdEndTimerRef.current) clearTimeout(holdEndTimerRef.current);
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, []);

  const showTalkLabel = talkExpanded || (talkProps?.state === 'idle');

  const leftItem = LEFT_ITEM;

  const handleTalkPointerDown = () => {
    longPressHandledRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressHandledRef.current = true;
      longPressTimerRef.current = null;
      setJournalModalOpen(true);
    }, LONG_PRESS_MS);
  };

  const handleTalkPointerUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleTalkClick = (e: React.MouseEvent) => {
    if (longPressHandledRef.current) {
      e.preventDefault();
      longPressHandledRef.current = false;
    }
  };

  const handleEndPointerDown = () => {
    holdEndTimerRef.current = setTimeout(() => {
      holdEndTimerRef.current = null;
      endCallHoldingRef.current = true;
      setEndCallHoldingDisplay(true);
      talkProps?.onStart(); // retry = restart
      setTimeout(() => {
        endCallHoldingRef.current = false;
        setEndCallHoldingDisplay(false);
      }, 1500);
    }, 2000);
  };

  const handleEndPointerUp = () => {
    if (holdEndTimerRef.current) {
      clearTimeout(holdEndTimerRef.current);
      holdEndTimerRef.current = null;
    }
  };

  const handleEndClick = () => {
    if (!endCallHoldingRef.current) talkProps?.onEnd();
  };

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
    padding: '16px 20px max(14px, env(safe-area-inset-bottom))',
    borderRadius: 32,
    background: 'rgba(8, 22, 48, 0.88)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.12)',
    boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
  };

  if (talkProps && !isIdle) {
    const { isMuted, isMeaningful, hasError, onToggleMute, onContinue } = talkProps;

    // ── Post-call bar ─────────────────────────────────────────────────────────
    if (isEnded) {
      return (
        <nav className="bottom-nav" style={{ ...BAR_STYLE, justifyContent: 'stretch' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 12 }}>
            {/* My Missions */}
            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
              <Link href="/v2/missions" aria-label="My Missions" className="tt-tap-shake" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, minWidth: 44, padding: '10px 16px', borderRadius: 9999, border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: '0.9rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  <Star size={20} strokeWidth={2} aria-hidden />
                  <span>My Missions</span>
                </div>
              </Link>
            </div>
            {/* Keep talking */}
            <button
              type="button"
              className="tt-tap-shake active:scale-[0.98] active:opacity-90"
              onClick={onContinue}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44, padding: '10px 20px', borderRadius: 9999, background: isMeaningful ? 'linear-gradient(135deg, #b45309, #d97706)' : 'linear-gradient(135deg, #16a34a, #22c55e)', boxShadow: isMeaningful ? '0 4px 20px rgba(217,119,6,0.5)' : '0 4px 20px rgba(22,163,74,0.5)', border: '2px solid rgba(255,255,255,0.25)', color: 'white', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              <Phone size={22} strokeWidth={2} />
              Keep talking
            </button>
            {/* Home */}
            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
              <Link href="/" aria-label="Home" className="tt-tap-shake" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, minWidth: 44, padding: '10px 16px', borderRadius: 9999, border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: '0.9rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  <Home size={20} strokeWidth={2} aria-hidden />
                  <span>Home</span>
                </div>
              </Link>
            </div>
          </div>
        </nav>
      );
    }

    // ── Connecting / active call bar ──────────────────────────────────────────
    const endGradient = isMeaningful
      ? 'linear-gradient(135deg, #b45309, #d97706)'
      : 'linear-gradient(135deg, #dc2626, #ef4444)';
    const endShadow = isMeaningful
      ? '0 4px 20px rgba(217,119,6,0.5)'
      : '0 4px 20px rgba(220,38,38,0.5)';

    return (
      <nav className="bottom-nav" style={{ ...BAR_STYLE, justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, width: '100%' }}>
          {/* Mute — left, only when call is active */}
          {isCallActive && (
            <button
              type="button"
              className="tt-tap-shake active:scale-[0.98] active:opacity-90"
              onClick={onToggleMute}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, minWidth: 44, padding: '10px 16px', borderRadius: 9999, border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer' }}
            >
              {isMuted ? <MicOff size={22} strokeWidth={2} color="#fbbf24" /> : <Mic size={22} strokeWidth={2} />}
            </button>
          )}

          {/* Center: connecting pill OR end call button */}
          {isConnecting ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44, padding: '10px 24px', borderRadius: 9999, background: 'linear-gradient(135deg, #15803d, #16a34a)', border: '2px solid rgba(255,255,255,0.25)', color: 'white', fontSize: '0.95rem', fontWeight: 700, opacity: 0.85 }}>
              <Phone size={22} strokeWidth={2} />
              Connecting…
            </div>
          ) : (
            <button
              type="button"
              className="tt-tap-shake active:scale-[0.98] active:opacity-90"
              aria-label={endCallHoldingDisplay ? 'Refreshing' : 'End call'}
              onPointerDown={handleEndPointerDown}
              onPointerUp={handleEndPointerUp}
              onPointerLeave={handleEndPointerUp}
              onClick={handleEndClick}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44, padding: '10px 24px', borderRadius: 9999, background: endCallHoldingDisplay ? 'rgba(100,100,100,0.5)' : endGradient, boxShadow: endCallHoldingDisplay ? 'none' : endShadow, border: '2px solid rgba(255,255,255,0.25)', color: 'white', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background 0.3s ease, box-shadow 0.3s ease' }}
            >
              <PhoneOff size={22} strokeWidth={2} />
              {endCallHoldingDisplay ? 'Refreshing…' : 'End call'}
            </button>
          )}

          {/* Far right: subtle error hint — decorative only, no button affordance */}
          {hasError && isCallActive && (
            <div
              aria-hidden="true"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 44, minHeight: 44, opacity: 0.35, cursor: 'default', userSelect: 'none' }}
            >
              <RotateCcw size={16} strokeWidth={2} color="white" />
            </div>
          )}
        </div>
      </nav>
    );
  }

  return (
    <nav
      className="bottom-nav"
      style={{
        position: 'fixed',
        bottom: 'max(16px, env(safe-area-inset-bottom))',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 24px)',
        maxWidth: 500,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px max(14px, env(safe-area-inset-bottom))',
        borderRadius: 32,
        background: 'rgba(8, 22, 48, 0.88)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
      }}
    >
      <NavItem {...leftItem} active={pathname === leftItem.href} />

      {/* Centre pill — mic only; short tap = brave call (/talk), long-press = /journal */}
      <Link
        href="/v2/talk"
        aria-label="Start a Brave Call with Shelly (long-press for journal)"
        className="tt-tap-shake"
        style={{
          textDecoration: 'none',
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
        onMouseEnter={() => setTalkExpanded(true)}
        onMouseLeave={() => setTalkExpanded(false)}
        onFocus={() => setTalkExpanded(true)}
        onBlur={() => setTalkExpanded(false)}
        onPointerDown={handleTalkPointerDown}
        onPointerUp={handleTalkPointerUp}
        onPointerLeave={handleTalkPointerUp}
        onClick={(e) => {
          if (talkProps && talkProps.state === 'idle') {
            e.preventDefault();
            talkProps.onStart();
          }
          handleTalkClick(e);
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: showTalkLabel ? 'auto' : 64,
            height: 64,
            padding: showTalkLabel ? '10px 22px' : 0,
            borderRadius: 9999,
            background: 'linear-gradient(135deg, #16a34a, #22c55e)',
            boxShadow: '0 4px 24px rgba(22,163,74,0.55)',
            border: '2px solid rgba(255,255,255,0.25)',
            flexShrink: 0,
            transition: 'width 0.25s ease, padding 0.25s ease, transform 0.15s ease, opacity 0.15s ease',
            overflow: 'hidden',
          }}
          className="active:scale-[0.98] active:opacity-90"
        >
          <span className="tt-icon-wiggle" style={{ display: 'inline-flex', flexShrink: 0 }}>
            <Phone size={26} color="white" strokeWidth={2} aria-hidden />
          </span>
          <span
            style={{
              fontSize: '0.95rem',
              fontWeight: 700,
              color: 'white',
              whiteSpace: 'nowrap',
              maxWidth: showTalkLabel ? 160 : 0,
              overflow: 'hidden',
              opacity: showTalkLabel ? 1 : 0,
              transition: 'max-width 0.25s ease, opacity 0.2s ease',
            }}
          >
            Brave Call with Shelly
          </span>
        </div>
      </Link>

      <NavItem {...RIGHT_ITEM} active={pathname === RIGHT_ITEM.href} />

      <JournalModal isOpen={journalModalOpen} onClose={() => setJournalModalOpen(false)} />
    </nav>
  );
}
