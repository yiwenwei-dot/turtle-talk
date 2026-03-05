'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Journal } from '@/lib/db/types';
import { getDb, getDeviceId } from '@/lib/db';

export function useJournals(childId?: string) {
  const id = childId ?? (typeof window !== 'undefined' ? getDeviceId() : 'default');
  const db = getDb();

  const [journals, setJournals] = useState<Journal[]>([]);

  useEffect(() => {
    if (!db.getJournals) return;
    db.getJournals(id)
      .then(setJournals)
      .catch(() => setJournals([]));
  }, [id, db]);

  const deleteJournal = useCallback(
    (journalId: string) => {
      setJournals((prev) => prev.filter((j) => j.id !== journalId));
      void db.deleteJournal?.(id, journalId).catch(console.error);
    },
    [id, db],
  );

  const refetch = useCallback(() => {
    if (db.getJournals) db.getJournals(id).then(setJournals).catch(() => setJournals([]));
  }, [id, db]);

  return {
    journals,
    canUseJournals: typeof db.getJournals === 'function',
    deleteJournal: db.deleteJournal ? deleteJournal : undefined,
    refetch,
  };
}
