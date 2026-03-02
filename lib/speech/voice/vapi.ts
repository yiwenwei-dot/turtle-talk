'use client';

import type { Message, TurtleMood } from '../types';
import type { VoiceSessionOptions } from './types';
import { BaseVoiceProvider } from './base';

/**
 * VapiVoiceProvider
 *
 * Uses Vapi's WebRTC infrastructure for ultra-low-latency voice.
 * Vapi handles: microphone, VAD, STT (Deepgram), and TTS (ElevenLabs).
 * Our server handles: guardrails + LLM (Claude) via /api/vapi/llm.
 * Mood and mission choices flow back as Vapi function-call events.
 *
 * Required env vars: NEXT_PUBLIC_VAPI_PUBLIC_KEY, NEXT_PUBLIC_VAPI_ASSISTANT_ID
 * Optional env var:  NEXT_PUBLIC_CUSTOM_LLM_URL (set to ngrok URL for local dev)
 */
export class VapiVoiceProvider extends BaseVoiceProvider {
  readonly name = 'vapi';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private vapi: any = null;
  private messages: Message[] = [];
  // Generation counter: incremented on every start/stop so stale call-end events
  // from old Vapi SDK instances (e.g. React Strict Mode double-invoke) are ignored.
  private _generation = 0;

  async start(options: VoiceSessionOptions): Promise<void> {
    console.info('[Shelly] vapi start');
    const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
    const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;
    if (!publicKey) {
      console.info('[Shelly] vapi: missing env (key)');
      this.emit('error', 'NEXT_PUBLIC_VAPI_PUBLIC_KEY is not set');
      return;
    }

    if (!assistantId) {
      console.info('[Shelly] vapi: missing env (assistant)');
      this.emit('error', 'NEXT_PUBLIC_VAPI_ASSISTANT_ID is not set');
      return;
    }

    if (options.initialMessages?.length) {
      this.messages = [...options.initialMessages];
    }

    // Dynamic import keeps @vapi-ai/web out of the server bundle
    const gen = ++this._generation;
    // Show listening immediately so we don't stay stuck on "Getting ready..." while connecting
    this.emit('stateChange', 'listening');
    this.emit('moodChange', 'listening');

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const vapiModule = await import('@vapi-ai/web') as any;
      // If stop() was called while we were waiting for the import (React Strict Mode
      // double-invoke, fast unmount, etc.), bail out — don't create a second SDK instance.
      if (this._generation !== gen) return;
      // Handle both real ESM (vapiModule.default = Vapi) and CJS interop in Jest tests
      // (vapiModule.default.default = Vapi when mock lacks __esModule: true).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Vapi: new (key: string) => any = vapiModule.default?.default ?? vapiModule.default;
      this.vapi = new Vapi(publicKey);
      this.bindVapiEvents(gen);

      const llmBase =
        process.env.NEXT_PUBLIC_CUSTOM_LLM_URL ||
        (typeof window !== 'undefined' ? window.location.origin : '');
      const llmUrl = `${llmBase}/api/vapi/llm`;

      if (!llmUrl.startsWith('https://')) {
        this.emit('error', 'Vapi requires an HTTPS URL for the assistant. Set NEXT_PUBLIC_CUSTOM_LLM_URL to your HTTPS tunnel URL (e.g. Cloudflare Tunnel) or test on your live site (e.g. turtletalk.io).');
        this.emit('stateChange', 'idle');
        this.emit('moodChange', 'idle');
        return;
      }

      await this.vapi.start(assistantId, {
        model: {
          provider: 'custom-llm',
          model: 'shelly',
          url: llmUrl,
          metadataSendMode: 'off',
          // Inject per-call context as a system message so /api/vapi/llm can read it
          messages: [{
            role: 'system',
            content: JSON.stringify({
              childName: options.childName ?? null,
              topics: options.topics ?? [],
              difficultyProfile: options.difficultyProfile ?? 'beginner',
              activeMission: options.activeMission ?? null,
            }),
          }],
        },
        voice: {
          provider: '11labs',
          voiceId: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID ?? 'EXAVITQu4vr4xnSDxMaL',
          model: 'eleven_turbo_v2_5',
          stability: 0.75,
          similarityBoost: 0.75,
          speed: 0.9,
        },
        variableValues: {
          childName: options.childName ?? 'friend',
        },
      });
      console.info('[Shelly] vapi: call started');
    } catch (err) {
      const errObj = err as Error & { response?: { status?: number; data?: unknown }; body?: unknown };
      console.warn('[Shelly] vapi: start error', err, errObj?.response ?? errObj?.body ?? '');
      const msg =
        (errObj?.response as { message?: string })?.message
        ?? errObj?.message
        ?? (typeof errObj?.body === 'object' ? JSON.stringify(errObj.body) : errObj?.body)
        ?? 'Failed to start Vapi';
      this.emit('error', String(msg));
      this.emit('stateChange', 'idle');
      this.emit('moodChange', 'idle');
    }
  }

  stop(): void {
    console.info('[Shelly] vapi stop');
    this._generation++; // invalidate all handlers from the current session
    this.vapi?.stop();
    this.vapi = null;
    // Emit ended state immediately so UI updates even if Vapi never sends call-end (e.g. SDK hanging)
    this.emit('stateChange', 'ended');
    this.emit('moodChange', 'idle');
    this.emit('end');
  }

  setMuted(muted: boolean): void {
    if (!this.vapi) return;
    this.vapi.setMuted(muted);
    if (muted) {
      this.emit('stateChange', 'muted');
      this.emit('moodChange', 'idle');
    } else {
      this.emit('stateChange', 'listening');
      this.emit('moodChange', 'listening');
    }
  }

  // ---------------------------------------------------------------------------
  // Vapi event wiring
  // ---------------------------------------------------------------------------

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private bindVapiEvents(gen: number): void {
    const v = this.vapi;
    // Guard: if _generation has advanced past this session's gen, the event is stale
    const alive = () => this._generation === gen;

    v.on('call-start', () => {
      if (!alive()) return;
      console.info('[Shelly] vapi: call-start');
      this.emit('stateChange', 'listening');
      this.emit('moodChange', 'listening');
    });

    v.on('call-end', () => {
      if (!alive()) return;
      console.info('[Shelly] vapi: call-end');
      this.emit('stateChange', 'ended');
      this.emit('moodChange', 'idle');
      this.emit('end');
    });

    // User began speaking
    v.on('speech-start', () => {
      if (!alive()) return;
      console.info('[Shelly] vapi: speech-start');
      this.emit('stateChange', 'recording');
      this.emit('moodChange', 'listening');
    });

    // User finished speaking — Vapi will now call our LLM
    v.on('speech-end', () => {
      if (!alive()) return;
      console.info('[Shelly] vapi: speech-end (processing)');
      this.emit('stateChange', 'processing');
      this.emit('moodChange', 'confused');
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    v.on('message', (message: any) => {
      if (!alive()) return;
      // Final transcript lines → build our messages array
      if (message.type === 'transcript' && message.transcriptType === 'final') {
        const role = message.role as 'user' | 'assistant';
        console.info('[Shelly] vapi: transcript final', role);
        const content = message.transcript as string;
        const updated: Message[] = [...this.messages, { role, content }];
        this.messages = updated;
        this.emit('messages', updated);

        if (role === 'assistant') {
          this.emit('stateChange', 'speaking');
          this.emit('moodChange', 'talking');
        }
      }

      // Function-call events from our custom LLM endpoint
      // (reportMood, proposeMissions, reportEndConversation)
      if (message.type === 'function-call') {
        const { name, parameters } = (message.functionCall ?? {}) as {
          name?: string; parameters?: Record<string, unknown>;
        };
        console.info('[Shelly] vapi: function-call', name);

        if (name === 'reportMood' && parameters?.mood) {
          this.emit('moodChange', parameters.mood as TurtleMood);
        }
        if (name === 'proposeMissions' && Array.isArray(parameters?.choices)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          this.emit('missionChoices', parameters!.choices as any);
        }
        if (name === 'reportEndConversation') {
          this.stop();
        }
      }

      // Assistant finished speaking → resume listening
      if (message.type === 'status-update' && message.status === 'ended') {
        console.info('[Shelly] vapi: status ended, listening');
        this.emit('stateChange', 'listening');
        this.emit('moodChange', 'listening');
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    v.on('error', (e: any) => {
      if (!alive()) return;
      console.info('[Shelly] vapi: error event', e);
      const msg = (e as Error)?.message
        ?? (typeof e === 'object' ? JSON.stringify(e) : String(e))
        ?? 'Vapi error';
      this.emit('error', msg);
    });
  }
}
