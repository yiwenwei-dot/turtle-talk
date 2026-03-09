# Unified Lazy Singleton Factory Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace null-typed singleton workarounds across `lib/db/`, `lib/sms/`, and `lib/speech/voice/` with a shared `createLazySingleton` utility that is properly typed and includes env-var validation.

**Architecture:** A tiny `lib/utils/singleton.ts` exports two helpers — `createLazySingleton<T>` (lazy memoized factory) and `pickProvider` (env var validator). Each service module is refactored to use these helpers, eliminating `| null` types and `!` assertions everywhere.

**Tech Stack:** TypeScript, Next.js 16, Jest 30 + babel-jest + jsdom

---

### Task 1: Create `lib/utils/singleton.ts` with tests

**Files:**
- Create: `lib/utils/singleton.ts`
- Create: `__tests__/utils/singleton.test.ts`

**Step 1: Write the failing tests**

Create `__tests__/utils/singleton.test.ts`:

```ts
import { createLazySingleton, pickProvider } from '@/lib/utils/singleton';

describe('createLazySingleton', () => {
  it('calls factory exactly once and returns the same instance', () => {
    const factory = jest.fn(() => ({ value: 42 }));
    const getInstance = createLazySingleton(factory);

    const a = getInstance();
    const b = getInstance();

    expect(factory).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
  });

  it('returns the value produced by the factory', () => {
    const getInstance = createLazySingleton(() => 'hello');
    expect(getInstance()).toBe('hello');
  });
});

describe('pickProvider', () => {
  it('returns the value when it is in the allowed list', () => {
    expect(pickProvider('MY_VAR', 'supabase', ['localStorage', 'supabase', 'convex'], 'localStorage'))
      .toBe('supabase');
  });

  it('returns the fallback when value is undefined', () => {
    expect(pickProvider('MY_VAR', undefined, ['localStorage', 'supabase'], 'localStorage'))
      .toBe('localStorage');
  });

  it('returns the fallback when value is empty string', () => {
    expect(pickProvider('MY_VAR', '', ['localStorage', 'supabase'], 'localStorage'))
      .toBe('localStorage');
  });

  it('throws a descriptive error for an unknown value', () => {
    expect(() =>
      pickProvider('MY_VAR', 'postgres', ['localStorage', 'supabase', 'convex'], 'localStorage')
    ).toThrow('Unknown provider "postgres" for MY_VAR. Allowed: localStorage, supabase, convex');
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/utils/singleton.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '@/lib/utils/singleton'`

**Step 3: Create `lib/utils/singleton.ts`**

```ts
/**
 * Returns a getter that lazily creates and caches a singleton instance.
 * Eliminates null-typed module-level vars and the ! workaround.
 */
export function createLazySingleton<T>(factory: () => T): () => T {
  let instance: T | undefined;
  return () => instance ?? (instance = factory());
}

/**
 * Validates an env var value against a list of allowed strings.
 * Returns the fallback if the value is absent/empty.
 * Throws a descriptive error at first use if the value is unrecognised.
 */
export function pickProvider<T extends string>(
  envVar: string,
  value: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  if (!value) return fallback;
  if (!(allowed as readonly string[]).includes(value)) {
    throw new Error(
      `Unknown provider "${value}" for ${envVar}. Allowed: ${allowed.join(', ')}`,
    );
  }
  return value as T;
}
```

**Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/utils/singleton.test.ts --no-coverage
```

Expected: PASS — 6 tests

**Step 5: Commit**

```bash
git add lib/utils/singleton.ts __tests__/utils/singleton.test.ts
git commit -m "feat: add createLazySingleton and pickProvider utilities"
```

---

### Task 2: Refactor `lib/db/index.ts`

**Files:**
- Modify: `lib/db/index.ts`

The current file has two `null`-typed singletons and two factory functions each requiring `!` on return. Replace both with `createLazySingleton`.

**Step 1: Replace the file contents**

Open `lib/db/index.ts` and replace the body with:

```ts
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
```

**Step 2: Run existing tests to verify nothing broke**

```bash
npx jest --testPathPattern="hooks|services" --no-coverage
```

Expected: all previously passing tests still PASS. Any test that mocks `@/lib/db` uses `jest.mock('@/lib/db', ...)` which is unaffected by this refactor.

**Step 3: Commit**

```bash
git add lib/db/index.ts
git commit -m "refactor(db): use createLazySingleton and pickProvider"
```

---

### Task 3: Refactor `lib/sms/index.ts`

**Files:**
- Modify: `lib/sms/index.ts`

**Step 1: Replace the file contents**

```ts
/**
 * SMS service factory.
 *
 * Set SMS_PROVIDER env var to select a provider.
 * Currently supported: 'plivo' (default).
 *
 * Usage:
 *   import { getSMS } from '@/lib/sms';
 *   await getSMS().send({ to: '+12125551234', from: '+15551234567', body: 'Hello!' });
 */
import type { SMSService } from './types';
import { createLazySingleton, pickProvider } from '@/lib/utils/singleton';

export type { SMSService, SMSMessage, SMSSendResult } from './types';

const SMS_PROVIDERS = ['plivo'] as const;
type SmsProvider = (typeof SMS_PROVIDERS)[number];

export const getSMS = createLazySingleton((): SMSService => {
  const provider = pickProvider<SmsProvider>(
    'SMS_PROVIDER',
    process.env.SMS_PROVIDER,
    SMS_PROVIDERS,
    'plivo',
  );

  if (provider === 'plivo') {
    const { PlivoSMSProvider } = require('./providers/plivo');
    return new PlivoSMSProvider();
  }

  // pickProvider already throws for unknown values; this is unreachable but
  // satisfies the exhaustive type check.
  throw new Error(`Unhandled SMS provider: ${provider}`);
});
```

**Step 2: Run full test suite**

```bash
npx jest --no-coverage
```

Expected: all tests PASS (SMS has no dedicated test file; verify no regressions elsewhere).

**Step 3: Commit**

```bash
git add lib/sms/index.ts
git commit -m "refactor(sms): use createLazySingleton and pickProvider"
```

---

### Task 4: Refactor `lib/speech/voice/index.ts`

**Files:**
- Modify: `lib/speech/voice/index.ts`

`createVoiceProvider()` currently creates a new provider instance on every call. Wrapping it in `createLazySingleton` makes the provider stable across re-renders. The optional `name` parameter override is preserved for tests that need a specific provider.

> Note: `name` override bypasses the singleton — callers passing an explicit name get a fresh instance each time (used only in tests). The no-arg call path (production) returns the cached instance.

**Step 1: Replace the file contents**

```ts
import { createLazySingleton, pickProvider } from '@/lib/utils/singleton';
export type { VoiceConversationProvider, VoiceSessionState, VoiceSessionOptions, VoiceEventMap } from './types';
export { BaseVoiceProvider } from './base';
export { NativeVoiceProvider } from './native';
export { VapiVoiceProvider } from './vapi';
export { GeminiLiveVoiceProvider } from './gemini-live';
export { LiveKitVoiceProvider } from './livekit';
export { OpenAIRealtimeVoiceProvider } from './openai-realtime';

const VOICE_PROVIDERS = ['native', 'vapi', 'gemini-live', 'livekit', 'openai-realtime'] as const;
type VoiceProvider = (typeof VOICE_PROVIDERS)[number];

function buildVoiceProvider(name: VoiceProvider): import('./types').VoiceConversationProvider {
  if (name === 'vapi') {
    const { VapiVoiceProvider } = require('./vapi') as typeof import('./vapi');
    return new VapiVoiceProvider();
  }
  if (name === 'gemini-live') {
    const { GeminiLiveVoiceProvider } = require('./gemini-live') as typeof import('./gemini-live');
    return new GeminiLiveVoiceProvider();
  }
  if (name === 'livekit') {
    const { LiveKitVoiceProvider } = require('./livekit') as typeof import('./livekit');
    return new LiveKitVoiceProvider();
  }
  if (name === 'openai-realtime') {
    const { OpenAIRealtimeVoiceProvider } = require('./openai-realtime') as typeof import('./openai-realtime');
    return new OpenAIRealtimeVoiceProvider();
  }
  const { NativeVoiceProvider } = require('./native') as typeof import('./native');
  return new NativeVoiceProvider();
}

const _getDefaultVoiceProvider = createLazySingleton((): import('./types').VoiceConversationProvider => {
  const name = pickProvider<VoiceProvider>(
    'NEXT_PUBLIC_VOICE_PROVIDER',
    process.env.NEXT_PUBLIC_VOICE_PROVIDER,
    VOICE_PROVIDERS,
    'livekit',
  );
  return buildVoiceProvider(name);
});

/**
 * Returns the voice provider instance determined by NEXT_PUBLIC_VOICE_PROVIDER.
 * Passing an explicit `name` bypasses the singleton (for tests only).
 * Call this inside a useEffect or 'use client' context — providers use browser APIs.
 */
export function createVoiceProvider(name?: string): import('./types').VoiceConversationProvider {
  if (name) {
    const validated = pickProvider<VoiceProvider>(
      'NEXT_PUBLIC_VOICE_PROVIDER',
      name,
      VOICE_PROVIDERS,
      'livekit',
    );
    return buildVoiceProvider(validated);
  }
  return _getDefaultVoiceProvider();
}
```

**Step 2: Run voice-related tests**

```bash
npx jest --testPathPattern="voice|vapi|livekit|openai-realtime" --no-coverage
```

Expected: all tests PASS.

**Step 3: Run the full test suite**

```bash
npx jest --no-coverage
```

Expected: all tests PASS.

**Step 4: Commit**

```bash
git add lib/speech/voice/index.ts
git commit -m "refactor(voice): use createLazySingleton and pickProvider"
```

---

### Task 5: Build verification and push

**Step 1: Run production build**

```bash
npx next build
```

Expected: clean compile, no TypeScript errors, no `!` workarounds needed.

**Step 2: Push**

```bash
git push
```

Expected: Vercel deployment succeeds (green).
