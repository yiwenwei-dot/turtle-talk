/**
 * Tests that VapiVoiceProvider.start() calls vapi.start() with
 * the positional API: vapi.start(assistantId, overrides)
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

test('start() calls vapi.start with assistantId as first argument', async () => {
  const provider = new VapiVoiceProvider();
  await provider.start({ childName: 'Leo', topics: ['space'], difficultyProfile: 'beginner', activeMission: null });

  expect(mockStart).toHaveBeenCalledTimes(1);
  const [assistantId] = mockStart.mock.calls[0];
  expect(assistantId).toBe(ASSISTANT_ID);
});

test('start() passes model override with custom-llm URL as second argument', async () => {
  const provider = new VapiVoiceProvider();
  await provider.start({ childName: 'Leo', topics: [], difficultyProfile: 'beginner', activeMission: null });

  const [, overrides] = mockStart.mock.calls[0];
  expect(overrides.model.provider).toBe('custom-llm');
  expect(overrides.model.url).toBe('https://test.ngrok.io/api/vapi/llm');
});

test('start() uses CUSTOM_LLM_URL when set; without it uses window.location.origin (requires HTTPS)', async () => {
  delete process.env.NEXT_PUBLIC_CUSTOM_LLM_URL;
  // In jsdom window.location.origin is http://localhost, so provider emits error (requires HTTPS) and does not call vapi.start()
  const provider = new VapiVoiceProvider();
  const errors: string[] = [];
  provider.on('error', (msg: string) => errors.push(msg));
  await provider.start({ childName: 'Leo', topics: [], difficultyProfile: 'beginner', activeMission: null });

  expect(mockStart).not.toHaveBeenCalled();
  expect(errors.some((e) => e.includes('HTTPS') || e.includes('NEXT_PUBLIC_CUSTOM_LLM_URL'))).toBe(true);
});

test('start() passes childName in variableValues', async () => {
  const provider = new VapiVoiceProvider();
  await provider.start({ childName: 'Mia', topics: [], difficultyProfile: 'beginner', activeMission: null });

  const [, overrides] = mockStart.mock.calls[0];
  expect(overrides.variableValues.childName).toBe('Mia');
});

test('start() passes context as system message in model.messages', async () => {
  const provider = new VapiVoiceProvider();
  await provider.start({ childName: 'Mia', topics: ['animals'], difficultyProfile: 'intermediate', activeMission: null });

  const [, overrides] = mockStart.mock.calls[0];
  const systemMsg = overrides.model.messages?.[0];
  expect(systemMsg?.role).toBe('system');
  const ctx = JSON.parse(systemMsg?.content ?? '{}');
  expect(ctx.childName).toBe('Mia');
  expect(ctx.topics).toEqual(['animals']);
  expect(ctx.difficultyProfile).toBe('intermediate');
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

test('start() emits error when vapi.start() rejects', async () => {
  mockStart.mockRejectedValueOnce(new Error('Vapi connection refused'));
  const provider = new VapiVoiceProvider();
  const errors: string[] = [];
  provider.on('error', (msg: string) => errors.push(msg));
  await provider.start({ childName: 'Leo', topics: [], difficultyProfile: 'beginner', activeMission: null });
  expect(errors).toHaveLength(1);
  expect(errors[0]).toMatch(/Vapi connection refused/);
});

test('start() passes activeMission in system message context', async () => {
  const mission = { id: 'm1', title: 'Read a book', description: 'Read for 10 minutes', theme: 'curious' as const, difficulty: 'easy' as const, status: 'active' as const, createdAt: '2026-01-01' };
  const provider = new VapiVoiceProvider();
  await provider.start({ childName: 'Leo', topics: [], difficultyProfile: 'beginner', activeMission: mission });
  const [, overrides] = mockStart.mock.calls[0];
  const ctx = JSON.parse(overrides.model.messages?.[0]?.content ?? '{}');
  expect(ctx.activeMission).toEqual(mission);
});

test('start() uses "friend" as fallback childName in variableValues', async () => {
  const provider = new VapiVoiceProvider();
  await provider.start({});
  const [, overrides] = mockStart.mock.calls[0];
  expect(overrides.variableValues.childName).toBe('friend');
});

test('start() passes ElevenLabs voice override in overrides', async () => {
  process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID = 'test-voice-id';
  const provider = new VapiVoiceProvider();
  await provider.start({ childName: 'Leo', topics: [], difficultyProfile: 'beginner', activeMission: null });
  const [, overrides] = mockStart.mock.calls[0];
  expect(overrides.voice.provider).toBe('11labs');
  expect(overrides.voice.voiceId).toBe('test-voice-id');
  delete process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID;
});

test('start() uses default ElevenLabs voice ID when env var is unset', async () => {
  const provider = new VapiVoiceProvider();
  await provider.start({});
  const [, overrides] = mockStart.mock.calls[0];
  expect(overrides.voice.voiceId).toBe('EXAVITQu4vr4xnSDxMaL');
});
