/**
 * Returns a getter that lazily creates and caches a singleton instance.
 * Eliminates null-typed module-level vars and the ! workaround.
 * If the factory throws, no instance is cached and the next call will retry.
 * T extends NonNullable<unknown> prevents undefined/null factories, which would
 * bypass the ?? memoization check and call the factory on every invocation.
 */
export function createLazySingleton<T extends NonNullable<unknown>>(factory: () => T): () => T {
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
