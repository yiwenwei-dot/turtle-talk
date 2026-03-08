'use client';

import type { Message, MissionSuggestion, TurtleMood } from '../types';
import type { VoiceSessionOptions, VoiceSessionState } from './types';
import { BaseVoiceProvider } from './base';

const VAD_THRESHOLD = 35;      // ambient noise sits at 8-20, real speech at 40+
const VAD_START_MS = 150;      // silence must turn to sound for this long
const VAD_STOP_MS = 600;       // sound must drop below threshold for this long
const POLL_INTERVAL_MS = 100;
const MIN_AUDIO_BYTES = 6000;  // ~400 ms of real speech
/** Cap conversation history so context stays bounded and matches DB persistence (e.g. last 20). */
const MAX_CONVERSATION_MESSAGES = 20;

export class NativeVoiceProvider extends BaseVoiceProvider {
  readonly name = 'native';

  private stream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  private state: VoiceSessionState = 'idle';
  private prevState: VoiceSessionState = 'idle';
  private messages: Message[] = [];
  private pendingEnd = false;
  private options: VoiceSessionOptions = {};

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  async start(options: VoiceSessionOptions): Promise<void> {
    console.info('[Shelly] native start');
    this.options = options;
    // Always set messages from options so each session starts with the correct history (or empty).
    this.messages = (options.initialMessages?.length ? [...options.initialMessages] : []).slice(-MAX_CONVERSATION_MESSAGES);

    // Clear any orphaned VAD interval from a previous session (e.g. Strict Mode double-mount)
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    // Always enter listening when starting a new session, even if we were previously 'ended'
    // (transitionToListening() returns early when state is 'ended', which left us stuck)
    this.setState('listening');
    this.emit('moodChange', 'listening');

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      console.info('[Shelly] native: microphone access failed');
      this.emit('error', 'Could not access microphone');
      this.setState('idle');
      this.emit('moodChange', 'idle');
      return;
    }

    this.audioCtx = new AudioContext();
    // Resume so analyser gets real data; otherwise getByteFrequencyData returns zeros and VAD never triggers (stuck at listening).
    await this.audioCtx.resume();
    const source = this.audioCtx.createMediaStreamSource(this.stream);
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 256;
    source.connect(this.analyser);

    this.transitionToListening();
    this.startVAD();
  }

  stop(): void {
    console.info('[Shelly] native stop');
    this.cleanup();
    this.setState('ended');
    this.emit('moodChange', 'idle');
    this.emit('end');
  }

  setMuted(muted: boolean): void {
    console.info('[Shelly] native mute:', muted);
    if (muted) {
      this.prevState = this.state;
      this.audioCtx?.suspend();
      this.setState('muted');
      this.emit('moodChange', 'idle');
    } else {
      this.audioCtx?.resume();
      const restore = this.prevState === 'muted' ? 'listening' : this.prevState;
      this.setState(restore);
      this.emit('moodChange', 'listening');
    }
  }

  // ---------------------------------------------------------------------------
  // VAD loop
  // ---------------------------------------------------------------------------

  private startVAD(): void {
    const dataArr = new Uint8Array(this.analyser!.frequencyBinCount);
    let aboveThresholdSince: number | null = null;
    let belowThresholdSince: number | null = null;
    let vadTicks = 0;

    this.pollInterval = setInterval(() => {
      vadTicks += 1;
      const s = this.state;
      if (s === 'ended' || s === 'muted' || s === 'processing' || s === 'speaking') {
        return;
      }

      this.analyser!.getByteFrequencyData(dataArr);
      const avg = dataArr.reduce((a, b) => a + b, 0) / dataArr.length;

      if (s === 'listening') {
        if (avg > VAD_THRESHOLD) {
          aboveThresholdSince ??= Date.now();
          if (Date.now() - aboveThresholdSince >= VAD_START_MS) {
            aboveThresholdSince = null;
            belowThresholdSince = null;
            this.startRecording();
          }
        } else {
          aboveThresholdSince = null;
        }
      } else if (s === 'recording') {
        if (avg < VAD_THRESHOLD) {
          belowThresholdSince ??= Date.now();
          if (Date.now() - belowThresholdSince >= VAD_STOP_MS) {
            belowThresholdSince = null;
            aboveThresholdSince = null;
            this.stopRecording();
          }
        } else {
          belowThresholdSince = null;
        }
      }
    }, POLL_INTERVAL_MS);
  }

  private startRecording(): void {
    if (!this.stream) return;
    console.info('[Shelly] native: recording');
    this.chunks = [];
    this.recorder = new MediaRecorder(this.stream);
    this.recorder.start();
    this.setState('recording');
    this.emit('moodChange', 'listening');
  }

  private stopRecording(): void {
    const recorder = this.recorder;
    if (!recorder || recorder.state === 'inactive') return;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    recorder.onstop = () => {
      const mimeType = recorder.mimeType || 'audio/webm';
      const blob = new Blob(this.chunks, { type: mimeType });
      this.chunks = [];
      this.sendAudio(blob);
    };
    recorder.stop();
  }

  // ---------------------------------------------------------------------------
  // API call
  // ---------------------------------------------------------------------------

  private async sendAudio(blob: Blob): Promise<void> {
    if (blob.size < MIN_AUDIO_BYTES) {
      console.info('[Shelly] native: blob too small, back to listening');
      this.transitionToListening();
      return;
    }

    console.info('[Shelly] native: processing (request to /api/talk)');
    this.setState('processing');
    this.emit('moodChange', 'confused');

    const opts = this.options;
    const formData = new FormData();
    formData.append('audio', blob, 'audio.webm');
    formData.append('messages', JSON.stringify(this.messages.slice(-MAX_CONVERSATION_MESSAGES)));
    if (opts.childName) formData.append('childName', opts.childName);
    if (opts.topics?.length) formData.append('topics', JSON.stringify(opts.topics));
    if (opts.difficultyProfile) formData.append('difficultyProfile', opts.difficultyProfile);
    if (opts.activeMission) formData.append('activeMission', JSON.stringify(opts.activeMission));

    try {
      const res = await fetch('/api/talk', { method: 'POST', body: formData });
      if (!res.ok) {
        let errMsg: string;
        const contentType = res.headers.get('content-type') ?? '';
        if (contentType.includes('application/json')) {
          const data = await res.json().catch(() => ({}));
          errMsg = (data as { error?: string }).error ?? `HTTP ${res.status}`;
        } else {
          errMsg = `HTTP ${res.status}`;
        }
        console.info('[Shelly] native: API error response', res.status);
        throw new Error(errMsg);
      }
      if (!res.body) {
        console.info('[Shelly] native: no response body');
        throw new Error('No response body');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let receivedMeta = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as Record<string, unknown>;

          if (event.type === 'user_text') {
            const userText = typeof event.userText === 'string' ? event.userText : '';
            if (userText.trim()) this.emit('userTranscript', userText);
          } else if (event.type === 'meta') {
            receivedMeta = true;
            console.info('[Shelly] native: meta received');
            const { userText, responseText, mood, missionChoices, endConversation, childName, topic } =
              event as {
                userText: string; responseText: string; mood: TurtleMood;
                missionChoices?: MissionSuggestion[]; endConversation?: boolean;
                childName?: string; topic?: string;
              };

            if (missionChoices) this.emit('missionChoices', missionChoices);
            if (endConversation) this.pendingEnd = true;
            if (childName) this.emit('childName', childName);
            if (topic) this.emit('topic', topic);

            const updated = [
              ...this.messages,
              { role: 'user' as const, content: userText },
              { role: 'assistant' as const, content: responseText },
            ].slice(-MAX_CONVERSATION_MESSAGES) as Message[];
            this.messages = updated;
            this.emit('messages', updated);

            // No TTS when response is empty — server won't send audio; transition back to listening in one place
            if (responseText?.trim()) {
              this.setState('speaking');
              this.emit('moodChange', mood ?? 'talking');
            } else {
              console.info('[Shelly] native: meta had empty response, back to listening');
              this.transitionToListening();
            }

          } else if (event.type === 'audio') {
            console.info('[Shelly] native: audio received');
            await this.playAudio(event.base64 as string);
          } else if (event.type === 'error') {
            console.info('[Shelly] native: stream error event');
            const errPayload = event.error as string;
            throw new Error(errPayload);
          }
        }
      }

      // Single place for "stream ended" recovery: avoid duplicate emissions, keep state/mood in sync
      if (!receivedMeta && this.state === 'processing') {
        console.info('[Shelly] native: stream ended without meta, back to listening');
        this.transitionToListening();
      } else if (this.state === 'speaking') {
        console.info('[Shelly] native: stream ended while speaking, back to listening');
        this.transitionToListening();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      console.info('[Shelly] native: sendAudio error');
      this.emit('error', msg);
      this.transitionToListening();
    }
  }

  // ---------------------------------------------------------------------------
  // Audio playback
  // ---------------------------------------------------------------------------

  private async playAudio(base64: string): Promise<void> {
    return new Promise((resolve) => {
      console.info('[Shelly] native: playing audio');
      const audioData = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const buffer = audioData.buffer.slice(audioData.byteOffset, audioData.byteOffset + audioData.byteLength);
      const playCtx = new AudioContext();
      void playCtx.resume().then(() =>
        playCtx.decodeAudioData(buffer)
      ).then((decoded) => {
        const source = playCtx.createBufferSource();
        source.buffer = decoded;
        source.connect(playCtx.destination);
        source.start();
        source.onended = () => {
          playCtx.close();
          console.info('[Shelly] native: audio ended, back to listening');
          if (this.pendingEnd) {
            this.pendingEnd = false;
            this.stop();
          } else {
            this.transitionToListening();
          }
          resolve();
        };
      }).catch((err) => {
        console.info('[Shelly] native: audio decode failed');
        playCtx.close();
        if (this.state !== 'ended' && this.state !== 'muted') {
          this.emit('error', `Audio playback failed: ${err instanceof Error ? err.message : 'invalid audio format'}`);
          this.transitionToListening();
        }
        resolve();
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  private cleanup(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
    if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.audioCtx?.close();
    this.audioCtx = null;
  }

  private setState(s: VoiceSessionState): void {
    this.state = s;
    this.emit('stateChange', s);
  }

  /** Single place to transition to listening so state + mood stay in sync (seamless event management). */
  private transitionToListening(): void {
    if (this.state === 'ended' || this.state === 'muted') return;
    this.setState('listening');
    this.emit('moodChange', 'listening');
  }
}
