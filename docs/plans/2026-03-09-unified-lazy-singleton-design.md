# Design: Unified Lazy Singleton Factory

**Date:** 2026-03-09
**Status:** Approved
**Scope:** `lib/db/`, `lib/sms/`, `lib/speech/voice/`

## Problem

All three service factory modules share the same anti-patterns:

1. `null`-typed singletons (`let _instance: T | null = null`) require `!` non-null assertions on returns — TypeScript workaround that leaks into every module and caused a Vercel build failure.
2. No env-var validation — an unknown `NEXT_PUBLIC_DB_PROVIDER` or `SMS_PROVIDER` value silently falls through to a default or crashes at runtime with an unhelpful message.
3. Inconsistent patterns — `db` has two singletons, `sms` one, `voice` creates a new instance on every call (no memoization).

## Solution

Introduce a shared `lib/utils/singleton.ts` utility with two small helpers, then refactor all three service modules to use them.

## Architecture

### `lib/utils/singleton.ts`

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
 * Throws a descriptive error at first use if the value is unrecognised.
 * Returns the fallback if the value is absent.
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

### `lib/db/index.ts`

- Replace `let _instance: DatabaseService | null = null` / `return _instance!` pattern with two `createLazySingleton` calls.
- Use `pickProvider('NEXT_PUBLIC_DB_PROVIDER', ..., ['localStorage', 'supabase', 'convex'], 'localStorage')` inside the factory.
- `require()` calls inside factories stay — they are load-time isolation for SSR safety (localStorage and Supabase clients must not be imported at module load on the server).

### `lib/sms/index.ts`

- Same: one `createLazySingleton` call, `pickProvider('SMS_PROVIDER', ..., ['plivo'], 'plivo')`.

### `lib/speech/voice/index.ts`

- `createVoiceProvider()` currently creates a new instance on every call.
- Wrap in `createLazySingleton` so the voice provider is stable across re-renders.
- Keep `require()` + `as typeof import(...)` for SSR isolation.

## What Does Not Change

- `DatabaseService` interface — no changes.
- `require()` inside factories — intentional, keeps browser-only code off the server bundle.
- Each module stays self-contained; no cross-service coupling.

## Testing

- Unit test `createLazySingleton`: verify factory called once, same instance returned on repeat calls.
- Unit test `pickProvider`: valid value returned, fallback on absent, error thrown on unknown.
- Existing service module tests continue to pass unchanged (factory mock pattern is unaffected).

## Files Touched

| File | Change |
|------|--------|
| `lib/utils/singleton.ts` | New file |
| `lib/db/index.ts` | Use `createLazySingleton` + `pickProvider` |
| `lib/sms/index.ts` | Use `createLazySingleton` + `pickProvider` |
| `lib/speech/voice/index.ts` | Use `createLazySingleton` |
