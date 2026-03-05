'use client';

import { useState, useEffect, useCallback } from 'react';

export interface EncouragementItem {
  id: string;
  emoji: string;
  created_at: string;
}

export function useEncouragement() {
  const [items, setItems] = useState<EncouragementItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/encouragement', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load encouragement');
      setItems(data.items ?? []);
    } catch (e) {
      console.error('[useEncouragement]', e);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { items, isLoading, refetch };
}
