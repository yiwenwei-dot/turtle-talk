'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { User, Lock } from 'lucide-react';
import { useChildSession } from '@/app/hooks/useChildSession';
import { useTree } from '@/app/hooks/useTree';
import { useEncouragement } from '@/app/hooks/useEncouragement';
import { useWishList } from '@/app/hooks/useWishList';
import ChildLoginModal from '@/app/components/ChildLoginModal';
import ChristmasTree from '@/app/appreciation/ChristmasTree';
import DecorationBox from '@/app/appreciation/DecorationBox';
import { useLocalTree } from '@/app/hooks/useLocalTree';
import { usePersonalMemory } from '@/app/hooks/usePersonalMemory';

const TREE_SLOTS = 10;

export default function AppreciationPageInner() {
  const searchParams = useSearchParams();
  const { child, refetch: refetchSession } = useChildSession();
  const { tree, isLoading: treeLoading, refetch: refetchTree, placeOnTree } = useTree();
  const { items: encouragementItems, refetch: refetchEncouragement } = useEncouragement();
  const { items: wishListItems, isLoading: wishListLoading, refetch: refetchWishList } = useWishList(null, {
    fetchWhenChildIdNull: true,
  });
  const [selectedEncouragementId, setSelectedEncouragementId] = useState<string | null>(null);
  const [isPlacing, setIsPlacing] = useState(false);
  const [unlockToast, setUnlockToast] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [decorationModalOpen, setDecorationModalOpen] = useState(false);

  // Guest (no-login) path — localStorage tree + mission-earned decorations
  const { childName } = usePersonalMemory();
  const {
    placedDecorations: localPlacedDecorations,
    unplacedDecorations,
    placedCount: localPlacedCount,
    growthStage: localGrowthStage,
    placeDecoration,
  } = useLocalTree();

  // Open decoration picker when nav gift link is used (?open=decorate)
  useEffect(() => {
    if (searchParams.get('open') === 'decorate') setDecorationModalOpen(true);
  }, [searchParams]);

  const isGuest = !child;
  const growthStage = isGuest ? localGrowthStage : (tree?.growth_stage ?? 0);
  const placedDecorations = isGuest ? localPlacedDecorations : (tree?.placed_decorations ?? []);
  const placedCount = isGuest ? localPlacedCount : (tree?.placed_count ?? 0);
  const displayItems: { id: string; emoji: string }[] = isGuest ? unplacedDecorations : encouragementItems;

  const handlePlaceOnTree = useCallback(
    async (itemId: string) => {
      if (isPlacing) return;
      if (isGuest) {
        placeDecoration(itemId);
        setSelectedEncouragementId(null);
        setDecorationModalOpen(false);
        return;
      }
      setIsPlacing(true);
      try {
        const result = await placeOnTree(itemId);
        setSelectedEncouragementId(null);
        refetchTree();
        refetchEncouragement();
        refetchWishList();
        if (result.unlocked) setUnlockToast(true);
      } catch (e) {
        console.error('[Appreciation] placeOnTree', e);
      } finally {
        setIsPlacing(false);
      }
    },
    [isPlacing, isGuest, placeDecoration, placeOnTree, refetchTree, refetchEncouragement, refetchWishList]
  );

  const progressPercent = Math.min(100, (placedCount / TREE_SLOTS) * 100);

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
            {isGuest ? `${childName ?? 'Explorer'}'s Tree` : 'My Tree'}
          </h1>
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="tt-tap-shake"
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
            {isGuest ? 'Decorate it with your mission rewards!' : 'Decorate it with cheers from your grown-up!'}
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
                  marginBottom: 6,
                  fontSize: '0.9rem',
                  color: 'var(--tt-text-primary)',
                  fontWeight: 600,
                }}
              >
                {placedCount} of {TREE_SLOTS} — fill it up to unlock a wish!
              </p>
              {/* Colorful progress bar to 100% tree decoration */}
              <div
                role="progressbar"
                aria-valuenow={placedCount}
                aria-valuemin={0}
                aria-valuemax={TREE_SLOTS}
                aria-label={`Tree decoration progress ${placedCount} of ${TREE_SLOTS}`}
                style={{
                  width: '100%',
                  maxWidth: 200,
                  height: 14,
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.2)',
                  overflow: 'hidden',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)',
                }}
              >
                <div
                  style={{
                    width: `${progressPercent}%`,
                    height: '100%',
                    borderRadius: 10,
                    background: 'linear-gradient(90deg, #fbbf24, #f59e0b, #22c55e, #16a34a)',
                    boxShadow: '0 0 12px rgba(251,191,36,0.4)',
                    transition: 'width 0.4s ease-out',
                  }}
                />
              </div>
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
            <button
              type="button"
              className="tt-tap-shake"
              onClick={() => setDecorationModalOpen(true)}
              style={{
                flexShrink: 0,
                width: '100%',
                maxWidth: 200,
                padding: 16,
                borderRadius: 16,
                background: 'rgba(120,53,15,0.4)',
                border: '2px solid rgba(180,83,9,0.6)',
                boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)',
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--tt-text-primary)' }}>
                Pick a cheer and put it on your tree
              </p>
              <p style={{ margin: '8px 0 0', fontSize: '1.2rem' }}>🎁</p>
            </button>
          </div>

          {/* Wish list below the tree — each tree completed unlocks an item (padlock for locked) */}
          <section
            aria-label="My wish list"
            style={{
              width: '100%',
              marginTop: 8,
              paddingTop: 24,
              borderTop: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            {isGuest ? (
              <p
                style={{
                  color: 'var(--tt-text-secondary)',
                  fontSize: '0.9rem',
                  textAlign: 'center',
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                Complete more missions with Shelly to earn more decorations!
              </p>
            ) : (
              <>
                <h2
                  style={{
                    margin: '0 0 12px',
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    color: 'var(--tt-text-primary)',
                    textAlign: 'center',
                  }}
                >
                  My Wish List
                </h2>
                <p
                  style={{
                    margin: '0 0 16px',
                    fontSize: '0.85rem',
                    color: 'var(--tt-text-secondary)',
                    textAlign: 'center',
                  }}
                >
                  Fill your tree to unlock wishes!
                </p>
                {wishListLoading ? (
                  <p style={{ color: 'var(--tt-text-secondary)', fontSize: '0.9rem', textAlign: 'center' }}>
                    Loading…
                  </p>
                ) : wishListItems.length === 0 ? (
                  <p
                    style={{
                      color: 'var(--tt-text-secondary)',
                      fontSize: '0.9rem',
                      textAlign: 'center',
                      lineHeight: 1.5,
                    }}
                  >
                    Your grown-up can add wishes for you. Decorate your tree to unlock them!
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {wishListItems.map((item) => {
                      const locked = !item.unlocked_at;
                      return (
                        <div
                          key={item.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '14px 18px',
                            borderRadius: 14,
                            background: locked
                              ? 'rgba(255,255,255,0.06)'
                              : 'rgba(34,197,94,0.18)',
                            border: locked
                              ? '1px solid rgba(255,255,255,0.15)'
                              : '2px solid rgba(34,197,94,0.45)',
                            color: locked ? 'var(--tt-text-secondary)' : 'var(--tt-text-primary)',
                            fontSize: '1rem',
                            fontWeight: locked ? 500 : 600,
                          }}
                        >
                          {locked ? (
                            <Lock size={20} style={{ flexShrink: 0, opacity: 0.8 }} aria-hidden />
                          ) : null}
                          <span>{locked ? '???' : item.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </section>
        </div>

        {/* Decoration picker modal — primary action: select earned cheers/gifts and decorate tree */}
        {decorationModalOpen && (
          <>
            <div
              role="presentation"
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.6)',
                zIndex: 35,
              }}
              onClick={() => setDecorationModalOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Pick a cheer or gift to put on your tree"
              style={{
                position: 'fixed',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 36,
                width: 'calc(100% - 32px)',
                maxWidth: 340,
                padding: 20,
                borderRadius: 20,
                background: 'rgba(20, 45, 80, 0.96)',
                border: '1px solid rgba(255,255,255,0.2)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <p
                style={{
                  margin: '0 0 16px',
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: 'var(--tt-text-primary)',
                  textAlign: 'center',
                }}
              >
                Pick earned cheers & gifts to put on your tree
              </p>
              <DecorationBox
                items={displayItems}
                selectedId={selectedEncouragementId}
                onSelect={setSelectedEncouragementId}
                onPlaceOnTree={handlePlaceOnTree}
                isPlacing={isPlacing}
                emptyMessage={isGuest ? 'Complete a mission to earn your first decoration!' : undefined}
              />
              <button
                type="button"
                onClick={() => setDecorationModalOpen(false)}
                style={{
                  marginTop: 12,
                  width: '100%',
                  padding: '10px 16px',
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.25)',
                  background: 'transparent',
                  color: 'var(--tt-text-primary)',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          </>
        )}

        {unlockToast && (
          <button
            type="button"
            role="alert"
            aria-label="Dismiss"
            className="tt-success-pop"
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
