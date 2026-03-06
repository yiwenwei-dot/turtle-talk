'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ChevronDown, Users, UserPlus, LogOut } from 'lucide-react';
import type { Child } from './ChildSwitcher';
import { ChildSwitcher } from './ChildSwitcher';
import { ChildrenModal } from './ChildrenModal';

export interface ParentMe {
  id: string;
  email: string | null;
  phone: string | null;
  displayName: string;
}

interface ParentHeaderProps {
  children: Child[];
  activeChild: Child | null;
  onSelectChild: (child: Child) => void;
  onChildrenChange: () => void;
  childrenModalOpen: boolean;
  onOpenChildrenModal: () => void;
  onCloseChildrenModal: () => void;
}

export function ParentHeader({
  children,
  activeChild,
  onSelectChild,
  onChildrenChange,
  childrenModalOpen,
  onOpenChildrenModal,
  onCloseChildrenModal,
}: ParentHeaderProps) {
  const router = useRouter();
  const [me, setMe] = useState<ParentMe | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/parent/me', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setMe(data));
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleLogOff() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setDropdownOpen(false);
    router.push('/');
    router.refresh();
  }

  const label = me?.displayName || me?.email || me?.phone || 'Parent';
  const initial = (label === 'Parent' ? 'P' : label[0]).toUpperCase();

  return (
    <>
      <header
        className="parent-dashboard"
        style={{
          background: 'var(--pd-header-bg)',
          backdropFilter: 'saturate(180%) blur(20px)',
          WebkitBackdropFilter: 'saturate(180%) blur(20px)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
          padding: '0 20px',
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 17, fontWeight: 600, color: 'var(--pd-text-primary)', letterSpacing: '-0.02em' }}>
            Parent Dashboard
          </span>
          {activeChild && children.length > 0 && (
            <ChildSwitcher
              children={children}
              activeChild={activeChild}
              onSelect={onSelectChild}
            />
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Visible sign-out button */}
          <button
            type="button"
            onClick={handleLogOff}
            title="Sign out"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 20,
              border: '1px solid var(--pd-card-border)',
              background: 'var(--pd-surface-soft)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--pd-text-secondary)',
            }}
          >
            <LogOut size={14} />
            <span>Sign out</span>
          </button>

          {/* Account dropdown */}
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setDropdownOpen((o) => !o)}
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 10px 6px 6px',
                borderRadius: 24,
                border: '1px solid var(--pd-card-border)',
                background: 'var(--pd-surface-soft)',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                color: 'var(--pd-text-primary)',
              }}
            >
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'var(--pd-accent)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {initial}
              </span>
              <ChevronDown size={15} style={{ flexShrink: 0, opacity: 0.6 }} />
            </button>

            {dropdownOpen && (
              <div
                role="menu"
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 8,
                  minWidth: 220,
                  background: 'var(--pd-surface-overlay)',
                  backdropFilter: 'saturate(180%) blur(20px)',
                  WebkitBackdropFilter: 'saturate(180%) blur(20px)',
                  border: '1px solid var(--pd-card-border)',
                  borderRadius: 14,
                  boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                  padding: '8px 0',
                  zIndex: 50,
                }}
              >
                <div
                  style={{
                    padding: '10px 14px',
                    fontSize: 13,
                    color: 'var(--pd-text-tertiary)',
                    borderBottom: '1px solid var(--pd-card-border)',
                  }}
                >
                  {me?.email || me?.phone || 'Signed in'}
                </div>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setDropdownOpen(false);
                    onOpenChildrenModal();
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontSize: 14,
                    color: 'var(--pd-text-primary)',
                    textAlign: 'left',
                  }}
                >
                  <Users size={18} />
                  Children
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled
                  title="Coming soon"
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'not-allowed',
                    fontSize: 14,
                    color: 'var(--pd-text-tertiary)',
                    textAlign: 'left',
                    opacity: 0.5,
                  }}
                >
                  <UserPlus size={18} />
                  Co-parent
                  <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, background: 'var(--pd-surface-soft)', border: '1px solid var(--pd-card-border)', borderRadius: 4, padding: '1px 5px', letterSpacing: '0.03em' }}>
                    Soon
                  </span>
                </button>
                <div style={{ borderTop: '1px solid var(--pd-card-border)', margin: '4px 0' }} />
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogOff}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontSize: 14,
                    color: 'var(--pd-error)',
                    textAlign: 'left',
                  }}
                >
                  <LogOut size={18} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <ChildrenModal
        open={childrenModalOpen}
        onClose={onCloseChildrenModal}
        children={children}
        activeChild={activeChild}
        onSelectChild={onSelectChild}
        onChildrenChange={onChildrenChange}
      />
    </>
  );
}
