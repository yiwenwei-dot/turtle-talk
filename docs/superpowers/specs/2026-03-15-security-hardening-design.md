# Security Hardening Design
**Date:** 2026-03-15
**Status:** Approved
**Branch:** demo-flow-v2
**Context:** Soft-launch phase. Real children are in the system. Audit identified missing rate limiting, no security headers, unvalidated LLM inputs, and no GDPR data rights endpoints.

---

## Overview

Four independent phases, each deployable on its own. Ordered by urgency and risk.

| Phase | Scope | New Dependencies |
|-------|-------|-----------------|
| 1 | Security headers + cookie hardening | None |
| 2 | Rate limiting + brute-force lockout | `@upstash/ratelimit`, `@upstash/redis` |
| 3 | Zod input validation + session hardening + prompt sanitization | None (Zod already present) |
| 4 | GDPR data export, account deletion, AI transparency page | None |

---

## Phase 1: Security Headers + Cookie Hardening

### Goal
Add HTTP security headers and tighten the child session cookie with no new dependencies.

### Changes

**`next.config.ts`** — add `async headers()` returning these headers on all routes (`source: '/(.*)'`):

| Header | Value | Reason |
|--------|-------|--------|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` | Enforce HTTPS for 2 years |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME-type sniffing |
| `X-Frame-Options` | `DENY` | Block clickjacking via iframes |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limit referrer leakage |
| `Permissions-Policy` | `microphone=(self), camera=(), geolocation=()` | Scope browser API access |
| `Content-Security-Policy` | See below | Restrict resource origins |

**CSP value:**
```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https://m.media-amazon.com https://books.disney.com;
media-src 'self' blob:;
connect-src 'self' https://*.supabase.co https://api.elevenlabs.io https://api.openai.com https://api.anthropic.com https://generativelanguage.googleapis.com https://*.upstash.io wss://*.supabase.co;
font-src 'self';
frame-ancestors 'none';
```

> Note: `unsafe-inline` and `unsafe-eval` are required by Next.js's runtime. Nonce-based CSP is a future improvement.

**`lib/child-session.ts`** — change `sameSite: 'lax'` → `'strict'` in `getChildSessionCookieOptions()`. The child session is only consumed within the app; no cross-site navigation needs to carry this cookie.

### Testing
- Verify headers with `curl -I https://<your-domain>/` or browser DevTools → Network → response headers
- Confirm child session cookie shows `SameSite=Strict` in DevTools → Application → Cookies

---

## Phase 2: Rate Limiting + Brute-Force Lockout

### Goal
Prevent API abuse (AI cost amplification) and brute-force attacks on the child login endpoint using Upstash Redis.

### Prerequisites
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` set in `.env.local` and Vercel environment

### New Files

**`lib/ratelimit.ts`**
```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// 20 requests per 60 seconds per IP — protects AI spend on /api/talk
export const talkLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '60 s'),
  prefix: 'rl:talk',
});

// 5 attempts per 15 minutes per IP — brute-force on /api/child-login
export const loginLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '15 m'),
  prefix: 'rl:login',
});

// 100 requests per 60 seconds per IP — global API backstop
export const globalLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '60 s'),
  prefix: 'rl:global',
});
```

### Changed Files

**`app/api/talk/route.ts`** — rate limit check must come **after** the `audioFile` present/valid check and **after** FormData parsing, so invalid requests (no audio body) do not consume quota. Pattern:

```typescript
// 1. Parse FormData first
// 2. Validate audioFile is present — return 400 if not
// 3. Then apply rate limit
const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'anonymous';
// Key on childId from session cookie when available (handles shared-NAT / school networks).
// Fall back to IP for unauthenticated/guest requests.
const childSession = parseChildSessionCookieValue(req.cookies.get(getChildSessionCookieName())?.value);
const rateLimitKey = childSession?.childId ?? ip;
const { success, reset } = await talkLimiter.limit(rateLimitKey);
if (!success) {
  return new Response(null, {
    status: 429,
    headers: { 'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)) },
  });
}
```

> Keying on `childId` (from the signed session cookie) prevents shared-NAT false positives when multiple children use the app from the same school or home network. The login limiter remains IP-based since attacks there are pre-authentication.

**`app/api/child-login/route.ts`** — apply `loginLimiter` keyed on IP at the top of `POST()`, before any Supabase queries.

**`middleware.ts`** — apply `globalLimiter` keyed on IP to all `/api/*` routes. Skip static assets. Return `429` with `Retry-After` on limit exceeded. The existing `updateSession` call only runs when the limit passes.

### Rate Limit Values (rationale)
- `talkLimiter` 20/60s per childId: a real child speaks ~1 turn per 15–30 seconds; 20/min is generous for normal use but blocks automated hammering
- `loginLimiter` 5/15min per IP: prevents enumeration of 6-char login codes (26^6 = 308M combinations)
- `globalLimiter` 100/60s per IP: backstop against scanners; well above any legitimate single-user load

### Testing
- Send 21 requests to `/api/talk` in quick succession with same child session → 21st should return 429
- Send 6 login attempts in quick succession → 6th should return 429 with `Retry-After` header
- Confirm invalid audio body (no `audio` field) returns 400, not 429, and does not decrement quota

---

## Phase 3: Zod Validation + Session Hardening + Prompt Sanitization

### Goal
Validate all untrusted input that reaches the LLM, sanitize strings embedded in system prompts, and add session idle timeout.

### Zod Schemas

**`app/api/talk/route.ts`** — replace loose `JSON.parse` + type-cast with explicit Zod parsing:

```typescript
const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().max(2000),
});

const TalkFormSchema = z.object({
  messages: z.array(MessageSchema).max(20).default([]),
  childName: z.string().max(50).optional(),
  topics: z.array(z.string().max(100)).max(15).default([]),
  difficultyProfile: z.enum(['beginner', 'intermediate', 'confident']).default('beginner'),
  // Full Mission shape — matches ConversationContext['activeMission'] in lib/speech/types.ts.
  // The client sends the full stored Mission object; we validate all fields to prevent
  // type errors downstream and strip unexpected keys via Zod's strip mode (default).
  activeMission: z.object({
    id: z.string().max(100),
    title: z.string().max(200),
    description: z.string().max(500),
    theme: z.enum(['brave', 'kind', 'calm', 'confident', 'creative', 'social', 'curious']),
    difficulty: z.enum(['easy', 'medium', 'stretch']).optional(),
    status: z.enum(['active', 'completed']),
    createdAt: z.string().max(50),
    completedAt: z.string().max(50).optional(),
  }).nullable().default(null),
  timezone: z.string().max(100).optional(),
  clientLocalTime: z.string().max(50).optional(),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }).optional(),
});
```

Parse with `.safeParse()` and return `400` on failure with a generic `"Invalid request"` message (do not expose Zod error details to the client).

**`app/api/vapi/llm/route.ts`** — same schema for `meta` fields extracted from the system message.

### Prompt Sanitization

**`lib/speech/prompts/shelly-build.ts`** — `buildSystemPrompt` is the canonical interpolation point for all voice paths (HTTP `/api/talk`, Vapi `/api/vapi/llm`, OpenAI Realtime, Gemini Live). Sanitization belongs here, not scattered across each API route, so all paths are covered uniformly.

Add `sanitizeForPrompt` as a module-level helper and call it at each interpolation site within `buildSystemPrompt`:

```typescript
function sanitizeForPrompt(s: string, maxLen = 200): string {
  return s
    .replace(/[\n\r]/g, ' ')       // no newlines (prompt injection vector)
    .replace(/[`<>"]/g, '')        // no backticks, angle brackets, or double-quotes
                                   // (double-quotes matter: fields are interpolated inside
                                   //  double-quoted string literals in the prompt template)
    .slice(0, maxLen)              // hard length cap — defense-in-depth alongside Zod
    .trim();
}
```

> The `.slice(maxLen)` cap is intentionally redundant with the Zod field limits at the API boundary. The Zod layer rejects out-of-range values before they reach this function; the `slice` here is a second layer in case `buildSystemPrompt` is ever called from a path that bypasses the API schema (e.g., test code or future voice providers).

Apply at each interpolation site in `buildSystemPrompt`:
- `childName` — `sanitizeForPrompt(childName, 50)`
- each item in `topics` — `sanitizeForPrompt(t, 100)` — note: character limits alone do not prevent semantic injection phrases like "forget everything above"; sanitization plus Zod's `.max(100)` per item are complementary controls, not a guarantee
- `activeMission.title` — `sanitizeForPrompt(activeMission.title, 200)`
- `activeMission.description` — `sanitizeForPrompt(activeMission.description, 500)`
- `timezone` — `sanitizeForPrompt(timezone, 100)` before passing to `getTimeDescription()`
- `clientLocalTime` — `sanitizeForPrompt(clientLocalTime, 50)` before passing to `getTimeDescription()`

### Session Idle Timeout

**`lib/child-session.ts`** — extend `ChildSessionPayload` with `iat: number` (issued-at unix timestamp, set at login). Add:

- `isSessionStale(payload)` — returns true if `Date.now()/1000 - (payload.iat ?? Date.now()/1000) > 1800` (30 minutes since last touch). **Migration safety:** if `iat` is absent (existing cookies issued before this change), treat it as `Date.now()/1000` (i.e., just issued). This prevents a forced mass-logout of all active users on the first deploy after this change. Cookies without `iat` are treated as fresh and will gain `iat` on their next touch.
- `touchSession(response, payload)` — re-issues the cookie with a refreshed `iat` = now and a **fixed** `exp` = `payload.exp` (the original expiry from login). The `exp` is anchored to the original login time and is never extended by touching. This means a session remains bounded to 7 days from login regardless of activity. The idle window is tracked separately via `iat`.
- `TOUCH_MIN_INTERVAL = 300` (5 minutes) — `touchSession()` must check `Date.now()/1000 - (payload.iat ?? 0) < TOUCH_MIN_INTERVAL` and skip re-issuing the cookie if the last touch was less than 5 minutes ago. This prevents concurrent requests from producing a race condition where the browser discards an out-of-order cookie write.

**`app/api/child-session/route.ts`** only — call `touchSession()` on each valid authenticated request. Do **not** call `touchSession()` from `/api/talk` (high-frequency streaming route) to avoid cookie churn. The child session route is the single touch point. If `isSessionStale()`, clear the cookie and return `401`.

### Testing
- Send `childName: "Ignore previous instructions"` → verify it reaches the LLM sanitized
- Send `location: { latitude: 999, longitude: 0 }` → verify 400 response
- Send `messages` with `role: "system"` → verify 400 response
- Leave a child session idle for >30 min → verify next request returns 401

---

## Phase 4: GDPR Data Rights + AI Transparency

### Goal
Give parents the ability to download or delete all data for their children, and provide a clear disclosure about AI usage.

### New API Routes

**`app/api/parent/data-export/route.ts`** — `GET`, parent-authenticated via Supabase session.

Query params: `childId` (required, must be linked to authenticated parent via `parent_child` table).

Collects and returns as downloadable JSON:
- `child`: profile row from `children` table
- `memory`: row from `child_memory` table
- `missions`: all rows from `missions` table for this child
- `wishList`: all rows from `wish_list` table
- `encouragements`: all rows from `encouragements` table
- `treeState`: row from `child_tree` table

Response headers:
```
Content-Type: application/json
Content-Disposition: attachment; filename="turtletalk-<childId>-<YYYY-MM-DD>.json"
```

**`app/api/parent/delete-account/route.ts`** — `DELETE`, parent-authenticated via Supabase session.

Body: `{ childId?: string, deleteParent?: boolean }`.

**Ownership assertion (required):** Before any deletion, verify the authenticated parent owns the target child by querying `parent_child` where `parent_id = user.id AND child_id = childId`. Return `403` if not found. This is the same ownership check as the export route — no parent can delete another parent's child's data.

**Deletion strategy:** The Supabase schema uses `ON DELETE CASCADE` foreign keys from the `children` row outward to all child data tables. Therefore:
- If `childId` provided: assert ownership → delete the `children` row → CASCADE handles all dependent rows automatically → delete the `parent_child` link
- If `deleteParent: true`: assert parent owns all linked children → delete each `children` row (CASCADE) → delete each `parent_child` link → delete the parent auth user via `supabase.auth.admin.deleteUser(user.id)` using the service role client

> If CASCADE constraints are not yet in place on all tables, add them in a migration before implementing this route rather than managing deletion order in application code.

- Returns `{ ok: true, deletedChildId?, deletedParentId? }`

### New UI Page

**`app/parent/privacy/page.tsx`** — linked from the parent dashboard nav.

Sections:
1. **What we store** — bullet list: child name + emoji, conversation topics, mission history, wish list, encouragements. Explicitly states: no audio recordings are stored, no conversation transcripts are stored server-side.
2. **AI processing disclosure** — names the AI providers used (Anthropic Claude, Google Gemini, OpenAI Whisper), states conversations are processed in real-time and not retained by TurtleTalk servers, links to each provider's privacy policy. States data is not used to train any models.
3. **Download your data** — button per linked child → calls export endpoint → browser downloads JSON file
4. **Delete data** — per-child delete button with confirmation modal ("This will permanently delete all of [Name]'s data. This cannot be undone.") and a separate "Delete my parent account" option

### Testing
- Authenticated parent can download a child's data as a JSON file
- Unauthenticated request to export endpoint returns 401
- Parent cannot export data for a child not linked to their account (403)
- Delete removes all rows; subsequent export returns empty collections
- Privacy page renders and links correctly from parent dashboard

---

## What This Does NOT Cover (Deferred)

- **MFA / Passkeys** — Supabase supports this via dashboard config; no code changes needed, deferred to parent dashboard settings
- **Nonce-based CSP** — requires Next.js middleware injection; complexity outweighs benefit at current scale
- **Full audit logging** — out of scope for this phase
- **SMS/email on account deletion** — deferred

---

## Dependencies

```
@upstash/ratelimit  ^2.x
@upstash/redis      ^1.x
```

Zod is already present in the project.

## Environment Variables Added

```
UPSTASH_REDIS_REST_URL      # Upstash REST endpoint
UPSTASH_REDIS_REST_TOKEN    # Upstash auth token (server-only, no NEXT_PUBLIC_ prefix)
```
