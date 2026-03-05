'use client';

import { useState, useEffect, useCallback } from 'react';

export interface WishListItem {
  id: string;
  child_id: string;
  label: string;
  sort_order: number;
  unlocked_at: string | null;
  created_at: string;
}

export type UseWishListOptions = {
  /** When true, fetch /api/wish-list with no childId (child session cookie). Use on child wish-list page only. */
  fetchWhenChildIdNull?: boolean;
};

export function useWishList(childId?: string | null, options?: UseWishListOptions) {
  const { fetchWhenChildIdNull = false } = options ?? {};
  const [items, setItems] = useState<WishListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    const hasChildId = childId != null && childId !== '';
    if (!hasChildId && !fetchWhenChildIdNull) {
      setItems([]);
      setIsLoading(false);
      return;
    }
    const url = hasChildId
      ? `/api/wish-list?childId=${encodeURIComponent(childId)}`
      : '/api/wish-list';
    setIsLoading(true);
    try {
      const res = await fetch(url, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load wish list');
      setItems(data.items ?? []);
    } catch (e) {
      console.error('[useWishList]', e);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [childId, fetchWhenChildIdNull]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { items, isLoading, refetch };
}
