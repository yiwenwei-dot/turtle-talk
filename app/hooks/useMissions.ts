'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Mission, MissionSuggestion } from '@/lib/speech/types';
import { getDb, getDeviceId } from '@/lib/db';

export function useMissions(childId?: string) {
  const id = childId ?? (typeof window !== 'undefined' ? getDeviceId() : 'default');
  const db = getDb();

  // Synchronous read for instant initial state (localStorage provider).
  const syncMissions = db.getMissionsSync?.(id) ?? null;

  const [missions, setMissions] = useState<Mission[]>(syncMissions ?? []);

  // Async providers (Supabase, Convex): fetch after mount.
  useEffect(() => {
    if (syncMissions !== null) return;
    db.getMissions(id)
      .then(setMissions)
      .catch(() => setMissions([]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const addMission = useCallback(
    (suggestion: MissionSuggestion) => {
      // Optimistic update — create mission locally immediately.
      const mission: Mission = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: suggestion.title,
        description: suggestion.description,
        theme: suggestion.theme ?? 'curious',
        difficulty: suggestion.difficulty,
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      setMissions((prev) => [mission, ...prev]);
      // Persist in background (for async providers, the real ID may differ).
      void db.addMission(id, suggestion).catch((err) => {
        console.error('[useMissions] addMission failed', err);
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id],
  );

  const completeMission = useCallback(
    (missionId: string) => {
      setMissions((prev) =>
        prev.map((m) =>
          m.id === missionId
            ? { ...m, status: 'completed' as const, completedAt: new Date().toISOString() }
            : m,
        ),
      );
      void db.completeMission(id, missionId).catch((err) => {
        console.error('[useMissions] completeMission failed', err);
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id],
  );

  const deleteMission = useCallback(
    (missionId: string) => {
      setMissions((prev) => prev.filter((m) => m.id !== missionId));
      void db.deleteMission(id, missionId).catch((err) => {
        console.error('[useMissions] deleteMission failed', err);
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id],
  );

  return {
    missions,
    activeMissions: missions.filter((m) => m.status === 'active'),
    completedMissions: missions.filter((m) => m.status === 'completed'),
    addMission,
    completeMission,
    deleteMission,
  };
}
