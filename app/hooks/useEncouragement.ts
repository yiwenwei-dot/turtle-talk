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
      // Guest / no session: API returns 401; set empty state and do not throw
      if (!res.ok) {
        setItems([]);
        setIsLoading(false);
        return;
      }
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
