/**
 * Rate limiters powered by Upstash Redis.
 *
 * Graceful degradation: when UPSTASH_REDIS_REST_URL / TOKEN are not set
 * (local dev without Redis), every limiter returns { success: true } so
 * the app works normally without Redis configured.
 */
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

function makeRedis(): Redis | null {
  const url   = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return new Redis({ url, token });
}

const redis = makeRedis();

/** Sentinel that always allows when Redis is not configured. */
const noopLimiter = {
  limit: async (_key: string) => ({ success: true, limit: 0, reset: 0, remaining: 0 }),
};

function makeLimiter(tokens: number, window: `${number} ${'s' | 'm' | 'h' | 'd'}`, prefix: string) {
  if (!redis) return noopLimiter;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(tokens, window),
    prefix,
  });
}

/**
 * /api/talk — voice turn processing.
 * 30 requests per 10 minutes per child/device.
 */
export const talkLimiter = makeLimiter(30, '10 m', 'ratelimit:talk');

/**
 * /api/child-login — brute-force guard.
 * 10 attempts per 15 minutes per IP.
 */
export const loginLimiter = makeLimiter(10, '15 m', 'ratelimit:login');

/**
 * Global limiter applied in middleware to all non-static requests.
 * 300 requests per minute per IP — protects against scripted floods.
 */
export const globalLimiter = makeLimiter(300, '1 m', 'ratelimit:global');
