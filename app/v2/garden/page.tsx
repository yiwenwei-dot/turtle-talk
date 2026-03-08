'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import MenuButton from '@/app/v2/components/MenuButton';
import { useChildSession } from '@/app/hooks/useChildSession';
import { useTree } from '@/app/hooks/useTree';
import { useEncouragement } from '@/app/hooks/useEncouragement';
import { useLocalTree } from '@/app/hooks/useLocalTree';
import { usePersonalMemory } from '@/app/hooks/usePersonalMemory';

type GiftSource = 'parent' | 'mission';

interface GiftGroup {
  emoji: string;
  items: { id: string; emoji: string }[];
  count: number;
}

function groupByEmoji(items: { id: string; emoji: string }[]): GiftGroup[] {
  const byEmoji = new Map<string, { id: string; emoji: string }[]>();
  for (const item of items) {
    const list = byEmoji.get(item.emoji) ?? [];
    list.push(item);
    byEmoji.set(item.emoji, list);
  }
  return Array.from(byEmoji.entries()).map(([emoji, items]) => ({
    emoji,
    items,
    count: items.length,
  }));
}

export default function V2GardenPage() {
  const { child } = useChildSession();
  const { tree, isLoading: treeLoading, refetch: refetchTree, placeOnTree } = useTree();
  const { items: encouragementItems, refetch: refetchEncouragement } = useEncouragement();
  // Guest: use default guest child for demo (legacy localStorage keys). Logged-in: use session childId.
  const guestChildId = child?.childId ?? 'default';
  const { childName } = usePersonalMemory(guestChildId);
  const {
    unplacedDecorations,
    placeDecoration: placeLocalDecoration,
  } = useLocalTree(guestChildId);

  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<{ source: GiftSource; id: string } | null>(null);
  const [isPlacing, setIsPlacing] = useState(false);

  const isGuest = !child;

  const parentGroups = useMemo(() => groupByEmoji(encouragementItems), [encouragementItems]);
  const missionGroups = useMemo(() => groupByEmoji(unplacedDecorations), [unplacedDecorations]);

  const handlePlace = useCallback(async () => {
    if (!selected || isPlacing) return;
    if (selected.source === 'mission') {
      placeLocalDecoration(selected.id);
      setSelected(null);
      setModalOpen(false);
      return;
    }
    setIsPlacing(true);
    try {
      await placeOnTree(selected.id);
      setSelected(null);
      setModalOpen(false);
      refetchTree();
      refetchEncouragement();
    } catch (e) {
      console.error('[V2Garden] placeOnTree', e);
    } finally {
      setIsPlacing(false);
    }
  }, [selected, isPlacing, placeLocalDecoration, placeOnTree, refetchTree, refetchEncouragement]);

  useEffect(() => {
    if (!modalOpen) setSelected(null);
  }, [modalOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modalOpen) setModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalOpen]);

  const hasAnyGifts = parentGroups.length > 0 || missionGroups.length > 0;
  const canSelect = selected !== null;

  return (
    <>
      <MenuButton />

      <main
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: 'max(24px, env(safe-area-inset-top)) 24px max(120px, calc(24px + env(safe-area-inset-bottom)))',
          maxWidth: 500,
          margin: '0 auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 24,
            width: '100%',
            flex: 1,
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: '1.5rem',
              fontWeight: 800,
              color: 'var(--v2-text-primary)',
              textAlign: 'center',
            }}
          >
            {isGuest ? `${childName ?? 'Explorer'}'s Tree` : 'My Tree'}
          </h1>

          {treeLoading && !isGuest ? (
            <p style={{ color: 'var(--v2-text-muted)', fontSize: '0.95rem' }}>Loading tree…</p>
          ) : (
            <div
              style={{
                width: '100%',
                maxWidth: 300,
                aspectRatio: '714 / 860',
                position: 'relative',
                flexShrink: 0,
              }}
            >
              <Image
                src="/assets/appreciation-tree.svg"
                alt=""
                fill
                sizes="(max-width: 500px) 300px, 60vw"
                style={{ objectFit: 'contain' }}
                priority
              />
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          aria-label="Decorate tree"
          style={{
            marginTop: 'auto',
            width: '100%',
            maxWidth: 240,
            padding: '16px 24px',
            borderRadius: 'var(--v2-radius-card)',
            border: 'none',
            background: 'var(--v2-primary)',
            color: '#ffffff',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: 'var(--v2-shadow-card)',
            transition: 'transform var(--v2-transition-fast), box-shadow var(--v2-transition-fast)',
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          Decorate tree
        </button>
      </main>

      {modalOpen && (
        <>
          <div
            role="presentation"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 100,
              background: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(4px)',
            }}
            onClick={() => setModalOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="decorate-modal-title"
            aria-label="Pick a gift to put on your tree"
            style={{
              position: 'fixed',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 101,
              width: 'calc(100% - 32px)',
              maxWidth: 360,
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--v2-surface)',
              borderRadius: 'var(--v2-radius-card)',
              boxShadow: 'var(--v2-shadow-menu)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '20px 20px 12px',
                borderBottom: '1px solid var(--v2-glass-border)',
                position: 'relative',
              }}
            >
              <h2
                id="decorate-modal-title"
                style={{
                  margin: 0,
                  fontSize: '1.125rem',
                  fontWeight: 700,
                  color: 'var(--v2-text-primary)',
                  textAlign: 'center',
                  paddingRight: 36,
                }}
              >
                Pick a gift to put on your tree
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close"
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--v2-text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color var(--v2-transition-fast), background var(--v2-transition-fast)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--v2-glass)';
                  e.currentTarget.style.color = 'var(--v2-text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--v2-text-muted)';
                }}
              >
                <X size={22} strokeWidth={2.5} />
              </button>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
              }}
            >
              {!child && (
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.875rem',
                    color: 'var(--v2-text-muted)',
                    textAlign: 'center',
                  }}
                >
                  Log in to see gifts from your grown-up.
                </p>
              )}

              {child && (
                <section aria-label="From your grown-up">
                  <h3
                    style={{
                      margin: '0 0 10px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      color: 'var(--v2-text-muted)',
                    }}
                  >
                    From your grown-up
                  </h3>
                  {parentGroups.length === 0 ? (
                    <p
                      style={{
                        margin: 0,
                        fontSize: '0.9rem',
                        color: 'var(--v2-text-secondary)',
                      }}
                    >
                      No gifts from grown-up yet.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {parentGroups.map((group) => {
                        const firstId = group.items[0]?.id;
                        const isSelected = selected?.source === 'parent' && group.items.some((i) => i.id === selected.id);
                        return (
                          <button
                            key={group.emoji + firstId}
                            type="button"
                            onClick={() =>
                              setSelected((prev) =>
                                prev?.source === 'parent' && prev?.id === firstId
                                  ? null
                                  : { source: 'parent', id: firstId }
                              )
                            }
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              padding: '12px 16px',
                              borderRadius: 12,
                              border: isSelected ? '2px solid var(--v2-primary)' : '1px solid var(--v2-glass-border)',
                              background: isSelected ? 'rgba(0, 207, 185, 0.12)' : 'var(--v2-glass)',
                              color: 'var(--v2-text-primary)',
                              fontSize: '1rem',
                              cursor: 'pointer',
                              textAlign: 'left',
                            }}
                          >
                            <span style={{ fontSize: '1.5rem' }}>{group.emoji}</span>
                            {group.count > 1 && (
                              <span
                                style={{
                                  fontSize: '0.8rem',
                                  fontWeight: 600,
                                  color: 'var(--v2-text-muted)',
                                  marginLeft: 4,
                                }}
                              >
                                ×{group.count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              <section aria-label="From missions">
                <h3
                  style={{
                    margin: '0 0 10px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: 'var(--v2-text-muted)',
                  }}
                >
                  From missions
                </h3>
                {missionGroups.length === 0 ? (
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.9rem',
                      color: 'var(--v2-text-secondary)',
                    }}
                  >
                    Complete missions to earn decorations.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {missionGroups.map((group) => {
                      const firstId = group.items[0]?.id;
                      const isSelected = selected?.source === 'mission' && group.items.some((i) => i.id === selected.id);
                      return (
                        <button
                          key={group.emoji + firstId}
                          type="button"
                          onClick={() =>
                            setSelected((prev) =>
                              prev?.source === 'mission' && prev?.id === firstId
                                ? null
                                : { source: 'mission', id: firstId }
                            )
                          }
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '12px 16px',
                            borderRadius: 12,
                            border: isSelected ? '2px solid var(--v2-primary)' : '1px solid var(--v2-glass-border)',
                            background: isSelected ? 'rgba(0, 207, 185, 0.12)' : 'var(--v2-glass)',
                            color: 'var(--v2-text-primary)',
                            fontSize: '1rem',
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          <span style={{ fontSize: '1.5rem' }}>{group.emoji}</span>
                          {group.count > 1 && (
                            <span
                              style={{
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                color: 'var(--v2-text-muted)',
                                marginLeft: 4,
                              }}
                            >
                              ×{group.count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>

            {canSelect && (
              <div
                style={{
                  padding: '12px 20px 20px',
                  borderTop: '1px solid var(--v2-glass-border)',
                }}
              >
                <button
                  type="button"
                  onClick={handlePlace}
                  disabled={isPlacing}
                  aria-label="Select and put on tree"
                  style={{
                    width: '100%',
                    padding: '14px 24px',
                    borderRadius: 'var(--v2-radius-pill)',
                    border: 'none',
                    background: 'var(--v2-primary)',
                    color: '#ffffff',
                    fontSize: '1rem',
                    fontWeight: 700,
                    cursor: isPlacing ? 'wait' : 'pointer',
                    transition: 'transform var(--v2-transition-fast), opacity var(--v2-transition-fast)',
                    opacity: isPlacing ? 0.8 : 1,
                  }}
                >
                  {isPlacing ? 'Putting on tree…' : 'Select'}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
