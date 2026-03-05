'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Leaf, Star, Mic } from 'lucide-react';
import JournalModal from '@/app/components/JournalModal';

const LONG_PRESS_MS = 500;

const HOME_ITEM   = { href: '/',         icon: Home, label: 'Home',       color: '#06b6d4' };
const GARDEN_ITEM = { href: '/appreciation', icon: Leaf, label: 'Appreciation', color: '#06b6d4' };
const RIGHT_ITEM  = { href: '/missions', icon: Star, label: 'My Missions', color: '#f97316' };

function NavItem({ href, icon: Icon, label, color, active }: {
  href: string; icon: typeof Home; label: string; color: string; active: boolean;
}) {
  return (
    <Link href={href} aria-label={label} style={{ textDecoration: 'none', flex: 1, display: 'flex', justifyContent: 'center' }}>
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
        <Icon size={22} color={active ? color : 'var(--tt-text-primary)'} strokeWidth={active ? 2.5 : 1.75} aria-hidden />
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

export default function BottomNav() {
  const pathname = usePathname();
  const [talkExpanded, setTalkExpanded] = useState(false);
  const [journalModalOpen, setJournalModalOpen] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressHandledRef = useRef(false);

  const leftItem = pathname === '/' ? GARDEN_ITEM : HOME_ITEM;

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

      {/* Centre pill — mic only; short tap = /talk, long-press = /journal */}
      <Link
        href="/talk"
        aria-label="Talk to Shelly (long-press for journal)"
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
        onClick={handleTalkClick}
      >
        <div
          style={{
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
            flexShrink: 0,
            transition: 'transform 0.15s ease, opacity 0.15s ease',
          }}
          className="active:scale-[0.98] active:opacity-90"
        >
          <Mic size={22} color="white" strokeWidth={2} aria-hidden />
          <span
            style={{
              fontSize: '0.95rem',
              fontWeight: 700,
              color: 'var(--tt-text-primary)',
              whiteSpace: 'nowrap',
              maxWidth: talkExpanded ? 140 : 0,
              overflow: 'hidden',
              opacity: talkExpanded ? 1 : 0,
              transition: 'max-width 0.25s ease, opacity 0.2s ease',
            }}
          >
            Talk to Shelly
          </span>
        </div>
      </Link>

      <NavItem {...RIGHT_ITEM} active={pathname === RIGHT_ITEM.href} />

      <JournalModal isOpen={journalModalOpen} onClose={() => setJournalModalOpen(false)} />
    </nav>
  );
}
