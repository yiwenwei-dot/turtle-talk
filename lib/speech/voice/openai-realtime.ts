'use client';

import type { Message, TurtleMood, MissionSuggestion } from '../types';
import type { VoiceSessionOptions } from './types';
import { BaseVoiceProvider } from './base';
import { speechConfig } from '../config';
import { buildSystemPrompt } from '../prompts';

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
      description: "Set Shelly's current emotional state. You MUST call this every single turn.",
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

// Re-export for tests and other consumers that import from this module.
export { buildSystemPrompt } from '../prompts';

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
  private pendingEnd = false;
  private pendingMissions: MissionSuggestion[] | null = null;
  private pendingToolCalls: PendingToolCall[] = [];

  async start(options: VoiceSessionOptions): Promise<void> {
    const gen = ++this._generation;
    this.emit('stateChange', 'listening');
    this.emit('moodChange', 'listening');
    this.messages = options.initialMessages ? [...options.initialMessages] : [];

    const model = speechConfig.openaiRealtime.model;
    const voice = speechConfig.openaiRealtime.voice;

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
      console.info('[Shelly] openai-realtime: start error');
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
            // no-op — acknowledgement signal only
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
