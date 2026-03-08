import type { ConversationContext } from '../types';
import { BASE_SYSTEM_PROMPT } from './shelly-base';

/**
 * Minimal context needed to build Shelly's system prompt.
 * Both ConversationContext (server chat) and VoiceSessionOptions (voice providers)
 * are structurally compatible with this shape.
 */
export interface ShellyPromptContext {
  childName?: string | null;
  topics?: string[];
  difficultyProfile?: 'beginner' | 'intermediate' | 'confident';
  activeMission?: { title: string; description: string } | null;
}

/**
 * Build the full system prompt for Shelly given high-level context.
 * Used by both the /api/talk chat provider and realtime voice providers.
 */
export function buildSystemPrompt(ctx: ShellyPromptContext | ConversationContext): string {
  const {
    childName,
    topics,
    activeMission,
    difficultyProfile,
  } = ctx as ShellyPromptContext & ConversationContext;

  let prompt =
    childName && childName.trim()
      ? `${BASE_SYSTEM_PROMPT}\n\nThe child's name is ${childName.trim()}. Use their name occasionally.`
      : `${BASE_SYSTEM_PROMPT}\n\nYou do not know the child's name yet. Call them a little explorer or similar friendly term until they share their name.`;

  if (topics && topics.length) {
    prompt += `\n\nThis child has enjoyed talking about: ${topics.join(', ')}. Reference naturally if relevant.`;
  }

  if (activeMission && activeMission.title && activeMission.description) {
    prompt +=
      `\n\nACTIVE CHALLENGE: "${activeMission.title}" — ${activeMission.description}. ` +
      `Mention it briefly in one of your questions (e.g. "Have you tried your challenge yet?"). ` +
      `If the child brings it up, call acknowledge_mission_progress.`;
  }

  const profile: ShellyPromptContext['difficultyProfile'] =
    difficultyProfile ?? 'beginner';

  const difficultyInstruction =
    profile === 'confident'
      ? '\n\nMISSION DIFFICULTY: This child is experienced — make the stretch challenge the main focus (one medium, two stretch).'
      : profile === 'intermediate'
      ? '\n\nMISSION DIFFICULTY: Mix it up — one easy, one medium, one stretch.'
      : '\n\nMISSION DIFFICULTY: This child is just starting out — keep it gentle (two easy, one medium).';

  prompt += difficultyInstruction;
  return prompt;
}

