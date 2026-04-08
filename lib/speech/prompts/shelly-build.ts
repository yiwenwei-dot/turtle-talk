import type { ConversationContext } from '../types';
import { BASE_SYSTEM_PROMPT } from './shelly-base';
import { getTimeDescription } from '../awareness/time';
import { getLocationDescription } from '../awareness/location';

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
  timezone?: string | null;
  clientLocalTime?: string | null;
  location?: ConversationContext['location'];
  weatherDescription?: string | null;
}

/**
 * Strip characters that are prompt-injection vectors before embedding
 * user-supplied strings in the system prompt.
 *
 * Defense-in-depth alongside Zod schema limits at the API boundary:
 * the slice cap here covers paths that bypass the API (e.g. tests, voice providers).
 */
function sanitizeForPrompt(s: string, maxLen = 200): string {
  return s
    .replace(/[\n\r]/g, ' ')    // no newlines — primary injection vector
    .replace(/[`<>"]/g, '')     // no backticks, angle brackets, or double-quotes
    .slice(0, maxLen)
    .trim();
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
    timezone,
    clientLocalTime,
    location,
    weatherDescription,
  } = ctx as ShellyPromptContext & ConversationContext;

  const safeName = childName?.trim() ? sanitizeForPrompt(childName.trim(), 50) : null;

  let prompt =
    safeName
      ? `${BASE_SYSTEM_PROMPT}\n\nThe child's name is ${safeName}. Use their name occasionally.`
      : `${BASE_SYSTEM_PROMPT}\n\nYou do not know the child's name yet. Call them a little explorer or similar friendly term until they share their name.`;

  if (topics && topics.length) {
    const safeTopics = topics.map((t) => sanitizeForPrompt(t, 100)).filter(Boolean);
    if (safeTopics.length) {
      prompt += `\n\nThis child has enjoyed talking about: ${safeTopics.join(', ')}. Reference naturally if relevant.`;
    }
  }

  if (activeMission && activeMission.title && activeMission.description) {
    const safeTitle = sanitizeForPrompt(activeMission.title, 200);
    const safeDesc  = sanitizeForPrompt(activeMission.description, 500);
    prompt +=
      `\n\nACTIVE CHALLENGE: ${safeTitle} — ${safeDesc}. ` +
      `This conversation is focused on this challenge. Help the child complete it or talk through it: give ideas, encourage them, and ask how it went. ` +
      `Do NOT propose new missions or end the conversation to suggest missions; stay on this one challenge. ` +
      `If the child makes progress or completes it, call acknowledge_mission_progress.`;
  }

  const awarenessParts: string[] = [];
  const safeTz   = timezone        ? sanitizeForPrompt(timezone, 100)        : undefined;
  const safeTime = clientLocalTime ? sanitizeForPrompt(clientLocalTime, 50)  : undefined;
  const timeDesc = getTimeDescription({ timezone: safeTz, clientLocalTime: safeTime });
  if (timeDesc) awarenessParts.push(`Current date and time where the child is: ${timeDesc}.`);
  const locDesc = getLocationDescription(location ?? undefined);
  if (locDesc) awarenessParts.push(`The child is in: ${locDesc}.`);
  if (weatherDescription?.trim()) awarenessParts.push(`Current weather there: ${weatherDescription.trim()}.`);
  if (awarenessParts.length) {
    prompt += `\n\nAWARENESS (use naturally; do not lecture): ${awarenessParts.join(' ')}`;
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
