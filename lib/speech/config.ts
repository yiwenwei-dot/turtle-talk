/**
 * Central config for all speech service models and settings.
 * Every value can be overridden with an environment variable — see .env.local.
 *
 * Voice provider selection:
 *   NEXT_PUBLIC_VOICE_PROVIDER=native      (default) — VAD + MediaRecorder + /api/talk
 *   NEXT_PUBLIC_VOICE_PROVIDER=vapi        — Vapi WebRTC + /api/vapi/llm
 *   NEXT_PUBLIC_VOICE_PROVIDER=gemini-live — Gemini Live API (real-time bidirectional)
 *   NEXT_PUBLIC_VOICE_PROVIDER=livekit     — LiveKit room + agent (Chirp STT, Gemini LLM/TTS)
 *   NEXT_PUBLIC_VOICE_PROVIDER=openai-realtime — OpenAI WebRTC Realtime API (gpt-realtime-1.5)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * STT PROVIDER  (SPEECH_STT_PROVIDER)
 * ─────────────────────────────────────────────────────────────────────────────
 *   openai   (default) — OpenAI transcription API
 *   gemini   — Gemini multimodal audio input
 *
 *   OpenAI STT models  (SPEECH_STT_MODEL):
 *     gpt-4o-mini-transcribe  ← default | fast, 89% fewer hallucinations than whisper-1
 *     gpt-4o-transcribe                  | highest accuracy, higher latency
 *     whisper-1                          | legacy, still functional
 *
 *   Gemini STT models  (SPEECH_GEMINI_STT_MODEL):
 *     gemini-2.5-flash-lite  ← default | GA; upgrade path from 2.0-flash-lite
 *     gemini-2.5-flash                  | higher quality audio understanding
 *     gemini-2.0-flash-lite             | ⚠ retiring June 1 2026
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TTS PROVIDER  (SPEECH_TTS_PROVIDER)
 * ─────────────────────────────────────────────────────────────────────────────
 *   elevenlabs  (default) — ElevenLabs REST API
 *   openai      — OpenAI TTS API
 *   gemini      — Gemini TTS (Flash)
 *
 *   ElevenLabs models  (ELEVENLABS_MODEL):
 *     eleven_turbo_v2_5   ← default | ~300 ms TTFB, 32 languages
 *     eleven_flash_v2_5              | ~75 ms TTFB — lowest latency option
 *     eleven_v3                      | most expressive; emotion audio tags; Feb 2026
 *     eleven_multilingual_v2         | best quality, higher latency
 *
 *   OpenAI TTS models  (SPEECH_OPENAI_TTS_MODEL):
 *     gpt-4o-mini-tts   ← default | natural-language style control; best quality
 *     tts-1                        | fast, lower quality
 *     tts-1-hd                     | higher quality, moderate latency
 *   OpenAI TTS voices  (SPEECH_OPENAI_TTS_VOICE):
 *     nova (warm/friendly) | coral | alloy | echo | fable | onyx | shimmer | ash | sage
 *
 *   Gemini TTS models  (SPEECH_GEMINI_TTS_MODEL):
 *     gemini-2.5-flash-preview-tts      ← default | style/tone control; low latency
 *     gemini-2.5-flash-lite-preview-tts            | ultra-low latency variant
 *     gemini-2.5-pro-tts                           | highest quality
 *   Gemini TTS voices  (SPEECH_GEMINI_TTS_VOICE):
 *     Aoede (default) | Charon | Fenrir | Kore | Puck | Schedar | Umbriel
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CHAT / LLM PROVIDER  (SPEECH_CHAT_PROVIDER)
 * ─────────────────────────────────────────────────────────────────────────────
 *   anthropic  (default) — Claude via LangChain; returns text + tool_calls (recommended for voice)
 *   openai     — OpenAI GPT via LangChain; returns text + tool_calls
 *   gemini     — Gemini; with tool use often returns empty content (Shelly may use fallback phrases)
 *
 *   Anthropic models  (SPEECH_ANTHROPIC_MODEL):
 *     claude-haiku-4-5-20251001  ← default | fastest Claude; best price/speed for voice
 *     claude-haiku-4-5                      | alias — same model
 *     claude-sonnet-4-6                     | smarter, 5× cost, moderate latency
 *     claude-opus-4-6                       | most capable, highest latency/cost
 *
 *   OpenAI models  (SPEECH_OPENAI_MODEL):
 *     gpt-4.1-nano  ← default | fastest GPT-4.1 family; lowest cost
 *     gpt-4.1-mini              | better quality, still fast
 *     gpt-4.1                   | full model; 1M context
 *     gpt-4o-mini               | superseded by gpt-4.1-nano; still works
 *
 *   Gemini models  (SPEECH_GEMINI_CHAT_MODEL):
 *     gemini-2.5-flash  ← default | best price/performance in 2.5 family
 *     gemini-2.5-flash-lite      | fastest/cheapest option; GA Feb 2026
 *     gemini-2.5-pro             | highest reasoning quality; high latency
 *     gemini-2.0-flash           | ⚠ retiring June 1 2026
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * FUTURE PROVIDERS (not yet implemented)
 * ─────────────────────────────────────────────────────────────────────────────
 *   MiniMax  — LLM (MiniMax-Text-01) via @langchain/community ChatMinimax
 *              TTS (Speech-02) ~100ms TTFB, 300+ voices, emotion control
 *              Needs: MINIMAX_API_KEY, MINIMAX_GROUP_ID
 *   Deepgram — STT (nova-3 / flux) — extremely low latency for real-time streaming
 *              Already used via Vapi transcriber in vapi.ts
 */
export const speechConfig = {
  /** Which voice conversation provider to use. */
  voiceProvider: (process.env.NEXT_PUBLIC_VOICE_PROVIDER ?? 'native') as 'native' | 'vapi' | 'gemini-live' | 'livekit' | 'openai-realtime',

  stt: {
    provider: (process.env.SPEECH_STT_PROVIDER ?? 'openai') as 'openai' | 'gemini',
    // OpenAI STT model — gpt-4o-mini-transcribe recommended (89% fewer hallucinations than whisper-1)
    model: process.env.SPEECH_STT_MODEL ?? 'gpt-4o-mini-transcribe',
    // Gemini STT model — 2.5-flash-lite is GA and the upgrade path from 2.0-flash-lite (retiring June 2026)
    geminiModel: process.env.SPEECH_GEMINI_STT_MODEL ?? 'gemini-2.5-flash-lite',
  },

  tts: {
    provider: (process.env.SPEECH_TTS_PROVIDER ?? 'elevenlabs') as 'elevenlabs' | 'openai' | 'gemini',
    // ElevenLabs settings
    voiceId: process.env.ELEVENLABS_VOICE_ID ?? 'EXAVITQu4vr4xnSDxMaL', // Sarah — warm storyteller
    model: process.env.ELEVENLABS_MODEL ?? 'eleven_turbo_v2_5',
    outputFormat: 'mp3_44100_128' as const,
    languageCode: 'en',
    voiceSettings: {
      stability: 0.75,       // high = consistent, predictable voice across turns
      similarityBoost: 0.75, // adhere closely to Sarah's reference voice
      style: 0,              // no style exaggeration — keeps tone steady
      speed: 0.9,            // slightly slower for kids aged 5-13
    },
    // OpenAI TTS settings
    openaiTtsModel: process.env.SPEECH_OPENAI_TTS_MODEL ?? 'gpt-4o-mini-tts',
    openaiTtsVoice: (process.env.SPEECH_OPENAI_TTS_VOICE ?? 'nova') as
      'nova' | 'coral' | 'alloy' | 'echo' | 'fable' | 'onyx' | 'shimmer' | 'ash' | 'sage',
    // Gemini TTS settings
    geminiModel: process.env.SPEECH_GEMINI_TTS_MODEL ?? 'gemini-2.5-flash-preview-tts',
    geminiVoice: process.env.SPEECH_GEMINI_TTS_VOICE ?? 'Aoede',
  },

  chat: {
    provider: (process.env.SPEECH_CHAT_PROVIDER ?? 'anthropic') as 'anthropic' | 'openai' | 'gemini',
    anthropicModel: process.env.SPEECH_ANTHROPIC_MODEL ?? 'claude-haiku-4-5-20251001',
    openaiModel: process.env.SPEECH_OPENAI_MODEL ?? 'gpt-4.1-nano',
    geminiModel: process.env.SPEECH_GEMINI_CHAT_MODEL ?? 'gemini-2.5-flash',
    maxTokens: parseInt(process.env.SPEECH_CHAT_MAX_TOKENS ?? '512', 10),
  },

  openaiRealtime: {
    // Default to GA realtime model; override with NEXT_PUBLIC_OPENAI_REALTIME_MODEL
    model: process.env.NEXT_PUBLIC_OPENAI_REALTIME_MODEL ?? 'gpt-realtime-1.5',
    voice: (process.env.NEXT_PUBLIC_OPENAI_REALTIME_VOICE ?? 'sage') as
      'alloy' | 'ash' | 'ballad' | 'coral' | 'echo' | 'sage' | 'shimmer' | 'verse' | 'marin' | 'cedar',
  },
} as const;
