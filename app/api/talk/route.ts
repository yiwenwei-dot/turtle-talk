import { NextRequest } from 'next/server';
import { z } from 'zod';

export const maxDuration = 60; // seconds — STT + LLM + TTS can exceed Vercel's 10s default
import { logAgent } from '@/lib/speech/log';
import { startVoiceSessionLogWriter } from '@/lib/speech/log/writer-server';
import { SpeechService } from '@/lib/speech/SpeechService';
import { OpenAISTTProvider, GeminiSTTProvider } from '@/lib/speech/providers/stt';
import { ElevenLabsTTSProvider, GeminiTTSProvider } from '@/lib/speech/providers/tts';
import { createChatProvider } from '@/lib/speech/providers/chat';
import { ChildSafeGuardrail } from '@/lib/speech/guardrails/ChildSafeGuardrail';
import type { ConversationContext } from '@/lib/speech/types';
import { SpeechServiceError, isProviderUnusualActivityError } from '@/lib/speech/errors';
import { speechConfig } from '@/lib/speech/config';
import { getWeatherDescription } from '@/lib/speech/awareness/weather';
import { parseChildSessionCookieValue, getChildSessionCookieName } from '@/lib/child-session';
import { talkLimiter } from '@/lib/ratelimit';

// ---------------------------------------------------------------------------
// Input validation schemas
// ---------------------------------------------------------------------------

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().max(2000),
});

const MissionThemeSchema = z.enum(['brave', 'kind', 'calm', 'confident', 'creative', 'social', 'curious']);

const TalkFormSchema = z.object({
  messages: z.array(MessageSchema).max(20).default([]),
  childName: z.string().max(50).optional(),
  topics: z.array(z.string().max(100)).max(15).default([]),
  difficultyProfile: z.enum(['beginner', 'intermediate', 'confident']).default('beginner'),
  activeMission: z.object({
    id: z.string().max(100),
    title: z.string().max(200),
    description: z.string().max(500),
    theme: MissionThemeSchema,
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
    city: z.string().max(100).optional(),
    region: z.string().max(100).optional(),
    country: z.string().max(100).optional(),
  }).optional(),
});

/** When the LLM returns empty responseText, we send this so the user always gets a spoken reply. */
const FALLBACK_EMPTY_RESPONSE = "Hmm, I didn't quite get that. Can you say it again?";

// Start background log writer (server-only; no-op if ENABLE_SESSION_LOGGING is not set)
startVoiceSessionLogWriter(logAgent);

export async function POST(req: NextRequest) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return Response.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const audioFile = formData.get('audio');
  if (!audioFile || !(audioFile instanceof Blob)) {
    return Response.json({ error: 'Missing audio field' }, { status: 400 });
  }

  // Rate limit: keyed on childId from signed session cookie, fallback to IP
  const cookieHeader = req.headers.get('cookie') ?? '';
  const cookieName = getChildSessionCookieName();
  const cookieMatch = cookieHeader.match(new RegExp(`(?:^|;\\s*)${cookieName}=([^;]+)`));
  const sessionPayload = cookieMatch ? parseChildSessionCookieValue(decodeURIComponent(cookieMatch[1])) : null;
  const rateLimitKey =
    sessionPayload?.childId ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'anonymous';
  const { success: rateLimitOk } = await talkLimiter.limit(rateLimitKey);
  if (!rateLimitOk) {
    return Response.json({ error: 'Too many requests' }, { status: 429 });
  }

  // Parse and validate all text fields with Zod
  const rawFields: Record<string, unknown> = {};
  for (const key of ['messages', 'childName', 'topics', 'difficultyProfile', 'activeMission', 'timezone', 'clientLocalTime', 'location']) {
    const val = formData.get(key);
    if (val === null) continue;
    // JSON fields
    if (['messages', 'topics', 'activeMission', 'location'].includes(key)) {
      if (typeof val === 'string') {
        try { rawFields[key] = JSON.parse(val); } catch { rawFields[key] = undefined; }
      }
    } else {
      rawFields[key] = val;
    }
  }

  const parsed = TalkFormSchema.safeParse(rawFields);
  if (!parsed.success) {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }

  const {
    messages,
    childName,
    topics,
    difficultyProfile,
    activeMission,
    timezone,
    clientLocalTime,
    location,
  } = parsed.data;

  let weatherDescription: string | undefined;
  if (location?.latitude != null && location?.longitude != null) {
    try {
      weatherDescription = await getWeatherDescription(location.latitude, location.longitude);
    } catch {
      // non-fatal; Shelly works without weather
    }
  }

  const context: ConversationContext = {
    messages,
    childName,
    topics,
    difficultyProfile,
    activeMission,
    timezone,
    clientLocalTime,
    location,
    weatherDescription,
  };

  const stt = speechConfig.stt.provider === 'gemini' ? new GeminiSTTProvider() : new OpenAISTTProvider();
  const tts = speechConfig.tts.provider === 'gemini' ? new GeminiTTSProvider() : new ElevenLabsTTSProvider();
  const chat = createChatProvider(speechConfig.chat.provider);
  const guardrail = new ChildSafeGuardrail();
  const service = new SpeechService({ stt, tts, chat, guardrails: [guardrail] });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: Record<string, unknown>) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));

      try {
        console.info('[Shelly] route: stream start');
        logAgent.logEvent('api_talk', 'stream_start', { blobSize: audioFile.size });
        // Phase 0: STT first so we can send user_text immediately (UI shows "You said: ..." while LLM runs)
        let userText: string;
        try {
          userText = await stt.transcribe(audioFile);
        } catch (err) {
          throw new SpeechServiceError('Speech-to-text failed', 'stt', err);
        }
        if (!userText.trim()) {
          logAgent.logEvent('api_talk', 'early_exit_empty_user');
          console.info('[Shelly] route: empty user text, closing');
          return;
        }
        send({ type: 'user_text', userText });
        // Phase 1: guardrails + chat (no STT — we already have userText)
        const textResult = await service.processToText(audioFile, context, { preTranscribedText: userText });
        console.info('[Shelly] route: processToText done');
        logAgent.logEvent('api_talk', 'processToText_done', {
          userTextLen: textResult.userText.length,
          responseLen: textResult.responseText?.length ?? 0,
        });

        // When LLM returns empty, use a fallback phrase so we always send meta + TTS
        if (!textResult.responseText?.trim()) {
          console.info('[Shelly] route: empty response, using fallback phrase');
          textResult.responseText = FALLBACK_EMPTY_RESPONSE;
          textResult.mood = 'confused';
        }

        // Log this turn (user + LLM) for conversation history visibility (console + debug ingest)
        const userSnippet = (textResult.userText || '').slice(0, 100);
        const responseSnippet = (textResult.responseText || '').slice(0, 100);
        console.info('[Shelly] turn — user:', userSnippet, '| response:', responseSnippet);

        // Only include missionProgressNote in meta if it was set
        const metaPayload = textResult.missionProgressNote
          ? textResult
          : { ...textResult, missionProgressNote: undefined };
        send({ type: 'meta', ...metaPayload });
        console.info('[Shelly] route: meta sent');
        logAgent.logEvent('api_talk', 'meta_sent');

        // Phase 2: TTS — only synthesize when there is actual response text
        if (textResult.responseText.trim()) {
          console.info('[Shelly] route: TTS start');
          let audioBuffer: ArrayBuffer;
          try {
            audioBuffer = await tts.synthesize(textResult.responseText);
          } catch (ttsErr) {
            // Provider "unusual activity" (e.g. ElevenLabs 401): prefer Gemini TTS when available (works from server)
            if (isProviderUnusualActivityError(ttsErr) && process.env.GEMINI_API_KEY) {
              console.info('[Shelly] route: TTS fallback to Gemini (provider unusual activity)');
              const fallbackTts = new GeminiTTSProvider();
              audioBuffer = await fallbackTts.synthesize(textResult.responseText);
            } else if (speechConfig.tts.provider === 'elevenlabs' && process.env.GEMINI_API_KEY) {
              console.info('[Shelly] route: TTS fallback to Gemini (ElevenLabs unusual activity)');
              const fallbackTts = new GeminiTTSProvider();
              audioBuffer = await fallbackTts.synthesize(textResult.responseText);
            } else if (speechConfig.tts.provider === 'gemini' && process.env.ELEVENLABS_API_KEY) {
              console.info('[Shelly] route: TTS fallback to ElevenLabs');
              try {
                const fallbackTts = new ElevenLabsTTSProvider();
                audioBuffer = await fallbackTts.synthesize(textResult.responseText);
              } catch (elevenErr) {
                if (isProviderUnusualActivityError(elevenErr) && process.env.GEMINI_API_KEY) {
                  console.info('[Shelly] route: TTS fallback to Gemini (ElevenLabs returned unusual activity)');
                  const geminiTts = new GeminiTTSProvider();
                  audioBuffer = await geminiTts.synthesize(textResult.responseText);
                } else {
                  throw new SpeechServiceError('Text-to-speech failed', 'tts', elevenErr);
                }
              }
            } else {
              throw new SpeechServiceError('Text-to-speech failed', 'tts', ttsErr);
            }
          }
          const base64 = Buffer.from(audioBuffer).toString('base64');
          send({ type: 'audio', base64 });
          console.info('[Shelly] route: audio sent');
          logAgent.logEvent('api_talk', 'audio_sent', { byteLength: audioBuffer.byteLength });
        } else {
          console.info('[Shelly] route: no audio (empty response)');
        }
      } catch (err) {
        logAgent.logEvent(
          'api_talk',
          'error',
          {
            stage: err instanceof SpeechServiceError ? err.stage : 'unexpected',
            message: err instanceof Error ? err.message : String(err),
          },
          'error',
        );
        console.info(
          '[Shelly] route: error',
          err instanceof SpeechServiceError ? err.stage : 'unexpected',
        );
        const stageModels: Record<string, string> = {
          stt: `${speechConfig.stt.provider}/${speechConfig.stt.provider === 'gemini' ? speechConfig.stt.geminiModel : speechConfig.stt.model}`,
          chat: `${speechConfig.chat.provider}/${speechConfig.chat.provider === 'gemini' ? speechConfig.chat.geminiModel : speechConfig.chat.provider === 'openai' ? speechConfig.chat.openaiModel : speechConfig.chat.anthropicModel}`,
          tts: `${speechConfig.tts.provider}/${speechConfig.tts.provider === 'gemini' ? speechConfig.tts.geminiModel : speechConfig.tts.model}`,
        };

        let error = 'Something went wrong.';
        if (err instanceof SpeechServiceError) {
          const model = stageModels[err.stage] ?? err.stage;
          const causeMsg = err.cause instanceof Error ? err.cause.message : String(err.cause ?? '');
          console.error(`[talk/route] SpeechServiceError stage="${err.stage}" model="${model}":`, causeMsg);
          error = `[${model}] ${causeMsg || err.message}`;
        } else {
          console.error('[talk/route] Unexpected error:', err);
          if (err instanceof Error) error = err.message;
        }
        send({ type: 'error', error });
        console.info('[Shelly] route: error sent to client');
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson' },
  });
}
