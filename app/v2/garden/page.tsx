'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { X, Package, Heart, MessageCircle, Mail, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import MenuButton from '@/app/v2/components/MenuButton';
import ChristmasTreeSVG from '@/app/appreciation/ChristmasTreeSVG';
import { useChildSession } from '@/app/hooks/useChildSession';
import { useTree } from '@/app/hooks/useTree';
import { useEncouragement } from '@/app/hooks/useEncouragement';
import { useLocalTree } from '@/app/hooks/useLocalTree';
import { useMissions } from '@/app/hooks/useMissions';
import { useGardenState } from '@/app/hooks/useGardenState';
import { useGuestWishes } from '@/app/hooks/useGuestWishes';
import { useWishRounds } from '@/app/hooks/useWishRounds';
import { usePersonalMemory } from '@/app/hooks/usePersonalMemory';
import { getDeviceId } from '@/lib/db';
import type { Message } from '@/lib/speech/types';
import type { WishRoundOption } from '@/app/hooks/useWishRounds';

type GiftSource = 'parent' | 'mission';
type GardenModal = 'wish' | 'decoration' | 'missions' | 'talk' | 'treeFull' | 'messages' | 'wishList' | 'conversation' | 'wishGenerate';

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

const modalBackdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 100,
  background: 'rgba(0, 0, 0, 0.4)',
  backdropFilter: 'blur(4px)',
};

const modalDialogStyle: React.CSSProperties = {
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
};

function ModalHeader({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        padding: '20px 20px 12px',
        borderBottom: '1px solid var(--v2-glass-border)',
        position: 'relative',
      }}
    >
      <h2
        style={{
          margin: 0,
          fontSize: '1.125rem',
          fontWeight: 700,
          color: 'var(--v2-text-primary)',
          textAlign: 'center',
          paddingRight: 36,
        }}
      >
        {title}
      </h2>
      <button
        type="button"
        onClick={onClose}
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
  );
}

export default function V2GardenPage() {
  const router = useRouter();
  const { child } = useChildSession();
  const { tree, isLoading: treeLoading, refetch: refetchTree, placeOnTree } = useTree();
  const { items: encouragementItems, refetch: refetchEncouragement } = useEncouragement();
  const guestChildId = child?.childId ?? 'default';
  const { activeMissions, completedMissions } = useMissions(guestChildId);
  const {
    unplacedDecorations,
    placedDecorations: localPlacedDecorations,
    growthStage: localGrowthStage,
    placeDecoration: placeLocalDecoration,
  } = useLocalTree(guestChildId);

  const gardenState = useGardenState(!!child);
  const {
    missionsCompletedInCycle,
    activeWishRound,
    options: wishOptions,
    isLoading: gardenStateLoading,
    refetch: refetchGardenState,
    realizedCount: gardenRealizedCount,
  } = gardenState;
  const guestWishes = useGuestWishes();
  const { rounds: wishRounds, activeRoundOptions, realizedCount: roundsRealizedCount, refetch: refetchWishRounds } = useWishRounds();

  const convoGuestChildId = typeof window !== 'undefined' ? getDeviceId() : 'default';
  const { messages: localMessages } = usePersonalMemory(convoGuestChildId);
  const [convoApiMessages, setConvoApiMessages] = useState<Message[]>([]);
  const [convoApiLoading, setConvoApiLoading] = useState(false);

  const [whichModal, setWhichModal] = useState<GardenModal | null>(null);
  const [selected, setSelected] = useState<{ source: GiftSource; id: string } | null>(null);
  const [isPlacing, setIsPlacing] = useState(false);
  const [wishSelectIds, setWishSelectIds] = useState<Set<string>>(new Set());
  const [wishSubmitLoading, setWishSubmitLoading] = useState(false);
  const [wishGenerateLoading, setWishGenerateLoading] = useState(false);

  const [genPickOptions, setGenPickOptions] = useState<WishRoundOption[]>([]);
  const [genPickRoundId, setGenPickRoundId] = useState<string | null>(null);
  const [genGenerateLoading, setGenGenerateLoading] = useState(false);
  const [genSubmitLoading, setGenSubmitLoading] = useState(false);
  const [genSelectIds, setGenSelectIds] = useState<Set<string>>(new Set());
  const [realizeLoading, setRealizeLoading] = useState(false);

  const isGuest = !child;

  const parentGroups = useMemo(() => groupByEmoji(encouragementItems), [encouragementItems]);
  const missionGroups = useMemo(() => groupByEmoji(unplacedDecorations), [unplacedDecorations]);

  const isWishPicking =
    (!!child && activeWishRound?.status === 'child_picking') || (isGuest && !guestWishes.completed);
  const isWishGenerating = !!child && activeWishRound?.status === 'generating';

  const serverPlacedDecorations = tree?.placed_decorations ?? [];
  const serverGrowthStage = tree?.growth_stage ?? 0;
  const placedDecorations = isGuest ? localPlacedDecorations : serverPlacedDecorations;
  const placedCount = placedDecorations.length;
  const growthStage = isGuest ? localGrowthStage : serverGrowthStage;
  const showStar = growthStage >= 1 || !!gardenState.lastGrowthAt;

  const hasDecorationsToPlace = parentGroups.length > 0 || missionGroups.length > 0;
  const hasAnyDecorations = placedCount > 0 || hasDecorationsToPlace;
  const noMissionsAtAll = completedMissions.length === 0 && activeMissions.length === 0;

  useEffect(() => {
    if (isWishGenerating && activeWishRound?.id) {
      setWishGenerateLoading(true);
      fetch('/api/wishes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ roundId: activeWishRound.id }),
      })
        .then((res) => (res.ok ? refetchGardenState() : Promise.reject()))
        .catch(() => {})
        .finally(() => setWishGenerateLoading(false));
    }
  }, [isWishGenerating, activeWishRound?.id, refetchGardenState]);

  const openGardenAction = useCallback(() => {
    if (placedCount >= 15) {
      setWhichModal('treeFull');
      return;
    }
    if (isWishPicking) {
      setWhichModal('wish');
      return;
    }
    if (hasAnyDecorations) {
      setWhichModal('decoration');
      return;
    }
    if (noMissionsAtAll) {
      setWhichModal('talk');
      return;
    }
    setWhichModal('missions');
  }, [placedCount, isWishPicking, hasAnyDecorations, noMissionsAtAll]);

  const handlePlace = useCallback(async () => {
    if (!selected || isPlacing) return;
    if (selected.source === 'mission') {
      placeLocalDecoration(selected.id);
      setSelected(null);
      setWhichModal(null);
      return;
    }
    setIsPlacing(true);
    try {
      await placeOnTree(selected.id);
      setSelected(null);
      setWhichModal(null);
      refetchTree();
      refetchEncouragement();
    } catch (e) {
      console.error('[V2Garden] placeOnTree', e);
    } finally {
      setIsPlacing(false);
    }
  }, [selected, isPlacing, placeLocalDecoration, placeOnTree, refetchTree, refetchEncouragement]);

  const handleWishToggle = useCallback((optionId: string) => {
    setWishSelectIds((prev) => {
      const next = new Set(prev);
      if (next.has(optionId)) next.delete(optionId);
      else if (next.size < 3) next.add(optionId);
      return next;
    });
  }, []);

  const handleWishSubmit = useCallback(async () => {
    if (wishSelectIds.size !== 3 || !activeWishRound?.id || wishSubmitLoading) return;
    setWishSubmitLoading(true);
    try {
      const res = await fetch(`/api/wishes/rounds/${activeWishRound.id}/select`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ optionIds: Array.from(wishSelectIds) }),
      });
      if (res.ok) {
        setWishSelectIds(new Set());
        refetchGardenState();
        setWhichModal(null);
      }
    } finally {
      setWishSubmitLoading(false);
    }
  }, [wishSelectIds, activeWishRound?.id, wishSubmitLoading, refetchGardenState]);

  const handleRegenerateWishes = useCallback(() => {
    if (!activeWishRound?.id || wishGenerateLoading) return;
    setWishGenerateLoading(true);
    fetch('/api/wishes/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ roundId: activeWishRound.id }),
    })
      .then((res) => (res.ok ? refetchGardenState() : Promise.reject()))
      .catch(() => {})
      .finally(() => setWishGenerateLoading(false));
  }, [activeWishRound?.id, wishGenerateLoading, refetchGardenState]);

  useEffect(() => {
    if (whichModal !== 'conversation' || !child) return;
    let cancelled = false;
    setConvoApiLoading(true);
    fetch('/api/child-memory', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => { if (!cancelled && data.messages) setConvoApiMessages(data.messages); })
      .catch(() => { if (!cancelled) setConvoApiMessages([]); })
      .finally(() => { if (!cancelled) setConvoApiLoading(false); });
    return () => { cancelled = true; };
  }, [whichModal, child?.childId]);

  const openWishGenerate = useCallback(async () => {
    const activeRound = wishRounds.find((r) => r.status === 'generating' || r.status === 'child_picking');

    if (activeRound?.status === 'child_picking' && activeRoundOptions && activeRoundOptions.length === 5) {
      setGenPickRoundId(activeRound.id);
      setGenPickOptions(activeRoundOptions);
      setGenSelectIds(new Set());
      setWhichModal('wishGenerate');
      return;
    }

    setWhichModal('wishGenerate');
    setGenPickOptions([]);
    setGenPickRoundId(activeRound?.id ?? null);
    setGenSelectIds(new Set());
    setGenGenerateLoading(true);
    try {
      let roundId = activeRound?.id;
      if (!roundId) {
        const createRes = await fetch('/api/wishes/rounds', { method: 'POST', credentials: 'include' });
        const createData = await createRes.json();
        if (!createRes.ok) throw new Error(createData.error ?? 'Failed to create round');
        roundId = createData.roundId;
      }
      if (!roundId) throw new Error('No round id');
      const genRes = await fetch('/api/wishes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ roundId }),
      });
      const genData = await genRes.json();
      if (!genRes.ok) throw new Error(genData.error ?? 'Failed to generate wishes');
      setGenPickRoundId(roundId);
      setGenPickOptions(genData.options ?? []);
      refetchWishRounds();
      refetchGardenState();
    } catch (e) {
      console.error('[garden] openWishGenerate', e);
      setWhichModal(null);
    } finally {
      setGenGenerateLoading(false);
    }
  }, [wishRounds, activeRoundOptions, refetchWishRounds, refetchGardenState]);

  const handleGenToggle = useCallback((optionId: string) => {
    setGenSelectIds((prev) => {
      const next = new Set(prev);
      if (next.has(optionId)) next.delete(optionId);
      else if (next.size < 3) next.add(optionId);
      return next;
    });
  }, []);

  const handleGenSubmit = useCallback(async () => {
    if (genSelectIds.size !== 3 || !genPickRoundId || genSubmitLoading) return;
    setGenSubmitLoading(true);
    try {
      const res = await fetch(`/api/wishes/rounds/${genPickRoundId}/select`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ optionIds: Array.from(genSelectIds) }),
      });
      if (res.ok) {
        setWhichModal(null);
        setGenPickRoundId(null);
        setGenPickOptions([]);
        setGenSelectIds(new Set());
        refetchWishRounds();
        refetchGardenState();
      }
    } finally {
      setGenSubmitLoading(false);
    }
  }, [genSelectIds, genPickRoundId, genSubmitLoading, refetchWishRounds, refetchGardenState]);

  const handleGenRegenerate = useCallback(async () => {
    if (!genPickRoundId || genGenerateLoading) return;
    setGenGenerateLoading(true);
    try {
      const res = await fetch('/api/wishes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ roundId: genPickRoundId }),
      });
      const data = await res.json();
      if (res.ok && data.options) {
        setGenPickOptions(data.options);
        setGenSelectIds(new Set());
      }
    } finally {
      setGenGenerateLoading(false);
    }
  }, [genPickRoundId, genGenerateLoading]);

  const handleRealize = useCallback(async () => {
    const honoredRound = wishRounds.find((r) => r.status === 'parent_honored');
    if (!honoredRound || realizeLoading) return;
    setRealizeLoading(true);
    try {
      const res = await fetch(`/api/wishes/rounds/${honoredRound.id}/realize`, {
        method: 'PATCH',
        credentials: 'include',
      });
      if (res.ok) {
        confetti({ particleCount: 80, spread: 100, origin: { y: 0.6 }, zIndex: 200 });
        refetchWishRounds();
        refetchGardenState();
      }
    } finally {
      setRealizeLoading(false);
    }
  }, [wishRounds, realizeLoading, refetchWishRounds, refetchGardenState]);

  const realizedCount = child ? (roundsRealizedCount || gardenRealizedCount) : 0;

  useEffect(() => {
    if (whichModal !== 'decoration') setSelected(null);
  }, [whichModal]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && whichModal) setWhichModal(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [whichModal]);

  const canSelect = selected !== null;

  return (
    <>
      <MenuButton />

      <div
        style={{
          position: 'fixed',
          top: 'max(16px, env(safe-area-inset-top))',
          right: 'max(16px, env(safe-area-inset-right))',
          zIndex: 50,
          display: 'flex',
          gap: 8,
        }}
      >
        <button
          type="button"
          onClick={() => setWhichModal('wishList')}
          aria-label="Wish list"
          style={{
            width: 'var(--v2-touch-min)',
            height: 'var(--v2-touch-min)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--v2-radius-card)',
            background: 'var(--v2-glass)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid var(--v2-glass-border)',
            boxShadow: 'var(--v2-shadow-card)',
            color: 'var(--v2-text-primary)',
            cursor: 'pointer',
          }}
        >
          <Heart size={22} strokeWidth={2} aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setWhichModal('conversation')}
          aria-label="Conversation history"
          style={{
            width: 'var(--v2-touch-min)',
            height: 'var(--v2-touch-min)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--v2-radius-card)',
            background: 'var(--v2-glass)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid var(--v2-glass-border)',
            boxShadow: 'var(--v2-shadow-card)',
            color: 'var(--v2-text-primary)',
            cursor: 'pointer',
          }}
        >
          <MessageCircle size={22} strokeWidth={2} aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setWhichModal('messages')}
          aria-label="Messages"
          style={{
            width: 'var(--v2-touch-min)',
            height: 'var(--v2-touch-min)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--v2-radius-card)',
            background: 'var(--v2-glass)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid var(--v2-glass-border)',
            boxShadow: 'var(--v2-shadow-card)',
            color: 'var(--v2-text-primary)',
            cursor: 'pointer',
          }}
        >
          <Mail size={22} strokeWidth={2} aria-hidden />
        </button>
      </div>

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
            minHeight: 0,
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
            My Garden
          </h1>

          <div
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {(treeLoading && !isGuest) || gardenStateLoading ? (
              <p style={{ color: 'var(--v2-text-muted)', fontSize: '0.95rem' }}>Loading tree…</p>
            ) : (
              <button
                type="button"
                onClick={openGardenAction}
                aria-label="Open garden"
                style={{
                  width: '100%',
                  maxWidth: 600,
                  aspectRatio: '1',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <ChristmasTreeSVG
                  growthStage={showStar ? Math.max(growthStage, 1) : growthStage}
                  placedDecorations={placedDecorations}
                />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={openGardenAction}
            aria-label="Decorate tree"
            style={{
              marginTop: 'auto',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              minHeight: 'var(--v2-touch-min)',
              padding: '12px 24px',
              borderRadius: 'var(--v2-radius-pill)',
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
            <Package size={22} strokeWidth={2.5} />
            Decorate
          </button>
        </div>
      </main>

      {/* Wish modal */}
      {whichModal === 'wish' && (
        <>
          <div role="presentation" style={modalBackdropStyle} onClick={() => setWhichModal(null)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="wish-modal-title"
            style={modalDialogStyle}
            onClick={(e) => e.stopPropagation()}
          >
            <ModalHeader title="Pick 3 wishes" onClose={() => setWhichModal(null)} />
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              <p style={{ margin: '0 0 16px', fontSize: '0.9rem', color: 'var(--v2-text-secondary)' }}>
                {isGuest
                  ? 'Choose the 3 you like best. Try it out!'
                  : 'Choose the 3 you like best. Your grown-up will pick one to make come true!'}
              </p>
              {!isGuest && wishGenerateLoading && wishOptions.length === 0 ? (
                <p style={{ margin: 0, color: 'var(--v2-text-muted)' }}>Generating wishes…</p>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(isGuest ? guestWishes.options : wishOptions).map((opt) => {
                      const sel = isGuest ? guestWishes.selectedIds.has(opt.id) : wishSelectIds.has(opt.id);
                      const onToggle = isGuest ? () => guestWishes.toggle(opt.id) : () => handleWishToggle(opt.id);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={onToggle}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '12px 16px',
                            borderRadius: 12,
                            border: sel ? '2px solid var(--v2-primary)' : '1px solid var(--v2-glass-border)',
                            background: sel ? 'rgba(0, 207, 185, 0.12)' : 'var(--v2-surface)',
                            color: 'var(--v2-text-primary)',
                            fontSize: '1rem',
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          <span style={{ flexShrink: 0 }}>{sel ? '✓' : '○'}</span>
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      disabled={
                        (isGuest ? guestWishes.selectedIds.size : wishSelectIds.size) !== 3 ||
                        (!isGuest && wishSubmitLoading)
                      }
                      onClick={isGuest ? () => guestWishes.submit() : handleWishSubmit}
                      style={{
                        padding: '12px 24px',
                        borderRadius: 'var(--v2-radius-pill)',
                        border: 'none',
                        background:
                          (isGuest ? guestWishes.selectedIds.size : wishSelectIds.size) === 3
                            ? 'var(--v2-primary)'
                            : 'var(--v2-glass)',
                        color: (isGuest ? guestWishes.selectedIds.size : wishSelectIds.size) === 3 ? '#fff' : 'var(--v2-text-muted)',
                        fontSize: '1rem',
                        fontWeight: 700,
                        cursor:
                          (isGuest ? guestWishes.selectedIds.size : wishSelectIds.size) === 3 && (isGuest || !wishSubmitLoading)
                            ? 'pointer'
                            : 'default',
                      }}
                    >
                      {!isGuest && wishSubmitLoading ? 'Sending…' : `Submit ${(isGuest ? guestWishes.selectedIds.size : wishSelectIds.size)}/3`}
                    </button>
                    <button
                      type="button"
                      disabled={!isGuest && wishGenerateLoading}
                      onClick={isGuest ? guestWishes.regenerate : handleRegenerateWishes}
                      style={{
                        padding: '12px 24px',
                        borderRadius: 'var(--v2-radius-card)',
                        border: '1px solid var(--v2-glass-border)',
                        background: 'var(--v2-surface)',
                        color: 'var(--v2-text-secondary)',
                        fontSize: '0.9rem',
                        cursor: !isGuest && wishGenerateLoading ? 'wait' : 'pointer',
                      }}
                    >
                      Generate again
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Decoration picker modal */}
      {whichModal === 'decoration' && (
        <>
          <div role="presentation" style={modalBackdropStyle} onClick={() => setWhichModal(null)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="decorate-modal-title"
            aria-label="Pick a gift to put on your tree"
            style={modalDialogStyle}
            onClick={(e) => e.stopPropagation()}
          >
            <ModalHeader title="Pick a gift to put on your tree" onClose={() => setWhichModal(null)} />
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
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--v2-text-muted)', textAlign: 'center' }}>
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
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--v2-text-secondary)' }}>
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
                                prev?.source === 'parent' && prev?.id === firstId ? null : { source: 'parent', id: firstId }
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
                              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--v2-text-muted)', marginLeft: 4 }}>
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
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--v2-text-secondary)' }}>
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
                              prev?.source === 'mission' && prev?.id === firstId ? null : { source: 'mission', id: firstId }
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
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--v2-text-muted)', marginLeft: 4 }}>
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
              <div style={{ padding: '12px 20px 20px', borderTop: '1px solid var(--v2-glass-border)' }}>
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

      {/* Missions modal */}
      {whichModal === 'missions' && (
        <>
          <div role="presentation" style={modalBackdropStyle} onClick={() => setWhichModal(null)} />
          <div role="dialog" aria-modal="true" style={modalDialogStyle} onClick={(e) => e.stopPropagation()}>
            <ModalHeader title="My missions" onClose={() => setWhichModal(null)} />
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <p style={{ margin: '0 0 20px', color: 'var(--v2-text-secondary)', fontSize: '1rem' }}>
                Complete missions to earn decorations for your tree.
              </p>
              <Link
                href="/missions"
                onClick={() => setWhichModal(null)}
                style={{
                  display: 'inline-block',
                  padding: '14px 28px',
                  borderRadius: 'var(--v2-radius-pill)',
                  background: 'var(--v2-primary)',
                  color: '#fff',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                My missions
              </Link>
            </div>
          </div>
        </>
      )}

      {/* Brave Call with Tammy modal */}
      {whichModal === 'talk' && (
        <>
          <div role="presentation" style={modalBackdropStyle} onClick={() => setWhichModal(null)} />
          <div role="dialog" aria-modal="true" style={modalDialogStyle} onClick={(e) => e.stopPropagation()}>
            <ModalHeader title="Start a Brave Call with Tammy" onClose={() => setWhichModal(null)} />
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <p style={{ margin: '0 0 20px', color: 'var(--v2-text-secondary)', fontSize: '1rem' }}>
                Start a Brave Call with Tammy to talk about your day. Then complete brave missions to earn decorations!
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => {
                    setWhichModal(null);
                    router.push('/talk');
                  }}
                  style={{
                    padding: '14px 28px',
                    borderRadius: 'var(--v2-radius-pill)',
                    border: 'none',
                    background: 'var(--v2-primary)',
                    color: '#fff',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Start Brave Call
                </button>
                {!isGuest && (
                  <button
                    type="button"
                    onClick={() => openWishGenerate()}
                    style={{
                      padding: '12px 24px',
                      borderRadius: 'var(--v2-radius-pill)',
                      border: '1px solid var(--v2-glass-border)',
                      background: 'var(--v2-glass)',
                      color: 'var(--v2-text-secondary)',
                      fontWeight: 600,
                      fontSize: '0.95rem',
                      cursor: 'pointer',
                    }}
                  >
                    Make a wish instead
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Tree full modal */}
      {whichModal === 'treeFull' && (
        <>
          <div role="presentation" style={modalBackdropStyle} onClick={() => setWhichModal(null)} />
          <div role="dialog" aria-modal="true" style={modalDialogStyle} onClick={(e) => e.stopPropagation()}>
            <ModalHeader title="Your tree is full!" onClose={() => setWhichModal(null)} />
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <p style={{ margin: 0, color: 'var(--v2-text-secondary)', fontSize: '1rem' }}>
                You have 15 decorations on your tree. Great job!
              </p>
            </div>
          </div>
        </>
      )}

      {/* Messages modal */}
      {whichModal === 'messages' && (
        <>
          <div role="presentation" style={modalBackdropStyle} onClick={() => setWhichModal(null)} />
          <div role="dialog" aria-modal="true" style={modalDialogStyle} onClick={(e) => e.stopPropagation()}>
            <ModalHeader title="Messages" onClose={() => setWhichModal(null)} />
            <div
              style={{
                padding: '32px 20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 16,
                textAlign: 'center',
              }}
            >
              <Mail size={56} strokeWidth={1.5} color="var(--v2-text-muted)" aria-hidden />
              <p style={{ margin: 0, color: 'var(--v2-text-secondary)', fontSize: '1rem', lineHeight: 1.6, maxWidth: 260 }}>
                Messages from your grown-up will appear here soon!
              </p>
            </div>
          </div>
        </>
      )}

      {/* My Wishes modal */}
      {whichModal === 'wishList' && (() => {
        const honoredRound = wishRounds.find((r) => r.status === 'parent_honored');
        const pickedRound = wishRounds.find((r) => r.status === 'child_picked');
        const showGenerate = !isGuest && !honoredRound && !pickedRound
          && !wishRounds.some((r) => r.status === 'generating' || r.status === 'child_picking');
        const selectedOptions = activeRoundOptions?.filter((o) => o.selected_by_child) ?? [];

        return (
          <>
            <div role="presentation" style={modalBackdropStyle} onClick={() => setWhichModal(null)} />
            <div role="dialog" aria-modal="true" style={modalDialogStyle} onClick={(e) => e.stopPropagation()}>
              <div style={{ padding: '20px 20px 12px', borderBottom: '1px solid var(--v2-glass-border)', position: 'relative' }}>
                <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: 'var(--v2-text-primary)', textAlign: 'center', paddingRight: 72 }}>
                  My Wishes
                </h2>
                {realizedCount > 0 && (
                  <span style={{
                    position: 'absolute', top: 18, left: 16,
                    background: 'var(--v2-primary)', color: '#fff',
                    fontSize: '0.75rem', fontWeight: 700,
                    borderRadius: 'var(--v2-radius-pill)',
                    padding: '2px 8px', minWidth: 22, textAlign: 'center',
                  }}>
                    {realizedCount}
                  </span>
                )}
                <button type="button" onClick={() => setWhichModal(null)} aria-label="Close"
                  style={{ position: 'absolute', top: 16, right: 16, width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'transparent', color: 'var(--v2-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--v2-glass)'; e.currentTarget.style.color = 'var(--v2-text-primary)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--v2-text-muted)'; }}
                >
                  <X size={22} strokeWidth={2.5} />
                </button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
                {isGuest && (
                  <p style={{ color: 'var(--v2-text-muted)', fontSize: '0.95rem', textAlign: 'center', margin: 0 }}>
                    Log in to see your wishes.
                  </p>
                )}

                {!isGuest && honoredRound && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{
                      padding: 16, borderRadius: 'var(--v2-radius-card)',
                      background: 'rgba(34, 197, 94, 0.12)', border: '2px solid var(--v2-mission-easy)',
                    }}>
                      <p style={{ margin: '0 0 6px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--v2-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Your wish
                      </p>
                      <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--v2-text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Sparkles size={18} style={{ color: 'var(--v2-mission-easy)', flexShrink: 0 }} aria-hidden />
                        {honoredRound.honoredOption?.label ?? '—'}
                      </p>
                    </div>

                    {/* Progress bar */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--v2-text-secondary)' }}>Mission progress</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--v2-text-primary)' }}>
                          {honoredRound.missions_completed} / {honoredRound.missions_required}
                        </span>
                      </div>
                      <div style={{ width: '100%', height: 12, borderRadius: 6, background: 'var(--v2-glass)', overflow: 'hidden' }}>
                        <div style={{
                          width: `${Math.min(100, (honoredRound.missions_completed / Math.max(1, honoredRound.missions_required)) * 100)}%`,
                          height: '100%', borderRadius: 6,
                          background: honoredRound.missions_completed >= honoredRound.missions_required ? 'var(--v2-mission-easy)' : 'var(--v2-primary)',
                          transition: 'width 0.4s ease',
                        }} />
                      </div>
                    </div>

                    {honoredRound.missions_completed >= honoredRound.missions_required && (
                      <button
                        type="button"
                        disabled={realizeLoading}
                        onClick={handleRealize}
                        style={{
                          width: '100%', padding: '14px 24px',
                          borderRadius: 'var(--v2-radius-pill)', border: 'none',
                          background: 'var(--v2-primary)', color: '#fff',
                          fontSize: '1rem', fontWeight: 700,
                          cursor: realizeLoading ? 'wait' : 'pointer',
                        }}
                      >
                        {realizeLoading ? 'Sending…' : 'Tell Dad I\'m Done!'}
                      </button>
                    )}
                  </div>
                )}

                {!isGuest && pickedRound && !honoredRound && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--v2-text-secondary)', textAlign: 'center' }}>
                      Waiting for your grown-up to choose one...
                    </p>
                    {selectedOptions.map((opt) => (
                      <div key={opt.id} style={{
                        padding: '12px 16px', borderRadius: 12,
                        border: '1px solid var(--v2-glass-border)', background: 'var(--v2-glass)',
                        fontSize: '0.95rem', color: 'var(--v2-text-primary)',
                      }}>
                        {opt.label}
                      </div>
                    ))}
                  </div>
                )}

                {!isGuest && showGenerate && (
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ margin: '0 0 16px', color: 'var(--v2-text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                      {wishRounds.length === 0
                        ? 'Generate 5 wishes and pick your top 3. Your grown-up will choose one to make come true!'
                        : 'Ready for a new wish! Generate wishes and pick 3.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => openWishGenerate()}
                      style={{
                        width: '100%', padding: '14px 24px',
                        borderRadius: 'var(--v2-radius-pill)', border: 'none',
                        background: 'var(--v2-primary)', color: '#fff',
                        fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
                      }}
                    >
                      Generate wishes
                    </button>
                  </div>
                )}

                {/* Previous realized wishes */}
                {wishRounds.filter((r) => r.status === 'realized').length > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <p style={{ margin: '0 0 8px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--v2-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Wishes realized
                    </p>
                    <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {wishRounds.filter((r) => r.status === 'realized').map((r) => (
                        <li key={r.id} style={{ color: 'var(--v2-text-primary)', fontSize: '0.95rem' }}>
                          {r.honoredOption?.label ?? '—'}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </>
        );
      })()}

      {/* Wish Generate (pick 3) modal */}
      {whichModal === 'wishGenerate' && (
        <>
          <div role="presentation" style={modalBackdropStyle} onClick={() => setWhichModal(null)} />
          <div role="dialog" aria-modal="true" style={modalDialogStyle} onClick={(e) => e.stopPropagation()}>
            <ModalHeader title="Pick 3 wishes" onClose={() => setWhichModal(null)} />
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              <p style={{ margin: '0 0 16px', fontSize: '0.9rem', color: 'var(--v2-text-secondary)' }}>
                Choose the 3 you like best. Your grown-up will pick one to make come true!
              </p>
              {genGenerateLoading && genPickOptions.length === 0 ? (
                <p style={{ margin: 0, color: 'var(--v2-text-muted)' }}>Generating wishes…</p>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {genPickOptions.map((opt) => {
                      const sel = genSelectIds.has(opt.id);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleGenToggle(opt.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '12px 16px', borderRadius: 12,
                            border: sel ? '2px solid var(--v2-primary)' : '1px solid var(--v2-glass-border)',
                            background: sel ? 'rgba(0, 207, 185, 0.12)' : 'var(--v2-surface)',
                            color: 'var(--v2-text-primary)', fontSize: '1rem',
                            cursor: 'pointer', textAlign: 'left',
                          }}
                        >
                          <span style={{ flexShrink: 0 }}>{sel ? '✓' : '○'}</span>
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      disabled={genSelectIds.size !== 3 || genSubmitLoading}
                      onClick={handleGenSubmit}
                      style={{
                        padding: '12px 24px', borderRadius: 'var(--v2-radius-pill)',
                        border: 'none',
                        background: genSelectIds.size === 3 ? 'var(--v2-primary)' : 'var(--v2-glass)',
                        color: genSelectIds.size === 3 ? '#fff' : 'var(--v2-text-muted)',
                        fontSize: '1rem', fontWeight: 700,
                        cursor: genSelectIds.size === 3 && !genSubmitLoading ? 'pointer' : 'default',
                      }}
                    >
                      {genSubmitLoading ? 'Sending…' : `Submit ${genSelectIds.size}/3`}
                    </button>
                    <button
                      type="button"
                      disabled={genGenerateLoading}
                      onClick={handleGenRegenerate}
                      style={{
                        padding: '12px 24px', borderRadius: 'var(--v2-radius-card)',
                        border: '1px solid var(--v2-glass-border)',
                        background: 'var(--v2-surface)', color: 'var(--v2-text-secondary)',
                        fontSize: '0.9rem',
                        cursor: genGenerateLoading ? 'wait' : 'pointer',
                      }}
                    >
                      Generate again
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Conversation history modal */}
      {whichModal === 'conversation' && (() => {
        const convoMessages = child ? convoApiMessages : localMessages;
        const convoLoading = child ? convoApiLoading : false;
        return (
          <>
            <div role="presentation" style={modalBackdropStyle} onClick={() => setWhichModal(null)} />
            <div role="dialog" aria-modal="true" style={modalDialogStyle} onClick={(e) => e.stopPropagation()}>
              <ModalHeader title="Conversation with Tammy" onClose={() => setWhichModal(null)} />
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
                {convoLoading ? (
                  <p style={{ color: 'var(--v2-text-muted)', fontSize: '0.95rem', textAlign: 'center' }}>Loading…</p>
                ) : convoMessages.length === 0 ? (
                  <div style={{
                    padding: '24px 16px', borderRadius: 'var(--v2-radius-card)',
                    background: 'var(--v2-glass)', border: '1px solid var(--v2-glass-border)',
                  }}>
                    <p style={{ color: 'var(--v2-text-secondary)', fontSize: '0.95rem', textAlign: 'center', lineHeight: 1.6, margin: 0 }}>
                      No conversations yet. Talk with Tammy to see your conversation here.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {convoMessages.map((item, i) => {
                      const isUser = item.role === 'user';
                      return (
                        <div
                          key={`${i}-${item.content.slice(0, 30)}`}
                          style={{
                            alignSelf: isUser ? 'flex-end' : 'flex-start',
                            maxWidth: '85%', padding: '10px 14px', borderRadius: 16,
                            background: isUser ? 'var(--v2-bubble-user-bg)' : 'var(--v2-glass-strong)',
                            border: isUser ? 'none' : '1px solid var(--v2-glass-border)',
                            fontSize: '0.95rem', fontWeight: 600,
                            color: isUser ? 'var(--v2-primary)' : 'var(--v2-text-primary)',
                            lineHeight: 1.4, wordBreak: 'break-word',
                            textShadow: isUser ? 'none' : '0 1px 1px rgba(255,255,255,0.3)',
                          }}
                        >
                          {item.content}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div style={{ padding: '12px 20px 20px', borderTop: '1px solid var(--v2-glass-border)', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    setWhichModal(null);
                    router.push('/talk');
                  }}
                  style={{
                    padding: '12px 24px', borderRadius: 'var(--v2-radius-pill)',
                    border: 'none', background: 'var(--v2-primary)',
                    color: '#fff', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  Talk with Tammy
                </button>
              </div>
            </div>
          </>
        );
      })()}
    </>
  );
}
