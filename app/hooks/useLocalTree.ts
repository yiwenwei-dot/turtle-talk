'use client';

import { useState, useCallback, useMemo } from 'react';
import { getDeviceId } from '@/lib/db';
import { getPlacedMissionIds, savePlacedMissionIds } from '@/lib/db/providers/localStorage';
import { useMissions } from '@/app/hooks/useMissions';
import type { PlacedDecoration } from '@/app/hooks/useTree';

const THEME_EMOJI: Record<string, string> = {
  brave: '🦁',
  kind: '💛',
  calm: '🌊',
  confident: '⭐',
  creative: '🎨',
  social: '🤝',
  curious: '🔍',
};

export interface EarnedDecoration {
  /** mission ID — used as the key when placing on tree */
  id: string;
  emoji: string;
}

export function useLocalTree(childId?: string) {
  const id = useMemo(
    () => childId ?? (typeof window !== 'undefined' ? getDeviceId() : 'default'),
    [childId],
  );
  const { completedMissions } = useMissions(id);

  const [placedMissionIds, setPlacedMissionIds] = useState<string[]>(
    () => (typeof window !== 'undefined' ? getPlacedMissionIds(id) : []),
  );

  const placedSet = new Set(placedMissionIds);

  // Decorations the child has earned but not yet placed on the tree
  const unplacedDecorations: EarnedDecoration[] = completedMissions
    .filter((m) => !placedSet.has(m.id))
    .map((m) => ({ id: m.id, emoji: THEME_EMOJI[m.theme ?? 'curious'] ?? '🔍' }));

  // Decorations already on the tree (for ChristmasTreeSVG)
  const missionById = Object.fromEntries(completedMissions.map((m) => [m.id, m]));
  const placedDecorations: PlacedDecoration[] = placedMissionIds.map((mId, i) => ({
    emoji: THEME_EMOJI[missionById[mId]?.theme ?? 'curious'] ?? '🔍',
    slotId: `slot-${i}`,
  }));

  const placedCount = placedMissionIds.length;
  // Tree grows one stage per 2 decorations, capped at 5
  const growthStage = Math.min(Math.floor(placedCount / 2), 5);

  const placeDecoration = useCallback(
    (missionId: string) => {
      setPlacedMissionIds((prev) => {
        if (prev.includes(missionId)) return prev;
        const next = [...prev, missionId];
        savePlacedMissionIds(id, next);
        return next;
      });
    },
    [id],
  );

  return {
    placedDecorations,
    unplacedDecorations,
    placedCount,
    growthStage,
    placeDecoration,
  };
}
