'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Gift, MessageCircle } from 'lucide-react';

const HOME_ITEM = { href: '/', icon: Home, label: 'Home', color: '#06b6d4' };
const WISH_LIST_ITEM = { href: '/appreciation/wish-list', icon: Gift, label: 'Wish list', color: '#f97316' };
const MESSAGES_ITEM = { href: '/messages', icon: MessageCircle, label: 'Messages', color: '#a855f7' };

function NavItem({
  href,
  icon: Icon,
  label,
  color,
  active,
}: {
  href: string;
  icon: typeof Home;
  label: string;
  color: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
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

export default function AppreciationBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="bottom-nav appreciation-bottom-nav"
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
      <NavItem {...HOME_ITEM} active={pathname === HOME_ITEM.href} />
      <NavItem {...WISH_LIST_ITEM} active={pathname === WISH_LIST_ITEM.href} />
      <NavItem {...MESSAGES_ITEM} active={pathname === MESSAGES_ITEM.href} />
    </nav>
  );
}
