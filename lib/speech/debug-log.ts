/**
 * Non-blocking debug logging for the speech pipeline.
 * Only sends when run on localhost so production never hits loopback (avoids CORS / Private Network Access errors).
 * Safe to import from client and server (no Node-only modules like fs).
 */
const DEBUG_INGEST_URL = 'http://127.0.0.1:7379/ingest/9dfc6de0-1d29-4c43-9b59-25a539942869';
const DEBUG_SESSION_ID = '80ff0b';
const DEBUG_TIMEOUT_MS = 500;

function isLocalhost(): boolean {
  if (typeof window !== 'undefined') {
    const h = window.location?.hostname ?? '';
    return h === 'localhost' || h === '127.0.0.1' || h.endsWith('.local');
  }
  return process.env.NODE_ENV === 'development';
}

export function debugLog(payload: {
  location: string;
  message: string;
  data?: Record<string, unknown>;
  hypothesisId?: string;
}): void {
  if (process.env.NODE_ENV === 'test' || typeof fetch === 'undefined' || !isLocalhost()) return;
  const full = { sessionId: DEBUG_SESSION_ID, ...payload, timestamp: Date.now() };
  const body = JSON.stringify(full);

  const signal =
    typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal
      ? AbortSignal.timeout(DEBUG_TIMEOUT_MS)
      : undefined;
  fetch(DEBUG_INGEST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': DEBUG_SESSION_ID },
    body,
    signal,
  }).catch(() => {});
}
