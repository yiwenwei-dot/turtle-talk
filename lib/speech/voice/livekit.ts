'use client';

import { Room, RoomEvent, Track } from 'livekit-client';
import type { VoiceSessionOptions } from './types';
import type { LiveKitControlMessage, Message, MissionSuggestion } from '../types';
import { BaseVoiceProvider } from './base';

/**
 * LiveKitVoiceProvider
 *
 * Connects to a LiveKit room with a token from /api/livekit/token. The room is
 * joined by a LiveKit agent (see livekit-agent/) that runs the voice pipeline
 * (e.g. OpenAI Realtime or STT-LLM-TTS) and publishes audio back to the room.
 */
export class LiveKitVoiceProvider extends BaseVoiceProvider {
  readonly name = 'livekit';

  private room: Room | null = null;
  private _generation = 0;
  private _muted = false;
  private audioEl: HTMLAudioElement | null = null;
  /** Timeout: emit error if agent never publishes audio. */
  private _agentJoinTimeoutId: ReturnType<typeof setTimeout> | null = null;
  /** Conversation messages (user + assistant) when agent sends transcript data. */
  private _messages: Message[] = [];

  async start(options: VoiceSessionOptions): Promise<void> {
    const gen = ++this._generation;
    this._messages = options.initialMessages ? [...options.initialMessages] : [];
    if (this._messages.length > 0) this.emit('messages', this._messages);
    this.emit('stateChange', 'connecting');
    this.emit('moodChange', 'listening');

    try {
      const tokenRes = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: options.childName?.trim() ? `talk-${options.childName.trim()}` : undefined,
          participantName: 'child',
          childName: options.childName?.trim() || 'little explorer',
          topics: options.topics?.length ? options.topics : undefined,
        }),
      });
      if (!tokenRes.ok) {
        const err = await tokenRes.json().catch(() => ({}));
        throw new Error(err?.error ?? `Token failed: ${tokenRes.status}`);
      }
      const data = (await tokenRes.json()) as { token?: string; roomName?: string; livekitUrl?: string };
      const { token, roomName, livekitUrl } = data;
      if (!token || !livekitUrl?.trim()) throw new Error('Missing token or livekitUrl');

      if (this._generation !== gen) return;

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        publishDefaults: { simulcast: false },
      });

      room.on(RoomEvent.Disconnected, (reason) => {
        if (this._generation !== gen) return;
        if (this._agentJoinTimeoutId) {
          clearTimeout(this._agentJoinTimeoutId);
          this._agentJoinTimeoutId = null;
        }
        this.room = null;
        this.audioEl = null;
        this.emit('stateChange', 'idle');
        this.emit('moodChange', 'idle');
        this.emit('end');
      });

      room.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
        if (this._generation !== gen) return;
        this.handleData(payload);
      });

      room.on(RoomEvent.TrackSubscribed, (track, _pub, _participant) => {
        if (this._generation !== gen || track.kind !== Track.Kind.Audio) return;
        if (this._agentJoinTimeoutId) {
          clearTimeout(this._agentJoinTimeoutId);
          this._agentJoinTimeoutId = null;
        }
        const hadExistingEl = !!this.audioEl;
        if (hadExistingEl && this.audioEl?.parentNode) {
          this.audioEl.remove();
          this.audioEl = null;
        }
        const el = track.attach();
        this.audioEl = el;
        el.autoplay = true;
        document.body.appendChild(el);
        const mediaEl = el as HTMLMediaElement;

        const setSpeaking = (speaking: boolean) => {
          if (this._generation !== gen) return;
          this.emit('stateChange', speaking ? 'speaking' : 'listening');
          this.emit('moodChange', speaking ? 'talking' : 'listening');
        };

        mediaEl.addEventListener('playing', () => setSpeaking(true));
        mediaEl.addEventListener('pause', () => setSpeaking(false));
        mediaEl.addEventListener('ended', () => setSpeaking(false));

        const playPromise = mediaEl.play?.();
        if (playPromise !== undefined) {
          playPromise.catch(() => {});
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        if (track.kind === Track.Kind.Audio && this.audioEl) {
          this.audioEl.remove();
          this.audioEl = null;
        }
        if (this._generation === gen) {
          this.emit('stateChange', 'listening');
          this.emit('moodChange', 'listening');
        }
      });

      await room.connect(livekitUrl, token, { autoSubscribe: true });

      if (this._generation !== gen) {
        room.disconnect();
        return;
      }

      this.room = room;
      this.emit('stateChange', 'listening');

      await room.localParticipant.setMicrophoneEnabled(true);
      if (this._muted) await room.localParticipant.setMicrophoneEnabled(false);

      this._agentJoinTimeoutId = setTimeout(() => {
        this._agentJoinTimeoutId = null;
        if (this._generation === gen && this.room && !this.audioEl) {
          this.emit('error', "Shelly couldn't join the room. Is the agent running on your server?");
        }
      }, 15000);
    } catch (err) {
      if (this._generation !== gen) return;
      const msg = err instanceof Error ? err.message : 'Failed to connect to LiveKit';
      this.emit('error', msg);
      this.emit('stateChange', 'idle');
      this.emit('moodChange', 'idle');
    }
  }

  private handleData(payload: Uint8Array): void {
    let message: LiveKitControlMessage;
    try {
      const text = new TextDecoder().decode(payload);
      message = JSON.parse(text) as LiveKitControlMessage;
    } catch {
      // ignore non-JSON or other data
      return;
    }

    switch (message.type) {
      case 'transcript': {
        if (typeof message.text !== 'string') return;
        const role = message.role === 'assistant' ? 'assistant' : 'user';
        this.emit('userTranscript', message.text);
        this._messages = [...this._messages, { role, content: message.text }];
        this.emit('messages', this._messages);
        break;
      }
      case 'missionChoices': {
        if (Array.isArray(message.choices) && message.choices.length > 0) {
          this.emit('missionChoices', message.choices as MissionSuggestion[]);
        }
        break;
      }
      case 'endConversation': {
        this.stop();
        break;
      }
      case 'appToolCall': {
        this.emit('appToolCall', { tool: message.tool, args: message.args });
        break;
      }
    }
  }

  stop(): void {
    this._generation++;
    if (this._agentJoinTimeoutId) {
      clearTimeout(this._agentJoinTimeoutId);
      this._agentJoinTimeoutId = null;
    }
    if (this.audioEl?.parentNode) this.audioEl.remove();
    this.audioEl = null;
    this.room?.disconnect();
    this.room = null;
    this.emit('stateChange', 'ended');
    this.emit('end');
  }

  setMuted(muted: boolean): void {
    this._muted = muted;
    if (this.room) {
      void this.room.localParticipant.setMicrophoneEnabled(!muted);
    }
    if (muted) {
      this.emit('stateChange', 'muted');
      this.emit('moodChange', 'idle');
    } else {
      this.emit('stateChange', 'listening');
      this.emit('moodChange', 'listening');
    }
  }
}
