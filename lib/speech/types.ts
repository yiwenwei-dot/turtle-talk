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

export interface ConversationContext {
  messages: Message[];
  childName?: string;
  topics?: string[];
  difficultyProfile?: 'beginner' | 'intermediate' | 'confident';
  /** The child's currently active challenge, if any. Passed to the agent each turn. */
  activeMission?: Mission | null;
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
