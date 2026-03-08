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
      // #region agent log
      fetch('http://127.0.0.1:7379/ingest/c4e58649-e133-4b9b-91a5-50c962a7060e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f48c35'},body:JSON.stringify({sessionId:'f48c35',location:'useEncouragement.ts:refetch',message:'encouragement API response',data:{ok:res.ok,status:res.status,error:data?.error},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
      // Guest / no session: API returns 401; set empty state and do not throw
      if (!res.ok) {
        setItems([]);
        setIsLoading(false);
        return;
      }
      setItems(data.items ?? []);
    } catch (e) {
      // #region agent log
      fetch('http://127.0.0.1:7379/ingest/c4e58649-e133-4b9b-91a5-50c962a7060e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f48c35'},body:JSON.stringify({sessionId:'f48c35',location:'useEncouragement.ts:catch',message:'useEncouragement catch',data:{name:(e as Error)?.name,message:(e as Error)?.message},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
      // #endregion
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
