# OpenAI Realtime Voice Provider — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `openai-realtime` as a new voice provider that uses OpenAI's WebRTC Realtime API for real-time, bidirectional audio with Tammy the turtle.

**Architecture:** New `OpenAIRealtimeVoiceProvider` extends `BaseVoiceProvider`. A Next.js server route mints an ephemeral key (keeps `OPENAI_API_KEY` server-side). The browser uses native WebRTC — mic audio streams to OpenAI, model audio plays via an `<audio>` element. The 5 Tammy tools are sent as JSON Schema on `session.update` via a data channel; tool call results are handled client-side.

**Tech Stack:** Next.js App Router (server route), native browser WebRTC (`RTCPeerConnection`, `RTCDataChannel`), OpenAI Realtime API (`/v1/realtime/sessions` + `/v1/realtime?model=...`), Jest + jsdom (tests).

---

### Task 1: Server route — `/api/openai-realtime/session`

**Files:**
- Create: `app/api/openai-realtime/session/route.ts`
- Create: `__tests__/api/openai-realtime-session.test.ts`

**Step 1: Write the failing test**

```typescript
// __tests__/api/openai-realtime-session.test.ts
import { POST } from '@/app/api/openai-realtime/session/route';
import { NextRequest } from 'next/server';

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  jest.clearAllMocks();
  process.env.OPENAI_API_KEY = 'sk-test';
});

afterEach(() => {
  delete process.env.OPENAI_API_KEY;
});

test('returns 503 when OPENAI_API_KEY is missing', async () => {
  delete process.env.OPENAI_API_KEY;
  const req = new NextRequest('http://localhost/api/openai-realtime/session', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  const res = await POST(req);
  expect(res.status).toBe(503);
  const body = await res.json();
  expect(body.error).toMatch(/OPENAI_API_KEY/);
});

test('calls OpenAI /v1/realtime/sessions with API key', async () => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ client_secret: { value: 'eph-key' } }),
  });
  const req = new NextRequest('http://localhost/api/openai-realtime/session', {
    method: 'POST',
    body: JSON.stringify({ model: 'gpt-realtime-1.5', voice: 'sage' }),
  });
  await POST(req);
  expect(mockFetch).toHaveBeenCalledWith(
    'https://api.openai.com/v1/realtime/sessions',
    expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer sk-test' }),
    })
  );
});

test('returns OpenAI session data on success', async () => {
  const sessionData = { client_secret: { value: 'eph-key-123' } };
  mockFetch.mockResolvedValueOnce({ ok: true, json: async () => sessionData });
  const req = new NextRequest('http://localhost/api/openai-realtime/session', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  const res = await POST(req);
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.client_secret.value).toBe('eph-key-123');
});

test('returns 502 when OpenAI returns an error', async () => {
  mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'quota exceeded' }) });
  const req = new NextRequest('http://localhost/api/openai-realtime/session', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  const res = await POST(req);
  expect(res.status).toBe(502);
});
```

**Step 2: Run test to verify it fails**

```
npx jest __tests__/api/openai-realtime-session.test.ts --no-coverage
```
Expected: FAIL — `Cannot find module '@/app/api/openai-realtime/session/route'`

**Step 3: Implement the route**

```typescript
// app/api/openai-realtime/session/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request): Promise<NextResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) {
    return NextResponse.json({ error: 'OPENAI_API_KEY is not set' }, { status: 503 });
  }

  try {
    const body = await req.json() as { model?: string; voice?: string };
    const defaultModel = process.env.NEXT_PUBLIC_OPENAI_REALTIME_MODEL ?? 'gpt-realtime-1.5';
    const defaultVoice = process.env.NEXT_PUBLIC_OPENAI_REALTIME_VOICE ?? 'sage';
    const model = body.model ?? defaultModel;
    const voice = body.voice ?? defaultVoice;

    const res = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, voice }),
    });

    if (!res.ok) {
      console.error('[openai-realtime/session] OpenAI error:', res.status);
      return NextResponse.json({ error: 'OpenAI session creation failed' }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('[openai-realtime/session]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 502 }
    );
  }
}
```

**Step 4: Run test to verify it passes**

```
npx jest __tests__/api/openai-realtime-session.test.ts --no-coverage
```
Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add app/api/openai-realtime/session/route.ts __tests__/api/openai-realtime-session.test.ts
git commit -m "feat: add /api/openai-realtime/session ephemeral token route"
```

---

### Task 2: Config additions

**Files:**
- Modify: `lib/speech/config.ts`

**Step 1: Add to `speechConfig`**

In `lib/speech/config.ts`, change the `voiceProvider` type union and add a new config block:

```typescript
// Change line ~90:
voiceProvider: (process.env.NEXT_PUBLIC_VOICE_PROVIDER ?? 'native') as
  'native' | 'vapi' | 'gemini-live' | 'livekit' | 'openai-realtime',

// Add after the chat block:
openaiRealtime: {
  model: process.env.NEXT_PUBLIC_OPENAI_REALTIME_MODEL ?? 'gpt-realtime-1.5',
  voice: (process.env.NEXT_PUBLIC_OPENAI_REALTIME_VOICE ?? 'sage') as
    'alloy' | 'ash' | 'ballad' | 'coral' | 'echo' | 'sage' | 'shimmer' | 'verse' | 'marin' | 'cedar',
},
```

Also update the comment block at the top of `config.ts` to include:
```
 *   NEXT_PUBLIC_VOICE_PROVIDER=openai-realtime — OpenAI WebRTC Realtime API
```

**Step 2: Commit**

```bash
git add lib/speech/config.ts
git commit -m "feat: add openai-realtime config to speechConfig"
```

---

### Task 3: `OpenAIRealtimeVoiceProvider` — tool definitions + system prompt

**Files:**
- Create: `lib/speech/voice/openai-realtime.ts`
- Create: `__tests__/services/openai-realtime-provider.test.ts` (system prompt tests only)

**Step 1: Write failing tests for system prompt**

```typescript
// __tests__/services/openai-realtime-provider.test.ts
// (Tests for system prompt building — we export the builder for testing)

// Mock browser APIs up front so the module can be imported in jsdom
class MockRTCPeerConnection {
  ontrack: ((e: unknown) => void) | null = null;
  createDataChannel = jest.fn().mockReturnValue({
    readyState: 'connecting',
    send: jest.fn(),
    close: jest.fn(),
    addEventListener: jest.fn(),
  });
  addTrack = jest.fn();
  createOffer = jest.fn().mockResolvedValue({ sdp: 'offer', type: 'offer' });
  setLocalDescription = jest.fn().mockResolvedValue(undefined);
  setRemoteDescription = jest.fn().mockResolvedValue(undefined);
  close = jest.fn();
}
global.RTCPeerConnection = MockRTCPeerConnection as unknown as typeof RTCPeerConnection;

Object.defineProperty(global.navigator, 'mediaDevices', {
  value: { getUserMedia: jest.fn().mockResolvedValue({ getTracks: () => [] }) },
  writable: true,
  configurable: true,
});

global.fetch = jest.fn();

import { OpenAIRealtimeVoiceProvider } from '@/lib/speech/voice/openai-realtime';

test('provider name is openai-realtime', () => {
  const p = new OpenAIRealtimeVoiceProvider();
  expect(p.name).toBe('openai-realtime');
});
```

**Step 2: Run test to verify it fails**

```
npx jest __tests__/services/openai-realtime-provider.test.ts --no-coverage
```
Expected: FAIL — module not found

**Step 3: Create the provider file with tool definitions and system prompt**

```typescript
// lib/speech/voice/openai-realtime.ts
'use client';

import type { Message, TurtleMood, MissionSuggestion } from '../types';
import type { VoiceSessionOptions } from './types';
import { BaseVoiceProvider } from './base';

const DEFAULT_MODEL = 'gpt-realtime-1.5';
const DEFAULT_VOICE = 'sage';
const SDP_ENDPOINT = 'https://api.openai.com/v1/realtime';

// ---------------------------------------------------------------------------
// Tool definitions (JSON Schema — mirrors the LangChain tools in chat.ts)
// ---------------------------------------------------------------------------

type RealtimeTool = {
  type: 'function';
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

function buildTools(): RealtimeTool[] {
  return [
    {
      type: 'function',
      name: 'report_mood',
      description: "Set Tammy's current emotional state. You MUST call this every single turn.",
      parameters: {
        type: 'object',
        properties: {
          mood: {
            type: 'string',
            enum: ['idle', 'listening', 'talking', 'happy', 'sad', 'confused', 'surprised'],
            description: 'Turtle mood for this response',
          },
        },
        required: ['mood'],
      },
    },
    {
      type: 'function',
      name: 'propose_missions',
      description:
        'Offer the child exactly 3 graded challenges — one easy, one medium, one stretch. ' +
        'You MUST call this whenever you call end_conversation.',
      parameters: {
        type: 'object',
        properties: {
          choices: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                theme: {
                  type: 'string',
                  enum: ['brave', 'kind', 'calm', 'confident', 'creative', 'social', 'curious'],
                },
                difficulty: { type: 'string', enum: ['easy', 'medium', 'stretch'] },
              },
              required: ['title', 'description', 'theme', 'difficulty'],
            },
            minItems: 3,
            maxItems: 3,
          },
        },
        required: ['choices'],
      },
    },
    {
      type: 'function',
      name: 'end_conversation',
      description:
        'Signal the conversation has reached a natural, warm close. ' +
        'ALWAYS call propose_missions in the same response when you use this tool.',
      parameters: { type: 'object', properties: {} },
    },
    {
      type: 'function',
      name: 'acknowledge_mission_progress',
      description:
        'Call when the child mentions working on or completing their active challenge. ' +
        'Celebrate their effort warmly.',
      parameters: {
        type: 'object',
        properties: {
          note: {
            type: 'string',
            description: 'Brief note on what the child shared about their progress',
          },
        },
        required: ['note'],
      },
    },
    {
      type: 'function',
      name: 'note_child_info',
      description:
        "Record the child's first name if they just mentioned it, and the main topic of this exchange.",
      parameters: {
        type: 'object',
        properties: {
          childName: { type: 'string', description: "Child's name if just introduced" },
          topic: { type: 'string', description: '2-4 word phrase describing the main subject' },
        },
      },
    },
  ];
}

// ---------------------------------------------------------------------------
// System prompt (mirrors BASE_SYSTEM_PROMPT in chat.ts + tool rules)
// ---------------------------------------------------------------------------

const BASE_SYSTEM_PROMPT = `You are Tammy, a friendly sea turtle who chats with children aged 4-10.

CONVERSATION FOCUS — stay on the child:
- Always focus on the child: their feelings, what they did today, and what they are saying right now.
- Prioritise how they feel (happy, sad, excited, worried) and what happened in their day (school, friends, play, family).
- Do not wander off into unrelated topics, long stories, or general knowledge. Keep the conversation about them.
- Listen to what the child actually said and respond to that. If they share one thing, reflect that back and ask one follow-up about it.

SPEAKING RULES — these are the most important:
- Always speak and respond in English only.
- Always reply with at least one short spoken sentence. Never reply with only tool calls or silence.
- Keep every response to 1 sentence + 1 question. No more.
- End EVERY turn with a single simple question that invites the child to speak.
- Never explain or lecture. React briefly, then ask.
- Use tiny words. Short sentences. Lots of warmth.
- Never discuss violence, adult topics, or anything scary.

GOOD example: "Wow, a dog! What's your dog's name?"
BAD example: "That's so wonderful that you have a dog! Dogs are amazing pets and they bring so much joy."

TOOL RULES:
1. Call report_mood every turn.
2. Call note_child_info when you learn the child's name or the turn's topic.
3. Call acknowledge_mission_progress if the child mentions their active challenge.

ENDING RULE — read carefully:
- You MUST NOT call end_conversation or propose_missions until the child has sent at least 4 messages.
- NEVER end on the first, second, or third message. No exceptions.
- After the 4th child message or later, end naturally when the conversation reaches a warm close OR the child says goodbye/bye/see you.
- When ending: say one warm farewell sentence, then call BOTH end_conversation AND propose_missions together.`;

export function buildSystemPrompt(options: VoiceSessionOptions): string {
  let prompt = BASE_SYSTEM_PROMPT;
  if (options.childName) {
    prompt += `\n\nThe child's name is ${options.childName}. Use their name occasionally.`;
  }
  if (options.topics?.length) {
    prompt += `\n\nThis child has enjoyed talking about: ${options.topics.join(', ')}. Reference naturally if relevant.`;
  }
  if (options.activeMission) {
    prompt +=
      `\n\nACTIVE CHALLENGE: "${options.activeMission.title}" — ${options.activeMission.description}. ` +
      `Mention it briefly (e.g. "Have you tried your challenge yet?"). ` +
      `If the child brings it up, call acknowledge_mission_progress.`;
  }
  const difficultyInstruction =
    options.difficultyProfile === 'confident'
      ? '\n\nMISSION DIFFICULTY: This child is experienced — make the stretch challenge the main focus (one medium, two stretch).'
      : options.difficultyProfile === 'intermediate'
      ? '\n\nMISSION DIFFICULTY: Mix it up — one easy, one medium, one stretch.'
      : '\n\nMISSION DIFFICULTY: This child is just starting out — keep it gentle (two easy, one medium).';
  prompt += difficultyInstruction;
  return prompt;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface PendingToolCall {
  call_id: string;
  name: string;
  arguments: string;
}

export class OpenAIRealtimeVoiceProvider extends BaseVoiceProvider {
  readonly name = 'openai-realtime';

  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private audioEl: HTMLAudioElement | null = null;
  private mediaStream: MediaStream | null = null;
  private messages: Message[] = [];
  private _generation = 0;
  private _muted = false;
  private pendingEnd = false;
  private pendingMissions: MissionSuggestion[] | null = null;
  private pendingToolCalls: PendingToolCall[] = [];

  async start(options: VoiceSessionOptions): Promise<void> {
    const gen = ++this._generation;
    this.emit('stateChange', 'listening');
    this.emit('moodChange', 'listening');
    this.messages = options.initialMessages ? [...options.initialMessages] : [];

    const model =
      process.env.NEXT_PUBLIC_OPENAI_REALTIME_MODEL ?? DEFAULT_MODEL;
    const voice =
      process.env.NEXT_PUBLIC_OPENAI_REALTIME_VOICE ?? DEFAULT_VOICE;

    try {
      // 1. Mint ephemeral key server-side
      const tokenRes = await fetch('/api/openai-realtime/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, voice }),
      });
      if (!tokenRes.ok) {
        const err = await tokenRes.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error ?? `Token failed: ${tokenRes.status}`,
        );
      }
      const tokenData = (await tokenRes.json()) as {
        client_secret?: { value?: string };
      };
      const ephemeralKey = tokenData.client_secret?.value;
      if (!ephemeralKey) throw new Error('No ephemeral key in session response');

      if (this._generation !== gen) return;

      // 2. Microphone
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (this._generation !== gen) {
        this.mediaStream.getTracks().forEach((t) => t.stop());
        return;
      }

      // 3. Peer connection
      this.pc = new RTCPeerConnection();

      // 4. Remote audio → <audio> element (WebRTC delivers audio automatically)
      this.audioEl = document.createElement('audio') as HTMLAudioElement;
      this.audioEl.autoplay = true;
      this.pc.ontrack = (e) => {
        if (this.audioEl) this.audioEl.srcObject = e.streams[0];
        if (this._generation === gen) {
          this.emit('stateChange', 'speaking');
          this.emit('moodChange', 'talking');
        }
      };

      // 5. Local mic track
      this.mediaStream
        .getTracks()
        .forEach((track) => this.pc!.addTrack(track, this.mediaStream!));

      // 6. Data channel for signalling events
      this.dc = this.pc.createDataChannel('oai-events');
      this.dc.addEventListener('open', () => {
        if (this._generation !== gen) return;
        this.sendEvent({
          type: 'session.update',
          session: {
            instructions: buildSystemPrompt(options),
            tools: buildTools(),
            tool_choice: 'auto',
            input_audio_transcription: { model: 'whisper-1' },
            voice,
            modalities: ['text', 'audio'],
          },
        });
      });
      this.dc.addEventListener('message', (e: MessageEvent) => {
        try {
          this.handleEvent(
            JSON.parse(e.data as string) as Record<string, unknown>,
            gen,
          );
        } catch {
          // ignore JSON parse errors
        }
      });

      // 7. SDP offer / answer
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      const sdpRes = await fetch(`${SDP_ENDPOINT}?model=${model}`, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          'Content-Type': 'application/sdp',
        },
      });
      if (!sdpRes.ok)
        throw new Error(`SDP negotiation failed: ${sdpRes.status}`);
      if (this._generation !== gen) return;

      const answer: RTCSessionDescriptionInit = {
        type: 'answer',
        sdp: await sdpRes.text(),
      };
      await this.pc.setRemoteDescription(answer);
    } catch (err) {
      if (this._generation !== gen) return;
      console.info('[Tammy] openai-realtime: start error');
      this.emit(
        'error',
        err instanceof Error ? err.message : 'Failed to start OpenAI Realtime',
      );
      this.emit('stateChange', 'idle');
      this.emit('moodChange', 'idle');
    }
  }

  private handleEvent(event: Record<string, unknown>, gen: number): void {
    if (this._generation !== gen) return;

    switch (event.type) {
      case 'input_audio_buffer.speech_started':
        this.emit('stateChange', 'recording');
        this.emit('moodChange', 'listening');
        break;

      case 'input_audio_buffer.speech_stopped':
        this.emit('stateChange', 'processing');
        this.emit('moodChange', 'confused');
        break;

      case 'response.created':
        this.pendingToolCalls = [];
        break;

      case 'conversation.item.input_audio_transcription.completed': {
        const transcript = event.transcript as string;
        if (transcript?.trim()) {
          this.emit('userTranscript', transcript);
          this.messages = [
            ...this.messages,
            { role: 'user', content: transcript },
          ];
          this.emit('messages', this.messages);
        }
        break;
      }

      case 'response.audio_transcript.done': {
        const assistantText = event.transcript as string;
        if (assistantText?.trim()) {
          this.messages = [
            ...this.messages,
            { role: 'assistant', content: assistantText },
          ];
          this.emit('messages', this.messages);
        }
        break;
      }

      case 'response.function_call_arguments.done':
        this.pendingToolCalls.push({
          call_id: event.call_id as string,
          name: event.name as string,
          arguments: event.arguments as string,
        });
        break;

      case 'response.done':
        this.handleResponseDone(gen);
        break;

      case 'error': {
        const errEvent = event as { error?: { message?: string } };
        this.emit('error', errEvent.error?.message ?? 'OpenAI Realtime error');
        break;
      }
    }
  }

  private handleResponseDone(gen: number): void {
    const calls = [...this.pendingToolCalls];
    this.pendingToolCalls = [];

    for (const call of calls) {
      try {
        const args = JSON.parse(call.arguments || '{}') as Record<string, unknown>;
        switch (call.name) {
          case 'report_mood':
            if (args.mood) this.emit('moodChange', args.mood as TurtleMood);
            break;
          case 'propose_missions':
            if (Array.isArray(args.choices))
              this.pendingMissions = args.choices as MissionSuggestion[];
            break;
          case 'end_conversation':
            this.pendingEnd = true;
            break;
          case 'note_child_info':
            if (typeof args.childName === 'string')
              this.emit('childName', args.childName);
            if (typeof args.topic === 'string') this.emit('topic', args.topic);
            break;
          case 'acknowledge_mission_progress':
            // no-op — just an acknowledgement signal
            break;
        }
        // Submit function result so the model can continue
        this.sendEvent({
          type: 'conversation.item.create',
          item: {
            type: 'function_call_output',
            call_id: call.call_id,
            output: 'ok',
          },
        });
      } catch {
        // ignore malformed tool arguments
      }
    }

    if (this._generation !== gen) return;

    if (this.pendingMissions) {
      this.emit('missionChoices', this.pendingMissions);
      this.pendingMissions = null;
    }

    if (this.pendingEnd) {
      this.pendingEnd = false;
      this.stop();
    } else {
      this.emit('stateChange', 'listening');
      this.emit('moodChange', 'listening');
    }
  }

  private sendEvent(event: Record<string, unknown>): void {
    if (this.dc?.readyState === 'open') {
      this.dc.send(JSON.stringify(event));
    }
  }

  stop(): void {
    this._generation++;
    this.dc?.close();
    this.dc = null;
    this.pc?.close();
    this.pc = null;
    this.mediaStream?.getTracks().forEach((t) => t.stop());
    this.mediaStream = null;
    if (this.audioEl) {
      this.audioEl.srcObject = null;
      this.audioEl = null;
    }
    this.pendingToolCalls = [];
    this.pendingEnd = false;
    this.pendingMissions = null;
    this.emit('stateChange', 'ended');
    this.emit('moodChange', 'idle');
    this.emit('end');
  }

  setMuted(muted: boolean): void {
    this._muted = muted;
    this.mediaStream?.getTracks().forEach((t) => {
      t.enabled = !muted;
    });
    if (muted) {
      this.emit('stateChange', 'muted');
      this.emit('moodChange', 'idle');
    } else {
      this.emit('stateChange', 'listening');
      this.emit('moodChange', 'listening');
    }
  }
}
```

**Step 4: Run the test to verify it passes**

```
npx jest __tests__/services/openai-realtime-provider.test.ts --no-coverage
```
Expected: PASS (1 test)

**Step 5: Commit**

```bash
git add lib/speech/voice/openai-realtime.ts __tests__/services/openai-realtime-provider.test.ts
git commit -m "feat: add OpenAIRealtimeVoiceProvider skeleton with tools and system prompt"
```

---

### Task 4: Provider tests — `start()` behavior

**Files:**
- Modify: `__tests__/services/openai-realtime-provider.test.ts`

Add a full mock harness and tests for `start()`. Append to the existing test file:

**Step 1: Write the failing tests**

Replace the full test file with this:

```typescript
// __tests__/services/openai-realtime-provider.test.ts

// ─── Browser API mocks ────────────────────────────────────────────────────
class MockDataChannel extends EventTarget {
  readyState: RTCDataChannelState = 'open';
  send = jest.fn();
  close = jest.fn();
  simulateOpen() { this.dispatchEvent(new Event('open')); }
  simulateMessage(data: unknown) {
    this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(data) }));
  }
}

let mockDc: MockDataChannel;
let mockPc: {
  ontrack: ((e: { streams: MediaStream[] }) => void) | null;
  createDataChannel: jest.Mock;
  addTrack: jest.Mock;
  createOffer: jest.Mock;
  setLocalDescription: jest.Mock;
  setRemoteDescription: jest.Mock;
  close: jest.Mock;
};

beforeEach(() => {
  mockDc = new MockDataChannel();
  mockPc = {
    ontrack: null,
    createDataChannel: jest.fn().mockReturnValue(mockDc),
    addTrack: jest.fn(),
    createOffer: jest.fn().mockResolvedValue({ sdp: 'offer-sdp', type: 'offer' }),
    setLocalDescription: jest.fn().mockResolvedValue(undefined),
    setRemoteDescription: jest.fn().mockResolvedValue(undefined),
    close: jest.fn(),
  };
  global.RTCPeerConnection = jest.fn().mockImplementation(() => mockPc) as unknown as typeof RTCPeerConnection;

  const mockTrack = { stop: jest.fn(), enabled: true };
  const mockStream = { getTracks: jest.fn().mockReturnValue([mockTrack]) };
  Object.defineProperty(global.navigator, 'mediaDevices', {
    value: { getUserMedia: jest.fn().mockResolvedValue(mockStream) },
    writable: true,
    configurable: true,
  });

  const mockAudioEl = { autoplay: false, srcObject: null };
  jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag === 'audio') return mockAudioEl as unknown as HTMLElement;
    return document.createElement.call(document, tag);
  });

  global.fetch = jest.fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ client_secret: { value: 'eph-key-xyz' } }),
    })
    .mockResolvedValueOnce({
      ok: true,
      text: async () => 'answer-sdp',
    });

  process.env.NEXT_PUBLIC_OPENAI_REALTIME_MODEL = 'gpt-realtime-1.5';
  process.env.NEXT_PUBLIC_OPENAI_REALTIME_VOICE = 'sage';
});

afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
  delete process.env.NEXT_PUBLIC_OPENAI_REALTIME_MODEL;
  delete process.env.NEXT_PUBLIC_OPENAI_REALTIME_VOICE;
});

import { OpenAIRealtimeVoiceProvider, buildSystemPrompt } from '@/lib/speech/voice/openai-realtime';

// ─── Provider name ────────────────────────────────────────────────────────
test('provider name is openai-realtime', () => {
  expect(new OpenAIRealtimeVoiceProvider().name).toBe('openai-realtime');
});

// ─── start() — happy path ─────────────────────────────────────────────────
test('start() emits stateChange:listening immediately', async () => {
  const p = new OpenAIRealtimeVoiceProvider();
  const states: string[] = [];
  p.on('stateChange', (s) => states.push(s));
  await p.start({});
  expect(states[0]).toBe('listening');
});

test('start() fetches ephemeral token from /api/openai-realtime/session', async () => {
  const p = new OpenAIRealtimeVoiceProvider();
  await p.start({});
  expect(global.fetch).toHaveBeenNthCalledWith(
    1,
    '/api/openai-realtime/session',
    expect.objectContaining({ method: 'POST' }),
  );
});

test('start() sends SDP offer to OpenAI with ephemeral key', async () => {
  const p = new OpenAIRealtimeVoiceProvider();
  await p.start({});
  expect(global.fetch).toHaveBeenNthCalledWith(
    2,
    expect.stringContaining('api.openai.com/v1/realtime'),
    expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer eph-key-xyz' }),
    }),
  );
});

test('start() creates data channel named oai-events', async () => {
  const p = new OpenAIRealtimeVoiceProvider();
  await p.start({});
  expect(mockPc.createDataChannel).toHaveBeenCalledWith('oai-events');
});

test('start() sends session.update with instructions and tools when dc opens', async () => {
  const p = new OpenAIRealtimeVoiceProvider();
  await p.start({ childName: 'Leo' });
  mockDc.simulateOpen();
  const [sentRaw] = mockDc.send.mock.calls[0];
  const sent = JSON.parse(sentRaw as string) as Record<string, unknown>;
  expect(sent.type).toBe('session.update');
  const session = sent.session as Record<string, unknown>;
  expect(typeof session.instructions).toBe('string');
  expect((session.instructions as string)).toContain('Leo');
  expect(Array.isArray(session.tools)).toBe(true);
  expect((session.tools as unknown[]).length).toBe(5);
});

// ─── start() — error paths ────────────────────────────────────────────────
test('start() emits error when token fetch fails', async () => {
  (global.fetch as jest.Mock).mockReset();
  (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'quota' }), status: 429 });
  const p = new OpenAIRealtimeVoiceProvider();
  const errors: string[] = [];
  p.on('error', (e) => errors.push(e));
  await p.start({});
  expect(errors[0]).toMatch(/quota|Token failed/);
});

test('start() emits error when getUserMedia fails', async () => {
  (global.fetch as jest.Mock).mockReset();
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: async () => ({ client_secret: { value: 'key' } }),
  });
  (navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValueOnce(new Error('Permission denied'));
  const p = new OpenAIRealtimeVoiceProvider();
  const errors: string[] = [];
  p.on('error', (e) => errors.push(e));
  await p.start({});
  expect(errors[0]).toMatch(/Permission denied/);
});

test('start() emits error when SDP negotiation fails', async () => {
  (global.fetch as jest.Mock).mockReset();
  (global.fetch as jest.Mock)
    .mockResolvedValueOnce({ ok: true, json: async () => ({ client_secret: { value: 'key' } }) })
    .mockResolvedValueOnce({ ok: false, status: 500, text: async () => '' });
  const p = new OpenAIRealtimeVoiceProvider();
  const errors: string[] = [];
  p.on('error', (e) => errors.push(e));
  await p.start({});
  expect(errors[0]).toMatch(/SDP/);
});

// ─── stop() ───────────────────────────────────────────────────────────────
test('stop() emits stateChange:ended and end', () => {
  const p = new OpenAIRealtimeVoiceProvider();
  const states: string[] = [];
  let ended = false;
  p.on('stateChange', (s) => states.push(s));
  p.on('end', () => { ended = true; });
  p.stop();
  expect(states).toContain('ended');
  expect(ended).toBe(true);
});

// ─── setMuted() ───────────────────────────────────────────────────────────
test('setMuted(true) emits stateChange:muted', () => {
  const p = new OpenAIRealtimeVoiceProvider();
  const states: string[] = [];
  p.on('stateChange', (s) => states.push(s));
  p.setMuted(true);
  expect(states).toContain('muted');
});

test('setMuted(false) emits stateChange:listening', () => {
  const p = new OpenAIRealtimeVoiceProvider();
  const states: string[] = [];
  p.on('stateChange', (s) => states.push(s));
  p.setMuted(false);
  expect(states).toContain('listening');
});

// ─── Event handling ───────────────────────────────────────────────────────
async function startAndGetDc(options = {}) {
  const p = new OpenAIRealtimeVoiceProvider();
  await p.start(options);
  return { p, dc: mockDc };
}

test('speech_started event → stateChange:recording', async () => {
  const { p, dc } = await startAndGetDc();
  const states: string[] = [];
  p.on('stateChange', (s) => states.push(s));
  dc.simulateMessage({ type: 'input_audio_buffer.speech_started' });
  expect(states).toContain('recording');
});

test('speech_stopped event → stateChange:processing', async () => {
  const { p, dc } = await startAndGetDc();
  const states: string[] = [];
  p.on('stateChange', (s) => states.push(s));
  dc.simulateMessage({ type: 'input_audio_buffer.speech_stopped' });
  expect(states).toContain('processing');
});

test('response.done event → stateChange:listening (no tool calls)', async () => {
  const { p, dc } = await startAndGetDc();
  const states: string[] = [];
  p.on('stateChange', (s) => states.push(s));
  dc.simulateMessage({ type: 'response.done' });
  expect(states).toContain('listening');
});

test('transcription event → emits userTranscript', async () => {
  const { p, dc } = await startAndGetDc();
  const transcripts: string[] = [];
  p.on('userTranscript', (t) => transcripts.push(t));
  dc.simulateMessage({
    type: 'conversation.item.input_audio_transcription.completed',
    transcript: 'Hello Tammy',
  });
  expect(transcripts).toContain('Hello Tammy');
});

test('error event → emits error with message', async () => {
  const { p, dc } = await startAndGetDc();
  const errors: string[] = [];
  p.on('error', (e) => errors.push(e));
  dc.simulateMessage({ type: 'error', error: { message: 'rate limit' } });
  expect(errors).toContain('rate limit');
});

// ─── Tool call handling ───────────────────────────────────────────────────
test('report_mood tool call → emits moodChange', async () => {
  const { p, dc } = await startAndGetDc();
  const moods: string[] = [];
  p.on('moodChange', (m) => moods.push(m));
  dc.simulateMessage({ type: 'response.created' });
  dc.simulateMessage({
    type: 'response.function_call_arguments.done',
    call_id: 'c1',
    name: 'report_mood',
    arguments: JSON.stringify({ mood: 'happy' }),
  });
  dc.simulateMessage({ type: 'response.done' });
  expect(moods).toContain('happy');
});

test('propose_missions + end_conversation → emits missionChoices and calls stop()', async () => {
  const { p, dc } = await startAndGetDc();
  const choices: unknown[] = [];
  let ended = false;
  p.on('missionChoices', (c) => choices.push(...c));
  p.on('end', () => { ended = true; });

  const missions = [
    { title: 'A', description: 'a', theme: 'brave', difficulty: 'easy' },
    { title: 'B', description: 'b', theme: 'kind', difficulty: 'medium' },
    { title: 'C', description: 'c', theme: 'calm', difficulty: 'stretch' },
  ];
  dc.simulateMessage({ type: 'response.created' });
  dc.simulateMessage({
    type: 'response.function_call_arguments.done',
    call_id: 'c2',
    name: 'propose_missions',
    arguments: JSON.stringify({ choices: missions }),
  });
  dc.simulateMessage({
    type: 'response.function_call_arguments.done',
    call_id: 'c3',
    name: 'end_conversation',
    arguments: '{}',
  });
  dc.simulateMessage({ type: 'response.done' });
  expect(choices).toHaveLength(3);
  expect(ended).toBe(true);
});

test('note_child_info → emits childName and topic', async () => {
  const { p, dc } = await startAndGetDc();
  const names: string[] = [];
  const topics: string[] = [];
  p.on('childName', (n) => names.push(n));
  p.on('topic', (t) => topics.push(t));
  dc.simulateMessage({ type: 'response.created' });
  dc.simulateMessage({
    type: 'response.function_call_arguments.done',
    call_id: 'c4',
    name: 'note_child_info',
    arguments: JSON.stringify({ childName: 'Maya', topic: 'sea turtles' }),
  });
  dc.simulateMessage({ type: 'response.done' });
  expect(names).toContain('Maya');
  expect(topics).toContain('sea turtles');
});

test('tool call results are submitted as function_call_output', async () => {
  const { dc } = await startAndGetDc();
  mockDc.send.mockClear();
  dc.simulateMessage({ type: 'response.created' });
  dc.simulateMessage({
    type: 'response.function_call_arguments.done',
    call_id: 'call-99',
    name: 'report_mood',
    arguments: JSON.stringify({ mood: 'happy' }),
  });
  dc.simulateMessage({ type: 'response.done' });
  const sentCalls = mockDc.send.mock.calls.map((c) => JSON.parse(c[0] as string) as Record<string, unknown>);
  const outputEvent = sentCalls.find((e) => e.type === 'conversation.item.create');
  expect(outputEvent).toBeDefined();
  const item = outputEvent!.item as Record<string, unknown>;
  expect(item.type).toBe('function_call_output');
  expect(item.call_id).toBe('call-99');
});

// ─── System prompt building ───────────────────────────────────────────────
test('buildSystemPrompt includes childName', () => {
  const prompt = buildSystemPrompt({ childName: 'Zara' });
  expect(prompt).toContain('Zara');
});

test('buildSystemPrompt includes topics', () => {
  const prompt = buildSystemPrompt({ topics: ['dinosaurs', 'space'] });
  expect(prompt).toContain('dinosaurs');
  expect(prompt).toContain('space');
});

test('buildSystemPrompt includes activeMission title', () => {
  const mission = { id: 'm1', title: 'Read a book', description: 'Read for 10 min', theme: 'curious' as const, difficulty: 'easy' as const, status: 'active' as const, createdAt: '2026-01-01' };
  const prompt = buildSystemPrompt({ activeMission: mission });
  expect(prompt).toContain('Read a book');
});

test('buildSystemPrompt includes difficulty instruction for confident', () => {
  const prompt = buildSystemPrompt({ difficultyProfile: 'confident' });
  expect(prompt).toContain('stretch challenge');
});
```

**Step 2: Run tests to verify some fail**

```
npx jest __tests__/services/openai-realtime-provider.test.ts --no-coverage
```
Expected: Several PASS (name, stop, setMuted), several FAIL (start() tests needing full implementation — Task 3 code already written so all should pass after Task 3's implementation is in place).

**Step 3: Run full test suite to confirm no regressions**

```
npx jest --no-coverage
```
Expected: All previous tests still PASS, new tests PASS.

**Step 4: Commit**

```bash
git add __tests__/services/openai-realtime-provider.test.ts
git commit -m "test: add comprehensive tests for OpenAIRealtimeVoiceProvider"
```

---

### Task 5: Register provider in `index.ts`

**Files:**
- Modify: `lib/speech/voice/index.ts`

**Step 1: Add the provider**

In `lib/speech/voice/index.ts`, add:

```typescript
// Add to exports (after GeminiLiveVoiceProvider line):
export { OpenAIRealtimeVoiceProvider } from './openai-realtime';

// Add to createVoiceProvider() (after the livekit block):
if (provider === 'openai-realtime') {
  const { OpenAIRealtimeVoiceProvider } = require('./openai-realtime') as typeof import('./openai-realtime');
  return new OpenAIRealtimeVoiceProvider();
}
```

**Step 2: Run tests**

```
npx jest --no-coverage
```
Expected: All PASS

**Step 3: Commit**

```bash
git add lib/speech/voice/index.ts
git commit -m "feat: register openai-realtime in createVoiceProvider factory"
```

---

### Task 6: Update MEMORY.md

**Files:**
- Modify: `C:\Users\iankt\.claude\projects\C--Users-iankt-Projects-turtle-talk\memory\MEMORY.md`

Add `openai-realtime` to the Vapi Integration section and voice providers list.

---

## Run Instructions

### Prerequisites

Add to `.env.local`:
```
OPENAI_API_KEY=sk-...          # already present — used server-side only
NEXT_PUBLIC_VOICE_PROVIDER=openai-realtime
NEXT_PUBLIC_OPENAI_REALTIME_MODEL=gpt-realtime-1.5
NEXT_PUBLIC_OPENAI_REALTIME_VOICE=sage
```

### Run tests
```bash
npx jest --no-coverage
# Or just the new tests:
npx jest openai-realtime --no-coverage
```

### Run the app
```bash
npm run dev
# Navigate to http://localhost:3000/talk
```

---

## Final Checklist

- [ ] `app/api/openai-realtime/session/route.ts` created (4 tests pass)
- [ ] `lib/speech/voice/openai-realtime.ts` created (tools, system prompt, provider)
- [ ] `__tests__/services/openai-realtime-provider.test.ts` created (~20 tests)
- [ ] `__tests__/api/openai-realtime-session.test.ts` created (4 tests)
- [ ] `lib/speech/config.ts` updated (`openai-realtime` in type union + config block)
- [ ] `lib/speech/voice/index.ts` updated (export + factory case)
- [ ] `NEXT_PUBLIC_VOICE_PROVIDER=openai-realtime` in `.env.local`
- [ ] `npx jest --no-coverage` → all tests pass
- [ ] App loads at `/talk`, mic permission granted, Tammy connects via WebRTC
- [ ] Speaking triggers `stateChange: recording → processing → speaking → listening`
- [ ] Turtle mood updates correctly via `report_mood` tool
- [ ] Conversation ends with mission card appearing
