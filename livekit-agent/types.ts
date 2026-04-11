export type MissionTheme = 'brave' | 'kind' | 'calm' | 'confident' | 'creative' | 'social' | 'curious';

export interface MissionSuggestion {
  title: string;
  description: string;
  theme?: MissionTheme;
  difficulty: 'easy' | 'medium' | 'stretch';
}

export type LiveKitControlMessage =
  | { type: 'transcript'; role: 'user' | 'assistant'; text: string }
  | { type: 'missionChoices'; choices: MissionSuggestion[] }
  | { type: 'endConversation' }
  | { type: 'appToolCall'; tool: string; args: unknown };
