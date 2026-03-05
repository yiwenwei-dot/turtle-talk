'use client';

import { useState, useEffect, useCallback } from 'react';

export interface PlacedDecoration {
  emoji: string;
  slotId: string;
}

export interface ChildTreeState {
  child_id: string;
  placed_count: number;
  placed_decorations: PlacedDecoration[];
  growth_stage: number;
  last_unlock_at: string | null;
  updated_at: string;
}

export interface TreeData {
  tree: ChildTreeState | null;
  wishListSummary: { total: number; unlockedCount: number };
}

export function useTree() {
  const [data, setData] = useState<TreeData>({
    tree: null,
    wishListSummary: { total: 0, unlockedCount: 0 },
  });
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/tree', { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load tree');
      setData({
        tree: json.tree ?? null,
        wishListSummary: json.wishListSummary ?? { total: 0, unlockedCount: 0 },
      });
    } catch (e) {
      console.error('[useTree]', e);
      setData({ tree: null, wishListSummary: { total: 0, unlockedCount: 0 } });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const placeOnTree = useCallback(
    async (encouragementId: string): Promise<{ ok: boolean; unlocked?: boolean }> => {
      const res = await fetch('/api/tree/place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ encouragementId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to place');
      return { ok: true, unlocked: json.unlocked };
    },
    []
  );

  return { ...data, isLoading, refetch, placeOnTree };
}
