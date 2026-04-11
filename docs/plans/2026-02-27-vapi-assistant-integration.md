# Vapi Assistant Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Switch `VapiVoiceProvider` from inline assistant config to a pre-built Vapi dashboard assistant (`985d923d-6efc-43ef-b9a9-4b935c954a9c`) while keeping our custom LLM backend for guardrails, mood, and missions.

**Architecture:** `vapi.start()` now passes `assistantId` + `assistantOverrides` instead of a full inline config. The model override points at `/api/vapi/llm`; the URL is read from `NEXT_PUBLIC_CUSTOM_LLM_URL` (set to an ngrok URL in local dev, empty in production where `window.location.origin` is used). Voice and transcriber config live in the Vapi dashboard. No changes to the LLM route or the talk page.

**Tech Stack:** `@vapi-ai/web` SDK, Next.js env vars, Jest for tests

---

### Task 1: Add env vars to `.env.example`

**Files:**
- Modify: `.env.example`

**Step 1: Open `.env.example` and find the Vapi section (around line 63)**

It currently reads:
```
# NEXT_PUBLIC_VAPI_PUBLIC_KEY=
# NEXT_PUBLIC_ELEVENLABS_VOICE_ID=EXAVITQu4vr4xnSDxMaL
```

**Step 2: Replace that block with**

```
# NEXT_PUBLIC_VAPI_PUBLIC_KEY=
# NEXT_PUBLIC_VAPI_ASSISTANT_ID=985d923d-6efc-43ef-b9a9-4b935c954a9c
# NEXT_PUBLIC_CUSTOM_LLM_URL=   # leave empty in prod; set to ngrok URL for local dev
# NEXT_PUBLIC_ELEVENLABS_VOICE_ID=EXAVITQu4vr4xnSDxMaL
```

**Step 3: Also add the two new vars to your local `.env.local`**

```
NEXT_PUBLIC_VAPI_ASSISTANT_ID=985d923d-6efc-43ef-b9a9-4b935c954a9c
NEXT_PUBLIC_CUSTOM_LLM_URL=    # empty for prod; ngrok URL for local dev
```

**Step 4: Commit**

```bash
git add .env.example
git commit -m "feat: add VAPI_ASSISTANT_ID and CUSTOM_LLM_URL env vars"
```

---

### Task 2: Update `VapiVoiceProvider.start()` to use `assistantId`

**Files:**
- Modify: `lib/speech/voice/vapi.ts:27-78`

**Step 1: Write the failing test**

Create `__tests__/services/vapi-provider.test.ts`:

```ts
/**
 * Tests that VapiVoiceProvider.start() calls vapi.start() with
 * assistantId + assistantOverrides (not inline assistant config).
 */

// Mock the @vapi-ai/web dynamic import
const mockStart = jest.fn().mockResolvedValue(undefined);
const mockStop  = jest.fn();
const MockVapi  = jest.fn().mockImplementation(() => ({
  start: mockStart,
  stop:  mockStop,
  on:    jest.fn(),
  off:   jest.fn(),
}));

jest.mock('@vapi-ai/web', () => ({ default: MockVapi }));

import { VapiVoiceProvider } from '@/lib/speech/voice/vapi';

const ASSISTANT_ID = '985d923d-6efc-43ef-b9a9-4b935c954a9c';

beforeEach(() => {
  jest.clearAllMocks();
  process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY    = 'test-public-key';
  process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID  = ASSISTANT_ID;
  process.env.NEXT_PUBLIC_CUSTOM_LLM_URL     = 'https://test.ngrok.io';
});

afterEach(() => {
  delete process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
  delete process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;
  delete process.env.NEXT_PUBLIC_CUSTOM_LLM_URL;
});

test('start() calls vapi.start with assistantId', async () => {
  const provider = new VapiVoiceProvider();
  await provider.start({ childName: 'Leo', topics: ['space'], difficultyProfile: 'beginner', activeMission: null });

  expect(mockStart).toHaveBeenCalledTimes(1);
  const arg = mockStart.mock.calls[0][0];
  expect(arg.assistantId).toBe(ASSISTANT_ID);
});

test('start() passes model override with custom-llm URL', async () => {
  const provider = new VapiVoiceProvider();
  await provider.start({ childName: 'Leo', topics: [], difficultyProfile: 'beginner', activeMission: null });

  const arg = mockStart.mock.calls[0][0];
  expect(arg.assistantOverrides.model.provider).toBe('custom-llm');
  expect(arg.assistantOverrides.model.url).toBe('https://test.ngrok.io/api/vapi/llm');
});

test('start() falls back to window.location.origin when CUSTOM_LLM_URL is unset', async () => {
  delete process.env.NEXT_PUBLIC_CUSTOM_LLM_URL;
  // jsdom sets window.location.origin to 'http://localhost'
  const provider = new VapiVoiceProvider();
  await provider.start({ childName: 'Leo', topics: [], difficultyProfile: 'beginner', activeMission: null });

  const arg = mockStart.mock.calls[0][0];
  expect(arg.assistantOverrides.model.url).toContain('/api/vapi/llm');
});

test('start() passes childName in variableValues', async () => {
  const provider = new VapiVoiceProvider();
  await provider.start({ childName: 'Mia', topics: [], difficultyProfile: 'beginner', activeMission: null });

  const arg = mockStart.mock.calls[0][0];
  expect(arg.assistantOverrides.variableValues.childName).toBe('Mia');
});

test('start() passes context in metadata', async () => {
  const provider = new VapiVoiceProvider();
  await provider.start({ childName: 'Mia', topics: ['animals'], difficultyProfile: 'intermediate', activeMission: null });

  const arg = mockStart.mock.calls[0][0];
  expect(arg.metadata.childName).toBe('Mia');
  expect(arg.metadata.topics).toEqual(['animals']);
  expect(arg.metadata.difficultyProfile).toBe('intermediate');
});

test('start() emits error when NEXT_PUBLIC_VAPI_PUBLIC_KEY is missing', async () => {
  delete process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
  const provider = new VapiVoiceProvider();
  const errors: string[] = [];
  provider.on('error', (msg: string) => errors.push(msg));
  await provider.start({});
  expect(errors).toHaveLength(1);
  expect(errors[0]).toMatch(/NEXT_PUBLIC_VAPI_PUBLIC_KEY/);
});

test('start() emits error when NEXT_PUBLIC_VAPI_ASSISTANT_ID is missing', async () => {
  delete process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;
  const provider = new VapiVoiceProvider();
  const errors: string[] = [];
  provider.on('error', (msg: string) => errors.push(msg));
  await provider.start({});
  expect(errors).toHaveLength(1);
  expect(errors[0]).toMatch(/NEXT_PUBLIC_VAPI_ASSISTANT_ID/);
});
```

**Step 2: Run the tests to confirm they fail**

```bash
npx jest __tests__/services/vapi-provider.test.ts --no-coverage
```

Expected: FAIL — `start()` still uses inline config, not `assistantId`.

**Step 3: Update `lib/speech/voice/vapi.ts` — replace the `start()` method body**

Find the block from line 27 to line 78 (the entire `start()` method). Replace it with:

```ts
async start(options: VoiceSessionOptions): Promise<void> {
  const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
  if (!publicKey) {
    this.emit('error', 'NEXT_PUBLIC_VAPI_PUBLIC_KEY is not set');
    return;
  }

  const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;
  if (!assistantId) {
    this.emit('error', 'NEXT_PUBLIC_VAPI_ASSISTANT_ID is not set');
    return;
  }

  if (options.initialMessages?.length) {
    this.messages = [...options.initialMessages];
  }

  // Dynamic import keeps @vapi-ai/web out of the server bundle
  const gen = ++this._generation;
  const { default: Vapi } = await import('@vapi-ai/web');
  // If stop() was called while we were waiting for the import (React Strict Mode
  // double-invoke, fast unmount, etc.), bail out — don't create a second SDK instance.
  if (this._generation !== gen) return;
  this.vapi = new Vapi(publicKey);
  this.bindVapiEvents(options, gen);

  const llmBase =
    process.env.NEXT_PUBLIC_CUSTOM_LLM_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '');

  await this.vapi.start({
    assistantId,
    assistantOverrides: {
      model: {
        provider: 'custom-llm',
        model: 'tammy',
        url: `${llmBase}/api/vapi/llm`,
        metadataSendMode: 'variable',
      },
      variableValues: {
        childName: options.childName ?? 'friend',
      },
    },
    // top-level metadata — Vapi forwards this to /api/vapi/llm as body.metadata
    metadata: {
      childName: options.childName ?? null,
      topics: options.topics ?? [],
      difficultyProfile: options.difficultyProfile ?? 'beginner',
      activeMission: options.activeMission ?? null,
    },
  });
}
```

Also update the JSDoc comment at the top of the class (line 8) to reflect the new env vars:

```ts
 * Required env vars: NEXT_PUBLIC_VAPI_PUBLIC_KEY, NEXT_PUBLIC_VAPI_ASSISTANT_ID
 * Optional env var:  NEXT_PUBLIC_CUSTOM_LLM_URL (set to ngrok URL for local dev)
```

**Step 4: Run the tests to confirm they pass**

```bash
npx jest __tests__/services/vapi-provider.test.ts --no-coverage
```

Expected: all 7 tests PASS.

**Step 5: Run the full test suite to confirm no regressions**

```bash
npx jest --no-coverage
```

Expected: all tests pass (103 + 7 new = 110).

**Step 6: Commit**

```bash
git add lib/speech/voice/vapi.ts __tests__/services/vapi-provider.test.ts
git commit -m "feat: switch VapiVoiceProvider to assistantId + overrides"
```

---

### Task 3: Manual smoke test

No code changes — verify end-to-end.

**Step 1: Confirm env vars are set in `.env.local`**

```
NEXT_PUBLIC_VAPI_PUBLIC_KEY=<your key>
NEXT_PUBLIC_VAPI_ASSISTANT_ID=985d923d-6efc-43ef-b9a9-4b935c954a9c
NEXT_PUBLIC_CUSTOM_LLM_URL=   # empty if testing on deployed, or ngrok URL if local
```

**Step 2: For local dev — start ngrok**

```bash
ngrok http 3000
```

Copy the `https://xxxx.ngrok.io` URL into `NEXT_PUBLIC_CUSTOM_LLM_URL` in `.env.local`, then restart the dev server.

**Step 3: Start the dev server**

```bash
npm run dev
```

**Step 4: Navigate to `/talk` and verify**

- Turtle appears, state shows "Getting ready..."
- After a second: state shows "Tammy is listening 👂" (Vapi call connected)
- Speak a sentence — state transitions to "I hear you! 🎤" then "Tammy is thinking..."
- Tammy responds — state shows "Tammy is speaking!"
- After ~5 exchanges: mission choices appear

**Step 5: Check browser console for errors**

No errors related to `NEXT_PUBLIC_VAPI_ASSISTANT_ID` or `custom-llm`.

**Step 6: Check server logs for `/api/vapi/llm` hits**

```
[vapi/llm] raw messages received: [...]
[vapi/llm] LLM response: { text: "...", mood: "happy", ... }
```
