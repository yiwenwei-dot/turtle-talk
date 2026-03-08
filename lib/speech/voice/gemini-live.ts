'use client';

import type { Message, TurtleMood } from '../types';
import type { VoiceSessionOptions } from './types';
import { BaseVoiceProvider } from './base';
import { buildSystemPrompt } from '../prompts';

const LIVE_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';
const SEND_SAMPLE_RATE = 16000;
const RECV_SAMPLE_RATE = 24000;

/** Event type for Gemini Live API onmessage callback (avoids deep inline type parse errors). */
type GeminiLiveMessageEvent = {
  serverContent?: {
    modelTurn?: {
      parts?: { inlineData?: { data?: string; mimeType?: string }; text?: string }[];
    };
    interrupted?: boolean;
    turnComplete?: boolean;
  };
};

function buildShellySystemInstruction(options: VoiceSessionOptions): string {
  // VoiceSessionOptions is structurally compatible with ShellyPromptContext:
  // it has childName, topics, difficultyProfile, and activeMission (with title/description).
  return buildSystemPrompt(options);
}

/**
 * GeminiLiveVoiceProvider
 *
 * Uses the Gemini Live API (WebSocket) for real-time bidirectional voice.
 * Fetches an ephemeral token from /api/gemini-live/token, then connects
 * with mic at 16 kHz PCM and plays back 24 kHz audio.
 */
export class GeminiLiveVoiceProvider extends BaseVoiceProvider {
  readonly name = 'gemini-live';

  private session: { sendRealtimeInput: (params: { audio?: { data?: string; mimeType?: string }; audioStreamEnd?: boolean }) => void; conn?: { close(): void } } | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private audioQueue: ArrayBuffer[] = [];
  private playbackContext: AudioContext | null = null;
  private messages: Message[] = [];
  private _generation = 0;
  private _muted = false;
  private streamRef: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;

  async start(options: VoiceSessionOptions): Promise<void> {
    const gen = ++this._generation;
    this.emit('stateChange', 'listening');
    this.emit('moodChange', 'listening');
    if (options.initialMessages?.length) {
      this.messages = [...options.initialMessages];
    }

    try {
      const tokenRes = await fetch('/api/gemini-live/token');
      if (!tokenRes.ok) {
        const err = await tokenRes.json().catch(() => ({}));
        throw new Error(err?.error ?? `Token failed: ${tokenRes.status}`);
      }
      const { token } = (await tokenRes.json()) as { token?: string };
      if (!token) throw new Error('No token in response');

      if (this._generation !== gen) return;

      const { GoogleGenAI, Modality } = await import('@google/genai/web');
      const ai = new GoogleGenAI({
        apiKey: token,
        httpOptions: { apiVersion: 'v1alpha' },
      });

      const systemInstruction = buildShellySystemInstruction(options);

      const session = await ai.live.connect({
        model: LIVE_MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: { parts: [{ text: systemInstruction }] },
        },
        callbacks: {
          onopen: () => {
            if (this._generation !== gen) return;
            console.info('[Shelly] gemini-live: connected');
          },
          onmessage: (e: GeminiLiveMessageEvent) => {
            if (this._generation !== gen) return;
            const sc = e?.serverContent;
            if (sc?.interrupted) {
              this.audioQueue.length = 0;
              return;
            }
            const turn = sc?.modelTurn;
            const parts = turn?.parts ?? [];
            let assistantText = '';
            for (const part of parts) {
              if (part.inlineData?.data) {
                try {
                  const binary = atob(part.inlineData.data);
                  const buf = new ArrayBuffer(binary.length);
                  const view = new Uint8Array(buf);
                  for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
                  this.audioQueue.push(buf);
                  this.emit('stateChange', 'speaking');
                  this.emit('moodChange', 'talking');
                } catch {
                  // ignore decode errors
                }
              }
              if (part.text?.trim()) assistantText += part.text;
            }
            if (assistantText.trim()) {
              this.messages = [...this.messages, { role: 'assistant', content: assistantText.trim() }];
              this.emit('messages', this.messages);
            }
          },
          onerror: (ev: { error?: unknown }) => {
            if (this._generation !== gen) return;
            const msg = ev?.error instanceof Error ? ev.error.message : String(ev?.error ?? 'Live API error');
            this.emit('error', msg);
          },
          onclose: () => {
            if (this._generation !== gen) return;
            console.info('[Shelly] gemini-live: closed');
            this.session = null;
            this.mediaStream?.getTracks().forEach((t) => t.stop());
            this.mediaStream = null;
            this.streamRef?.disconnect();
            this.streamRef = null;
            this.processor?.disconnect();
            this.processor = null;
            this.audioContext?.close();
            this.audioContext = null;
            this.emit('stateChange', 'idle');
            this.emit('moodChange', 'idle');
            this.emit('end');
          },
        },
      });

      this.session = session as typeof this.session;
      if (this._generation !== gen) return;

      this.startPlaybackLoop(gen);
      this.startMicCapture(gen);
    } catch (err) {
      if (this._generation !== gen) return;
      console.info('[Shelly] gemini-live: start error');
      this.emit('error', err instanceof Error ? err.message : 'Failed to start Gemini Live');
      this.emit('stateChange', 'idle');
      this.emit('moodChange', 'idle');
    }
  }

  private startPlaybackLoop(gen: number): void {
    const play = async () => {
      while (this._generation === gen && this.audioQueue.length > 0) {
        const chunk = this.audioQueue.shift();
        if (!chunk) continue;
        try {
          const ctx = this.playbackContext ?? new AudioContext({ sampleRate: RECV_SAMPLE_RATE });
          this.playbackContext = ctx;
          const view = new Int16Array(chunk);
          const float32 = new Float32Array(view.length);
          for (let i = 0; i < view.length; i++) float32[i] = view[i] / 32768;
          const buffer = ctx.createBuffer(1, float32.length, RECV_SAMPLE_RATE);
          buffer.getChannelData(0).set(float32);
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(ctx.destination);
          source.start(0);
          await new Promise<void>((r) => (source.onended = () => r()));
        } catch {
          // ignore
        }
      }
      if (this._generation === gen && this.session) {
        this.emit('stateChange', 'listening');
        this.emit('moodChange', 'listening');
      }
      if (this._generation === gen) setTimeout(play, 50);
    };
    play();
  }

  private startMicCapture(gen: number): void {
    navigator.mediaDevices
      .getUserMedia({ audio: { channelCount: 1, sampleRate: { ideal: SEND_SAMPLE_RATE } } })
      .then((stream) => {
        if (this._generation !== gen || !this.session) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        this.mediaStream = stream;
        const ctx = new AudioContext({ sampleRate: 48000 });
        this.audioContext = ctx;
        const source = ctx.createMediaStreamSource(stream);
        this.streamRef = source;
        const bufferSize = 4096;
        const processor = ctx.createScriptProcessor(bufferSize, 1, 1);
        this.processor = processor;
        processor.onaudioprocess = (e) => {
          if (!this.session || this._muted) return;
          try {
            const input = e.inputBuffer.getChannelData(0);
            const outFrames = Math.floor(input.length / 3);
            const out = new Int16Array(outFrames);
            for (let i = 0; i < outFrames; i++) {
              const j = i * 3;
              const v = (input[j] + input[j + 1] + input[j + 2]) / 3;
              out[i] = Math.max(-32768, Math.min(32767, Math.round(v * 32768)));
            }
            const b64 = btoa(String.fromCharCode(...new Uint8Array(out.buffer)));
            this.session?.sendRealtimeInput({
              audio: { data: b64, mimeType: `audio/pcm;rate=${SEND_SAMPLE_RATE}` },
            });
          } catch {
            // Session closed; ignore
          }
        };
        source.connect(processor);
        processor.connect(ctx.destination);
      })
      .catch((err) => {
        if (this._generation !== gen) return;
        this.emit('error', err?.message ?? 'Microphone access failed');
      });
  }

  stop(): void {
    this._generation++;
    if (this.session?.conn) this.session.conn.close();
    this.session = null;
    this.audioQueue.length = 0;
    this.mediaStream?.getTracks().forEach((t) => t.stop());
    this.mediaStream = null;
    this.streamRef?.disconnect();
    this.streamRef = null;
    this.processor?.disconnect();
    this.processor = null;
    this.audioContext?.close();
    this.audioContext = null;
    this.playbackContext?.close();
    this.playbackContext = null;
    this.emit('stateChange', 'ended');
    this.emit('moodChange', 'idle');
    this.emit('end');
  }

  setMuted(muted: boolean): void {
    this._muted = muted;
    if (muted) {
      this.emit('stateChange', 'muted');
      this.emit('moodChange', 'idle');
    } else {
      this.emit('stateChange', 'listening');
      this.emit('moodChange', 'listening');
    }
  }
}
