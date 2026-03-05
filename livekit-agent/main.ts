/**
 * Turtle Talk LiveKit voice agent.
 * Uses OpenAI Realtime API for speech-in and speech-out.
 * Run: pnpm dev (connects to LiveKit Cloud), or deploy with lk agent create.
 */
import { type JobContext, ServerOptions, cli, defineAgent, voice } from '@livekit/agents';
import * as openai from '@livekit/agents-plugin-openai';
import { BackgroundVoiceCancellation } from '@livekit/noise-cancellation-node';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { ShellyAgent } from './agent.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env.local') });
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const DEBUG_LOG_URL = 'http://127.0.0.1:7379/ingest/c4e58649-e133-4b9b-91a5-50c962a7060e';
function sendTranscript(room: { localParticipant?: { publishData(data: Uint8Array, opts: { reliable?: boolean }): Promise<void> } }, role: 'user' | 'assistant', text: string): void {
  const payload = new TextEncoder().encode(JSON.stringify({ type: 'transcript', role, text }));
  // #region agent log
  fetch(DEBUG_LOG_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'c0ac4b' }, body: JSON.stringify({ sessionId: 'c0ac4b', location: 'livekit-agent/main.ts:sendTranscript', message: 'agent sendTranscript', data: { role, textLen: text.length, hasLocalParticipant: !!room.localParticipant }, timestamp: Date.now(), hypothesisId: 'H4' }) }).catch(() => {});
  // #endregion
  room.localParticipant?.publishData(payload, { reliable: true }).catch((err) => {
    fetch(DEBUG_LOG_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'c0ac4b' }, body: JSON.stringify({ sessionId: 'c0ac4b', location: 'livekit-agent:publishData error', message: 'publishData failed', data: { err: String(err) }, timestamp: Date.now(), hypothesisId: 'H4' }) }).catch(() => {});
  });
}

/** Parse dispatch metadata from the job (childName, topics). Works on LiveKit Cloud; may be empty on self-hosted. */
function parseDispatchMetadata(ctx: JobContext): { childName?: string; topics?: string[] } {
  const raw = (ctx.job as { metadata?: string })?.metadata;
  if (!raw || typeof raw !== 'string' || !raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as { childName?: string | null; topics?: string[] };
    const childName =
      typeof parsed.childName === 'string' && parsed.childName.trim()
        ? parsed.childName.trim()
        : undefined;
    const topics = Array.isArray(parsed.topics)
      ? (parsed.topics as string[]).filter((t): t is string => typeof t === 'string')
      : undefined;
    return { childName, topics };
  } catch {
    return {};
  }
}

export default defineAgent({
  entry: async (ctx: JobContext) => {
    const { childName, topics } = parseDispatchMetadata(ctx);

    const session = new voice.AgentSession({
      llm: new openai.realtime.RealtimeModel({
        voice: 'coral',
      }),
    });

    await session.start({
      agent: new ShellyAgent({ childName, topics }),
      room: ctx.room,
      inputOptions: {
        noiseCancellation: BackgroundVoiceCancellation(),
      },
    });

    await ctx.connect();

    const room = ctx.room;
    session.on(voice.AgentSessionEventTypes.UserInputTranscribed, (ev) => {
      if (ev.isFinal && ev.transcript.trim()) {
        sendTranscript(room, 'user', ev.transcript);
      }
    });
    session.on(voice.AgentSessionEventTypes.ConversationItemAdded, (ev) => {
      if (ev.item.role === 'assistant') {
        const text = (ev.item as { textContent?: string }).textContent;
        if (text?.trim()) {
          sendTranscript(room, 'assistant', text);
        }
      }
    });

    const firstMessageInstruction = childName
      ? `Greet ${childName} warmly and ask how they are or what they did today. One sentence and one question.`
      : 'Greet the child warmly and ask how they are or what they did today. One sentence and one question.';
    const handle = session.generateReply({
      instructions: firstMessageInstruction,
    });
    await handle?.waitForPlayout?.();
  },
});

cli.runApp(
  new ServerOptions({
    agent: fileURLToPath(import.meta.url),
    agentName: 'shelly',
    // Give the job process more time to start (default 10s can be too short on Windows / cold start for 2nd+ jobs)
    initializeProcessTimeout: 60 * 1000,
  })
);
