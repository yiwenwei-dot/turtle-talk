import { createLazySingleton, pickProvider } from '@/lib/utils/singleton';
export type { VoiceConversationProvider, VoiceSessionState, VoiceSessionOptions, VoiceEventMap } from './types';
export { BaseVoiceProvider } from './base';
export { NativeVoiceProvider } from './native';
export { VapiVoiceProvider } from './vapi';
export { GeminiLiveVoiceProvider } from './gemini-live';
export { LiveKitVoiceProvider } from './livekit';
export { OpenAIRealtimeVoiceProvider } from './openai-realtime';

const VOICE_PROVIDERS = ['native', 'vapi', 'gemini-live', 'livekit', 'openai-realtime'] as const;
type VoiceProvider = (typeof VOICE_PROVIDERS)[number];

function buildVoiceProvider(name: VoiceProvider): import('./types').VoiceConversationProvider {
  if (name === 'vapi') {
    const { VapiVoiceProvider } = require('./vapi') as typeof import('./vapi');
    return new VapiVoiceProvider();
  }
  if (name === 'gemini-live') {
    const { GeminiLiveVoiceProvider } = require('./gemini-live') as typeof import('./gemini-live');
    return new GeminiLiveVoiceProvider();
  }
  if (name === 'livekit') {
    const { LiveKitVoiceProvider } = require('./livekit') as typeof import('./livekit');
    return new LiveKitVoiceProvider();
  }
  if (name === 'openai-realtime') {
    const { OpenAIRealtimeVoiceProvider } = require('./openai-realtime') as typeof import('./openai-realtime');
    return new OpenAIRealtimeVoiceProvider();
  }
  const { NativeVoiceProvider } = require('./native') as typeof import('./native');
  return new NativeVoiceProvider();
}

const _getDefaultVoiceProvider = createLazySingleton((): import('./types').VoiceConversationProvider => {
  const name = pickProvider<VoiceProvider>(
    'NEXT_PUBLIC_VOICE_PROVIDER',
    process.env.NEXT_PUBLIC_VOICE_PROVIDER,
    VOICE_PROVIDERS,
    'livekit',
  );
  return buildVoiceProvider(name);
});

/**
 * Returns the voice provider instance determined by NEXT_PUBLIC_VOICE_PROVIDER.
 * Passing an explicit `name` bypasses the singleton (for tests only).
 * Call this inside a useEffect or 'use client' context — providers use browser APIs.
 */
export function createVoiceProvider(name?: string): import('./types').VoiceConversationProvider {
  if (name) {
    const validated = pickProvider<VoiceProvider>(
      'NEXT_PUBLIC_VOICE_PROVIDER',
      name,
      VOICE_PROVIDERS,
      'livekit',
    );
    return buildVoiceProvider(validated);
  }
  return _getDefaultVoiceProvider();
}

/**
 * Always creates a fresh (non-singleton) provider instance using the
 * configured NEXT_PUBLIC_VOICE_PROVIDER. Use this when you need to
 * discard internal state from a previous session (e.g. "Start over").
 */
export function createFreshVoiceProvider(): import('./types').VoiceConversationProvider {
  const name = pickProvider<VoiceProvider>(
    'NEXT_PUBLIC_VOICE_PROVIDER',
    process.env.NEXT_PUBLIC_VOICE_PROVIDER,
    VOICE_PROVIDERS,
    'livekit',
  );
  return buildVoiceProvider(name);
}
