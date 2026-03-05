/**
 * Database service factory.
 *
 * NEXT_PUBLIC_DB_PROVIDER controls only missions and child memory (used by useMissions,
 * usePersonalMemory — Talk, Missions, World). Values: 'localStorage' | 'supabase' | 'convex'.
 * Defaults to 'localStorage'.
 *
 * The parent dashboard (/parent) does not use getDb(). It always uses Supabase via the API
 * routes (parent_child, children, profiles, missions for counts, weekly_reports, dinner_questions).
 * So switching to localStorage does not change parent behaviour; parent still requires Supabase
 * and will show data from Supabase (e.g. mission counts from Supabase missions table).
 */
import type { DatabaseService } from './types';

export type { DatabaseService };
export type { ChildMemory, Journal } from './types';

let _instance: DatabaseService | null = null;

export function getDb(): DatabaseService {
  if (_instance) return _instance;

  const provider = process.env.NEXT_PUBLIC_DB_PROVIDER ?? 'localStorage';

  if (provider === 'supabase') {
    // Dynamic import keeps Supabase client-side only when needed
    const { SupabaseDatabaseService } = require('./providers/supabase');
    _instance = new SupabaseDatabaseService();
  } else if (provider === 'convex') {
    const { ConvexDatabaseService } = require('./providers/convex');
    _instance = new ConvexDatabaseService();
  } else {
    const { LocalStorageDatabaseService } = require('./providers/localStorage');
    _instance = new LocalStorageDatabaseService();
  }

  return _instance!;
}

/**
 * Returns a stable device UUID, creating one on first call.
 * Used as childId when no explicit child profile is selected.
 */
export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  try {
    let id = localStorage.getItem('turtle-talk-device-id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('turtle-talk-device-id', id);
    }
    return id;
  } catch {
    return 'unknown';
  }
}
