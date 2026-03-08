import type { TurtleMood, Message, MissionSuggestion, Mission } from '../types';

export type VoiceSessionState =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'recording'
  | 'processing'
  | 'speaking'
  | 'muted'
  | 'ended';

/** Options passed to provider.start() */
export interface VoiceSessionOptions {
  childName?: string | null;
  topics?: string[];
  initialMessages?: Message[];
  difficultyProfile?: 'beginner' | 'intermediate' | 'confident';
  /** The child's currently active challenge — shown to the agent each turn for coaching */
  activeMission?: Mission | null;
}

/** Payload for an app-side tool call requested by a voice provider (e.g. LiveKit agent). */
export interface AppToolCallEvent {
  tool: string;
  // Concrete tools define their own argument shapes.
  args: unknown;
}

/** Typed event payloads — one value per event name */
export interface VoiceEventMap {
  stateChange:    VoiceSessionState;
  moodChange:     TurtleMood;
  messages:       Message[];
  /** Emitted as soon as STT returns, before LLM reply — so UI can show "You said: ..." */
  userTranscript: string;
  missionChoices: MissionSuggestion[];
  childName:      string;
  topic:          string;
  appToolCall:    AppToolCallEvent;
  error:          string;
  end:            void;
}

export type VoiceEventHandler<E extends keyof VoiceEventMap> =
  VoiceEventMap[E] extends void
    ? () => void
    : (payload: VoiceEventMap[E]) => void;

/** Abstraction over the entire voice call lifecycle.
 *  Implemented by NativeVoiceProvider and VapiVoiceProvider. */
export interface VoiceConversationProvider {
  readonly name: string;
  start(options: VoiceSessionOptions): Promise<void>;
  stop(): void;
  setMuted(muted: boolean): void;
  on<E extends keyof VoiceEventMap>(event: E, handler: VoiceEventHandler<E>): void;
  off<E extends keyof VoiceEventMap>(event: E, handler: VoiceEventHandler<E>): void;
}
