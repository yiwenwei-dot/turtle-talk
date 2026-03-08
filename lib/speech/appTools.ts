/**
 * App-side tool router stub.
 *
 * LiveKit (and other providers) can request app-side tools by sending an
 * `appToolCall` control message. This module provides a thin wrapper that the
 * browser can call to hand those requests to a Next.js API route.
 *
 * The API route is intentionally a no-op for now — it logs the request server-
 * side and returns a simple acknowledgement so we can wire everything up
 * without committing to specific tools yet.
 */

export interface AppToolCallPayload {
  tool: string;
  // Concrete tools define their own argument shapes.
  args: unknown;
}

/**
 * Best-effort hand-off of an app tool call to the server.
 * Failures are intentionally swallowed; the conversation should continue.
 */
export async function handleAppToolCall(call: AppToolCallPayload): Promise<void> {
  try {
    await fetch('/api/app-tools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(call),
    });
  } catch {
    // Ignore network errors — app tools are additive, not critical.
  }
}

