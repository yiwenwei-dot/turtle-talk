'use client';

import { useState, useCallback } from 'react';
import { User } from 'lucide-react';
import { useChildSession } from '@/app/hooks/useChildSession';
import { useTree } from '@/app/hooks/useTree';
import { useEncouragement } from '@/app/hooks/useEncouragement';
import ChildLoginModal from '@/app/components/ChildLoginModal';
import ChristmasTree from '@/app/appreciation/ChristmasTree';
import DecorationBox from '@/app/appreciation/DecorationBox';

const DUMMY_TREE = { growth_stage: 0, placed_count: 0, placed_decorations: [] as { emoji: string; slotId: string }[] };

export default function AppreciationPage() {
  const { child, refetch: refetchSession } = useChildSession();
  const { tree, isLoading: treeLoading, refetch: refetchTree, placeOnTree } = useTree();
  const { items: encouragementItems, refetch: refetchEncouragement } = useEncouragement();
  const [selectedEncouragementId, setSelectedEncouragementId] = useState<string | null>(null);
  const [isPlacing, setIsPlacing] = useState(false);
  const [unlockToast, setUnlockToast] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const isGuest = !child;
  const treeState = isGuest ? DUMMY_TREE : (tree ?? null);
  const growthStage = treeState?.growth_stage ?? 0;
  const placedDecorations = treeState?.placed_decorations ?? [];
  const displayItems = isGuest ? [] : encouragementItems;
  const placedCount = treeState?.placed_count ?? 0;

  const handlePlaceOnTree = useCallback(
    async (encouragementId: string) => {
      if (isPlacing || isGuest) return;
      setIsPlacing(true);
      try {
        const result = await placeOnTree(encouragementId);
        setSelectedEncouragementId(null);
        refetchTree();
        refetchEncouragement();
        if (result.unlocked) setUnlockToast(true);
      } catch (e) {
        console.error('[Appreciation] placeOnTree', e);
      } finally {
        setIsPlacing(false);
      }
    },
    [isPlacing, isGuest, placeOnTree, refetchTree, refetchEncouragement]
  );

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
              fontWeight: 800,
              textShadow: '0 2px 8px rgba(0,0,0,0.4)',
              margin: 0,
              textAlign: 'center',
              letterSpacing: '-0.02em',
            }}
          >
            My Tree
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

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 20,
            width: '100%',
            maxWidth: 520,
            marginTop: 52,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '0.95rem',
              color: 'var(--tt-text-secondary)',
              textAlign: 'center',
              maxWidth: 280,
            }}
          >
            Decorate it with cheers from your grown-up!
          </p>
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'flex-end',
              justifyContent: 'center',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {!isGuest && treeLoading ? (
                <p style={{ color: 'var(--tt-text-secondary)', fontSize: '0.95rem' }}>Loading tree…</p>
              ) : (
                <ChristmasTree growthStage={growthStage} placedDecorations={placedDecorations} />
              )}
              <p
                style={{
                  marginTop: 10,
                  fontSize: '0.9rem',
                  color: 'var(--tt-text-primary)',
                  fontWeight: 600,
                }}
              >
                {placedCount} of 10 — fill it up to unlock a wish!
              </p>
              {isGuest && (
                <p
                  style={{
                    marginTop: 4,
                    fontSize: '0.8rem',
                    color: 'var(--tt-text-secondary)',
                    opacity: 0.9,
                  }}
                >
                  Log in so your tree is saved
                </p>
              )}
            </div>
            <DecorationBox
              items={displayItems}
              selectedId={selectedEncouragementId}
              onSelect={setSelectedEncouragementId}
              onPlaceOnTree={handlePlaceOnTree}
              isPlacing={isPlacing}
            />
          </div>
        </div>

        {unlockToast && (
          <button
            type="button"
            role="alert"
            aria-label="Dismiss"
            onClick={() => setUnlockToast(false)}
            style={{
              position: 'fixed',
              bottom: 100,
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '14px 24px',
              borderRadius: 16,
              background: 'linear-gradient(135deg, #16a34a, #22c55e)',
              color: 'white',
              fontWeight: 700,
              fontSize: '0.95rem',
              zIndex: 30,
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            You unlocked a wish!
          </button>
        )}
      </main>
      <ChildLoginModal
        open={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onSuccess={refetchSession}
      />
    </>
  );
}
