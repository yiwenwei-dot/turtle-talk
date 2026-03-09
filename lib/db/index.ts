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
import { createLazySingleton, pickProvider } from '@/lib/utils/singleton';

export type { DatabaseService };
export type { ChildMemory, Journal } from './types';

const DB_PROVIDERS = ['localStorage', 'supabase', 'convex'] as const;
type DbProvider = (typeof DB_PROVIDERS)[number];

export const getDb = createLazySingleton((): DatabaseService => {
  const provider = pickProvider<DbProvider>(
    'NEXT_PUBLIC_DB_PROVIDER',
    process.env.NEXT_PUBLIC_DB_PROVIDER,
    DB_PROVIDERS,
    'localStorage',
  );

  if (provider === 'supabase') {
    // Dynamic require keeps Supabase client-side only when needed
    const { SupabaseDatabaseService } = require('./providers/supabase');
    return new SupabaseDatabaseService();
  }
  if (provider === 'convex') {
    const { ConvexDatabaseService } = require('./providers/convex');
    return new ConvexDatabaseService();
  }
  const { LocalStorageDatabaseService } = require('./providers/localStorage');
  return new LocalStorageDatabaseService();
});

/**
 * Database for guest (no logged-in child). Always uses localStorage so guest
 * missions and memory persist on this device regardless of NEXT_PUBLIC_DB_PROVIDER.
 */
export const getGuestDb = createLazySingleton((): DatabaseService => {
  const { LocalStorageDatabaseService } = require('./providers/localStorage');
  return new LocalStorageDatabaseService();
});

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
