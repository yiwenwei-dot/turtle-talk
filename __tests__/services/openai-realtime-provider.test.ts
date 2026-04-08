// __tests__/services/openai-realtime-provider.test.ts

// ─── Browser API mocks (must be before imports) ───────────────────────────
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
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: false,
    json: async () => ({ error: 'quota' }),
    status: 429,
  });
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
  (navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValueOnce(
    new Error('Permission denied'),
  );
  const p = new OpenAIRealtimeVoiceProvider();
  const errors: string[] = [];
  p.on('error', (e) => errors.push(e));
  await p.start({});
  expect(errors[0]).toMatch(/Permission denied/);
});

test('start() emits error when SDP negotiation fails', async () => {
  (global.fetch as jest.Mock).mockReset();
  (global.fetch as jest.Mock)
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ client_secret: { value: 'key' } }),
    })
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
  const moods: string[] = [];
  let ended = false;
  p.on('stateChange', (s) => states.push(s));
  p.on('moodChange', (m) => moods.push(m));
  p.on('end', () => { ended = true; });
  p.stop();
  expect(states).toContain('ended');
  expect(moods).toContain('idle');
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
async function startAndGetDc(options: Parameters<OpenAIRealtimeVoiceProvider['start']>[0] = {}) {
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
    transcript: 'Hello Shelly',
  });
  expect(transcripts).toContain('Hello Shelly');
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
  jest.useFakeTimers();
  const { p, dc } = await startAndGetDc();
  const choices: unknown[] = [];
  let ended = false;
  p.on('missionChoices', (c) => { choices.push(...c); });
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
  expect(ended).toBe(false); // graceful delay: stop() not yet called
  jest.advanceTimersByTime(2000);
  expect(ended).toBe(true);
  jest.useRealTimers();
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
  const sentCalls = mockDc.send.mock.calls.map(
    (c) => JSON.parse(c[0] as string) as Record<string, unknown>,
  );
  const outputEvent = sentCalls.find((e) => e.type === 'conversation.item.create');
  expect(outputEvent).toBeDefined();
  const item = outputEvent!.item as Record<string, unknown>;
  expect(item.type).toBe('function_call_output');
  expect(item.call_id).toBe('call-99');
});

test('response.audio_transcript.done → appends assistant message and emits messages', async () => {
  const { p, dc } = await startAndGetDc();
  const allMessages: unknown[] = [];
  p.on('messages', (m) => { allMessages.push(...m); });
  dc.simulateMessage({
    type: 'response.audio_transcript.done',
    transcript: 'Hello there, what did you do today?',
  });
  expect(allMessages.some((m) => {
    const msg = m as { role: string; content: string };
    return msg.role === 'assistant' && msg.content === 'Hello there, what did you do today?';
  })).toBe(true);
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
  const mission = {
    id: 'm1',
    title: 'Read a book',
    description: 'Read for 10 min',
    theme: 'curious' as const,
    difficulty: 'easy' as const,
    status: 'active' as const,
    createdAt: '2026-01-01',
  };
  const prompt = buildSystemPrompt({ activeMission: mission });
  expect(prompt).toContain('Read a book');
});

test('buildSystemPrompt includes difficulty instruction for confident', () => {
  const prompt = buildSystemPrompt({ difficultyProfile: 'confident' });
  expect(prompt).toContain('stretch challenge');
});

test('buildSystemPrompt includes time awareness when clientLocalTime provided', () => {
  const prompt = buildSystemPrompt({
    clientLocalTime: '2026-03-14T15:30:00.000Z',
  });
  expect(prompt).toContain('AWARENESS');
  expect(prompt).toContain('Current date and time');
});

test('buildSystemPrompt includes location when provided', () => {
  const prompt = buildSystemPrompt({
    location: { city: 'San Francisco', region: 'California', country: 'US' },
  });
  expect(prompt).toContain('San Francisco');
  expect(prompt).toContain('California');
  expect(prompt).toContain('US');
});

test('buildSystemPrompt includes weather when weatherDescription provided', () => {
  const prompt = buildSystemPrompt({
    weatherDescription: 'sunny, 72°F',
  });
  expect(prompt).toContain('sunny, 72°F');
});
