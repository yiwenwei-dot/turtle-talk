'use client';

import { useEffect } from 'react';
import { Home, Leaf, Heart, MessageCircle, Mail, Flag } from 'lucide-react';
import { useChildSession } from '@/app/hooks/useChildSession';
import MenuItem from './MenuItem';

const ITEMS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/garden', label: 'My Garden', icon: Leaf },
  { href: '/appreciation/wish-list', label: 'Wish List', icon: Heart },
  { href: '/talk', label: 'Conversation', icon: MessageCircle },
  { href: '/missions', label: 'Missions', icon: Flag },
  { href: '/messages', label: 'Messages', icon: Mail },
] as const;

export interface MenuProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLogin?: () => void;
}

export default function Menu({ isOpen, onClose, onOpenLogin }: MenuProps) {
  const { child, refetch } = useChildSession();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const avatarName = child?.firstName?.trim() || 'Explorer';
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    avatarName,
  )}&size=64&background=00CFB9&color=fff`;

  const displayName = child ? `${child.firstName}` : 'Explorer!';

  const handleLoginClick = () => {
    onClose();
    if (onOpenLogin) onOpenLogin();
  };

  const handleLogoutClick = async () => {
    try {
      await fetch('/api/child-logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // ignore network errors; refetch will clear session if needed
    } finally {
      await refetch();
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
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
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 320,
          background: 'var(--v2-surface)',
          borderRadius: 'var(--v2-radius-card)',
          boxShadow: 'var(--v2-shadow-menu)',
          padding: '16px 12px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            marginBottom: 8,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '8px 10px',
              borderRadius: 'var(--v2-radius-card)',
              background: 'var(--v2-glass)',
              border: '1px solid var(--v2-glass-border)',
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                overflow: 'hidden',
                flexShrink: 0,
                background: 'rgba(0,0,0,0.02)',
              }}
            >
              <img
                src={avatarUrl}
                alt=""
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            </div>
            <div>
              <div
                style={{
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: 'var(--v2-text-primary)',
                }}
              >
                {displayName}
              </div>
              <div
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  color: 'var(--v2-text-muted)',
                  marginTop: 2,
                }}
              >
                {child ? 'Logged in' : 'Not logged in'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={child ? handleLogoutClick : handleLoginClick}
            style={{
              alignSelf: 'flex-start',
              padding: '6px 14px',
              borderRadius: '9999px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 700,
              color: child ? '#ffffff' : 'var(--v2-primary-dark)',
              background: child ? 'var(--v2-end-call-red)' : 'rgba(0, 207, 185, 0.12)',
              boxShadow: 'var(--v2-shadow-card)',
            }}
          >
            {child ? 'Log out' : 'Log in'}
          </button>
        </div>

        {ITEMS.map((item) => (
          <MenuItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            onClick={onClose}
          />
        ))}
      </div>
    </div>
  );
}
