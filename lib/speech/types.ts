import type { GuardrailAgent } from './guardrails/types';

export type MissionTheme = 'brave' | 'kind' | 'calm' | 'confident' | 'creative' | 'social' | 'curious';

export interface Mission {
  id: string;
  title: string;
  description: string;
  theme: MissionTheme;
  difficulty?: 'easy' | 'medium' | 'stretch';
  status: 'active' | 'completed';
  createdAt: string;
  completedAt?: string;
}

export type TurtleMood =
  | 'idle'
  | 'listening'
  | 'talking'
  | 'happy'
  | 'sad'
  | 'confused'
  | 'surprised';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

/** Coarse location for time/weather awareness. */
export interface AwarenessLocation {
  city?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

export interface ConversationContext {
  messages: Message[];
  childName?: string;
  topics?: string[];
  difficultyProfile?: 'beginner' | 'intermediate' | 'confident';
  /** The child's currently active challenge, if any. Passed to the agent each turn. */
  activeMission?: Mission | null;
  /** IANA timezone (e.g. "America/New_York") for time awareness. */
  timezone?: string;
  /** Client's local time as ISO string; used when timezone is not provided. */
  clientLocalTime?: string;
  /** Child's location for weather and place-aware replies. */
  location?: AwarenessLocation;
  /** Pre-computed weather summary (set by server when location has lat/lon). */
  weatherDescription?: string;
}

export interface STTProvider {
  transcribe(audio: Blob): Promise<string>;
}

export interface TTSProvider {
  synthesize(text: string): Promise<ArrayBuffer>;
}

export interface MissionSuggestion {
  title: string;
  description: string;
  theme?: MissionTheme;
  difficulty: 'easy' | 'medium' | 'stretch';
}

export interface ChatResponse {
  text: string;
  mood: TurtleMood;
  missionChoices?: MissionSuggestion[];
  endConversation?: boolean;
  childName?: string;
  topic?: string;
  /** Set when the agent called acknowledge_mission_progress — e.g. to show a UI celebration */
  missionProgressNote?: string;
}

export interface ChatProvider {
  chat(input: string, ctx: ConversationContext): Promise<ChatResponse>;
}

export interface SpeechServiceConfig {
  stt: STTProvider;
  tts: TTSProvider;
  chat: ChatProvider;
  guardrails?: GuardrailAgent[];
}

/** Result of STT + guardrails + chat — no audio yet */
export interface TextProcessResult {
  userText: string;
  responseText: string;
  mood: TurtleMood;
  missionChoices?: MissionSuggestion[];
  endConversation?: boolean;
  childName?: string;
  topic?: string;
  missionProgressNote?: string;
}

export interface ProcessResult extends TextProcessResult {
  responseAudio: ArrayBuffer;
}

/**
 * Discriminated union for control messages sent over the LiveKit data channel.
 *
 * These are produced by the LiveKit agent process (see `livekit-agent/main.ts`)
 * and consumed by `LiveKitVoiceProvider` on the client. Shapes are kept in
 * sync with the other providers so mission handling stays provider-agnostic.
 */
export type LiveKitControlMessage =
  | {
      type: 'transcript';
      role: 'user' | 'assistant';
      text: string;
    }
  | {
      type: 'missionChoices';
      choices: MissionSuggestion[];
    }
  | {
    type: 'endConversation';
  }
  | {
      type: 'appToolCall';
      tool: string;
      // Intentionally loose — concrete tools define their own argument shapes.
      args: unknown;
    };

