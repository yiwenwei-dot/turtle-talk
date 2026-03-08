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
      // #region agent log
      fetch('http://127.0.0.1:7379/ingest/c4e58649-e133-4b9b-91a5-50c962a7060e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f48c35'},body:JSON.stringify({sessionId:'f48c35',location:'useTree.ts:refetch',message:'tree API response',data:{ok:res.ok,status:res.status,error:json?.error},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      // Guest / no session: API returns 401; set empty state and do not throw
      if (!res.ok) {
        setData({ tree: null, wishListSummary: { total: 0, unlockedCount: 0 } });
        setIsLoading(false);
        return;
      }
      setData({
        tree: json.tree ?? null,
        wishListSummary: json.wishListSummary ?? { total: 0, unlockedCount: 0 },
      });
    } catch (e) {
      // #region agent log
      fetch('http://127.0.0.1:7379/ingest/c4e58649-e133-4b9b-91a5-50c962a7060e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f48c35'},body:JSON.stringify({sessionId:'f48c35',location:'useTree.ts:catch',message:'useTree catch',data:{name:(e as Error)?.name,message:(e as Error)?.message},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
      // #endregion
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
