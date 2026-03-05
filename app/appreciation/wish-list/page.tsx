'use client';

import { useState } from 'react';
import Link from 'next/link';
import { User } from 'lucide-react';
import { useChildSession } from '@/app/hooks/useChildSession';
import { useWishList } from '@/app/hooks/useWishList';
import ChildLoginModal from '@/app/components/ChildLoginModal';

export default function AppreciationWishListPage() {
  const { child, refetch: refetchSession } = useChildSession();
  const { items, isLoading } = useWishList(null, { fetchWhenChildIdNull: true });
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const isGuest = !child;
  const displayItems = isGuest ? [] : items;
  const unlocked = displayItems.filter((i) => i.unlocked_at);
  const locked = displayItems.filter((i) => !i.unlocked_at);

  return (
    <>
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
        <header
          style={{
            position: 'absolute',
            top: 24,
            left: 16,
            right: 16,
            maxWidth: 520,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 15,
          }}
        >
          <div style={{ width: 44 }} />
          <h1
            style={{
              color: 'var(--tt-text-primary)',
              fontSize: '1.6rem',
              fontWeight: 900,
              textShadow: '0 2px 8px rgba(0,0,0,0.4)',
              margin: 0,
              textAlign: 'center',
            }}
          >
            My Wish List
          </h1>
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => (isGuest ? setLoginModalOpen(true) : setProfileOpen((o) => !o))}
              aria-label={isGuest ? 'Log in' : `Logged in as ${child?.firstName ?? 'child'}`}
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                border: '2px solid rgba(255,255,255,0.25)',
                background: 'rgba(255,255,255,0.1)',
                color: 'var(--tt-text-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {child ? (
                <span style={{ fontSize: '1.5rem' }}>{child.emoji}</span>
              ) : (
                <User size={24} strokeWidth={2} />
              )}
            </button>
            {child && profileOpen && (
              <>
                <div
                  role="presentation"
                  style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                  onClick={() => setProfileOpen(false)}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: 8,
                    padding: '12px 16px',
                    borderRadius: 12,
                    background: 'rgba(8, 22, 48, 0.95)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                    zIndex: 41,
                    minWidth: 160,
                  }}
                >
                  <p style={{ margin: '0 0 10px', fontSize: '0.85rem', color: 'var(--tt-text-secondary)' }}>
                    {child.emoji} {child.firstName}
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      await fetch('/api/child-logout', { method: 'POST', credentials: 'include' });
                      setProfileOpen(false);
                      refetchSession();
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.2)',
                      background: 'transparent',
                      color: 'var(--tt-text-primary)',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                    }}
                  >
                    Log out
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        <div style={{ marginTop: 56, width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <p
            style={{
              color: 'var(--tt-text-secondary)',
              fontSize: '0.95rem',
              margin: '0 0 24px',
              textAlign: 'center',
            }}
          >
            Grow your tree to unlock wishes!
          </p>
          {isGuest && (
            <p
              style={{
                color: 'var(--tt-text-secondary)',
                fontSize: '0.85rem',
                margin: '0 0 16px',
                textAlign: 'center',
                opacity: 0.9,
              }}
            >
              Log in to see your wish list
            </p>
          )}

          {!isGuest && isLoading ? (
            <p style={{ color: 'var(--tt-text-secondary)' }}>Loading…</p>
          ) : displayItems.length === 0 ? (
            <p
              style={{
                color: 'var(--tt-text-secondary)',
                fontSize: '1rem',
                textAlign: 'center',
                lineHeight: 1.6,
              }}
            >
              Your grown-up can add wishes for you. Keep decorating your tree to unlock them!
            </p>
          ) : (
            <div
              style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              {unlocked.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: '16px 20px',
                    borderRadius: 16,
                    background: 'rgba(34,197,94,0.2)',
                    border: '2px solid rgba(34,197,94,0.5)',
                    color: 'var(--tt-text-primary)',
                    fontSize: '1.05rem',
                    fontWeight: 600,
                  }}
                >
                  {item.label}
                </div>
              ))}
              {locked.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: '16px 20px',
                    borderRadius: 16,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: 'var(--tt-text-secondary)',
                    fontSize: '1rem',
                  }}
                >
                  ??? — Keep growing your tree!
                </div>
              ))}
            </div>
          )}

          <Link
            href="/appreciation"
            style={{
              display: 'inline-block',
              marginTop: 28,
              padding: '12px 24px',
              borderRadius: 14,
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.25)',
              color: 'var(--tt-text-primary)',
              fontSize: '0.95rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Back to my tree
          </Link>
        </div>
      </main>
      <ChildLoginModal
        open={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onSuccess={refetchSession}
      />
    </>
  );
}
