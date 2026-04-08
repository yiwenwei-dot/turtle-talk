'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Message } from '@/lib/speech/types';
import { getDb, getDeviceId } from '@/lib/db';

export function usePersonalMemory(childId?: string) {
  const id = childId ?? (typeof window !== 'undefined' ? getDeviceId() : 'default');
  const db = getDb();

  // Synchronous read for instant initial state (localStorage provider).
  // Async providers return null here and populate via useEffect below.
  const syncMem = db.getMemorySync?.(id) ?? null;

  const [childName, setChildName] = useState<string | null>(syncMem?.childName ?? null);
  const [messages, setMessages] = useState<Message[]>((syncMem?.messages ?? []) as Message[]);
  const [topics, setTopics] = useState<string[]>(syncMem?.topics ?? []);

  // For async providers (Supabase, Convex): hydrate state after mount.
  useEffect(() => {
    if (syncMem !== null) return;
    db.getMemory(id)
      .then((mem) => {
        setChildName(mem.childName);
        setMessages(mem.messages as Message[]);
        setTopics(mem.topics);
      })
      .catch(() => {/* keep defaults */});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const saveChildName = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      setChildName(trimmed || null);
      if (trimmed) {
        void db.saveChildName(id, trimmed).catch(() => {/* ignore */});
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id],
  );

  const saveMessages = useCallback(
    (msgs: Message[]) => {
      const trimmed = msgs.slice(-20);
      setMessages(trimmed);
      void db.saveMessages(id, trimmed).catch(() => {/* ignore */});
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id],
  );

  const saveTopic = useCallback(
    (topic: string) => {
      const normalised = topic.trim().toLowerCase();
      if (!normalised) return;
      setTopics((prev) => [normalised, ...prev.filter((t) => t !== normalised)].slice(0, 15));
      void db.addTopic(id, normalised).catch(() => {/* ignore */});
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id],
  );

  const clearAll = useCallback(() => {
    setChildName(null);
    setMessages([]);
    setTopics([]);
    void db.clearMemory(id).catch(() => {/* ignore */});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return { childName, messages, topics, saveChildName, saveMessages, saveTopic, clearAll };
}
