'use client';

import { useState, useEffect } from 'react';
import type { AwarenessLocation } from '@/lib/speech/types';

export interface AwarenessState {
  timezone: string;
  clientLocalTime: string;
  location: AwarenessLocation | null;
}

/**
 * Provides time and optional location for AI awareness (Shelly).
 * - timezone: from browser (e.g. "America/New_York")
 * - clientLocalTime: ISO string at call time
 * - location: optional; set by parent/settings or leave null (no automatic geolocation to avoid prompts)
 */
export function useAwareness(): AwarenessState {
  const [state, setState] = useState<AwarenessState>(() => ({
    timezone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : '',
    clientLocalTime: new Date().toISOString(),
    location: null,
  }));

  useEffect(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const tick = () => {
      setState((prev) => ({
        ...prev,
        timezone,
        clientLocalTime: new Date().toISOString(),
      }));
    };
    tick();
    const interval = setInterval(tick, 60_000);
    return () => clearInterval(interval);
  }, []);

  return state;
}
