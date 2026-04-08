/**
 * Child session cookie: signed payload so client cannot forge childId.
 * Server-only: use in API routes and server components.
 */
import { createHmac, timingSafeEqual } from 'crypto';

const COOKIE_NAME = 'turtle-talk-child-session';
const MAX_AGE_DAYS = 7;

export interface ChildSessionPayload {
  childId: string;
  firstName: string;
  emoji: string;
  exp: number;
  /** Unix timestamp (seconds) of last touch. Used for idle-timeout check. */
  iat?: number;
}

/** Idle timeout: 30 minutes of inactivity expires the session. */
const IDLE_TIMEOUT_SECONDS = 30 * 60;
/** Minimum re-issue interval: don't rewrite the cookie more than once per 5 minutes. */
const TOUCH_MIN_INTERVAL_SECONDS = 5 * 60;

function getSecret(): string | null {
  const secret = process.env.CHILD_SESSION_SECRET;
  if (!secret || secret.length < 16) return null;
  return secret;
}

function base64UrlEncode(buf: Buffer): string {
  return buf.toString('base64url');
}

function base64UrlDecode(str: string): Buffer {
  return Buffer.from(str, 'base64url');
}

function sign(payload: string): string {
  const secret = getSecret();
  if (!secret) throw new Error('CHILD_SESSION_SECRET not set');
  const hmac = createHmac('sha256', secret);
  hmac.update(payload);
  return base64UrlEncode(hmac.digest());
}

function verify(payload: string, signature: string): boolean {
  const secret = getSecret();
  if (!secret) return false;
  const hmac = createHmac('sha256', secret);
  hmac.update(payload);
  const expected = base64UrlEncode(hmac.digest());
  if (expected.length !== signature.length) return false;
  try {
    return timingSafeEqual(
      Buffer.from(expected, 'utf8'),
      Buffer.from(signature, 'utf8')
    );
  } catch {
    return false;
  }
}

export function getChildSessionCookieName(): string {
  return COOKIE_NAME;
}

export function createChildSessionCookieValue(
  childId: string,
  firstName: string,
  emoji: string
): string {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_DAYS * 24 * 60 * 60;
  const payload: Omit<ChildSessionPayload, 'exp'> & { exp: number } = {
    childId,
    firstName,
    emoji,
    exp,
  };
  const payloadStr = base64UrlEncode(Buffer.from(JSON.stringify(payload)));
  const signature = sign(payloadStr);
  return `${payloadStr}.${signature}`;
}

export function parseChildSessionCookieValue(
  value: string | undefined
): ChildSessionPayload | null {
  if (!value || !value.includes('.')) return null;
  const [payloadStr, signature] = value.split('.');
  if (!payloadStr || !signature || !verify(payloadStr, signature))
    return null;
  try {
    const payload = JSON.parse(
      base64UrlDecode(payloadStr).toString('utf8')
    ) as ChildSessionPayload;
    if (
      typeof payload.childId !== 'string' ||
      typeof payload.exp !== 'number' ||
      payload.exp < Date.now() / 1000
    )
      return null;
    return payload;
  } catch {
    return null;
  }
}

export function getChildSessionCookieOptions(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict';
  maxAge: number;
  path: string;
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: MAX_AGE_DAYS * 24 * 60 * 60,
    path: '/',
  };
}

/**
 * Returns true if the session has been idle for more than IDLE_TIMEOUT_SECONDS.
 * Migration safety: sessions without iat (issued before this change) are treated
 * as fresh so existing users are not force-logged-out on deploy.
 */
export function isSessionStale(payload: ChildSessionPayload): boolean {
  const iat = payload.iat ?? Math.floor(Date.now() / 1000);
  return Math.floor(Date.now() / 1000) - iat > IDLE_TIMEOUT_SECONDS;
}

/**
 * Re-issue the child session cookie with a refreshed iat, extending the idle window.
 * - exp is NEVER changed — it stays anchored to the original login (7-day hard limit).
 * - Skips re-issue if the last touch was less than TOUCH_MIN_INTERVAL_SECONDS ago,
 *   preventing cookie-write races on concurrent requests.
 */
export function touchSession(
  response: { cookies: { set(name: string, value: string, opts: ReturnType<typeof getChildSessionCookieOptions>): void } },
  payload: ChildSessionPayload,
): void {
  const now = Math.floor(Date.now() / 1000);
  const lastTouch = payload.iat ?? 0;
  if (now - lastTouch < TOUCH_MIN_INTERVAL_SECONDS) return;

  const updated: ChildSessionPayload = { ...payload, iat: now };
  const payloadStr = base64UrlEncode(Buffer.from(JSON.stringify(updated)));
  const signature  = sign(payloadStr);
  response.cookies.set(getChildSessionCookieName(), `${payloadStr}.${signature}`, getChildSessionCookieOptions());
}
