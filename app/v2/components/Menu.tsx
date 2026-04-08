'use client';

import { useEffect } from 'react';
import { Home, Leaf, Flag, PlayCircle } from 'lucide-react';
import { useChildSession } from '@/app/hooks/useChildSession';
import MenuItem from './MenuItem';
import packageJson from '../../../package.json';

const ITEMS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/garden', label: 'My Garden', icon: Leaf },
  { href: '/missions', label: 'Missions', icon: Flag },
  { href: '/demo', label: 'Demo', icon: PlayCircle },
] as const;

const APP_URL = 'turtletalk.io';
const APP_VERSION = packageJson.version;

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

  const displayName = child?.firstName?.trim() || 'Explorer';
  const avatarName = displayName;
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    avatarName,
  )}&size=64&background=00CFB9&color=fff`;

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
            gap: 12,
            marginBottom: 10,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: 10,
              padding: '12px 10px',
              borderRadius: 'var(--v2-radius-card)',
              background: 'var(--v2-glass)',
              border: '1px solid var(--v2-glass-border)',
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
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
            <div
              style={{
                fontSize: '1rem',
                fontWeight: 800,
                color: 'var(--v2-text-primary)',
                lineHeight: 1.1,
              }}
            >
              {displayName}
            </div>
          </div>
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

        <div
          aria-hidden
          style={{
            height: 1,
            background: 'rgba(0,0,0,0.06)',
            margin: '6px 10px 2px',
          }}
        />

        <button
          type="button"
          onClick={child ? handleLogoutClick : handleLoginClick}
          style={{
            alignSelf: 'center',
            padding: '6px 14px',
            borderRadius: '9999px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: 700,
            color: child ? '#ffffff' : 'var(--v2-primary-dark)',
            background: child ? 'var(--v2-end-call-red)' : 'rgba(0, 207, 185, 0.12)',
            boxShadow: 'var(--v2-shadow-card)',
            marginTop: 10,
          }}
        >
          {child ? 'Sign out' : 'Log in'}
        </button>

        <div
          style={{
            marginTop: 10,
            fontSize: '0.8rem',
            fontWeight: 600,
            color: 'var(--v2-text-muted)',
            textAlign: 'center',
          }}
        >
          {APP_URL} · v{APP_VERSION}
        </div>
      </div>
    </div>
  );
}
