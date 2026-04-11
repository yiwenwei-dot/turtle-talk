/**
 * Escalation response templates (Tier 0–3) and parent alert messaging.
 * Used by the gatekeeping layer and escalation-check logic to keep
 * Tammy's responses safe and consistent when distress or safety signals are present.
 */

import type { EscalationTier } from '../../tammy-agents/types';

// ---------------------------------------------------------------------------
// Tier 0 – Normal (no template override; use mode-appropriate response)
// ---------------------------------------------------------------------------

/** Tier 0: No fixed template. Pipeline uses the refined candidate as-is. */
export const TIER_0_DESCRIPTION =
  'Normal. No strong distress or safety signals. Use mode-appropriate interactions with light emotional validation.';

// ---------------------------------------------------------------------------
// Tier 1 – Repeated distress → Slightly longer empathy
// ---------------------------------------------------------------------------

export const TIER_1_RESPONSE_TEMPLATES: string[] = [
  "That sounds really hard, and it's okay to feel that way. Do you want to keep talking about this or take a tiny break?",
  "I hear you. Big feelings are allowed. Want to keep sharing or pause for a bit?",
  "That's a lot. I'm here. Do you want to keep going or take a little break?",
];

/** Pick one Tier 1 template (e.g. by hash of conversation id or random). */
export function getTier1Response(_conversationId?: string): string {
  return TIER_1_RESPONSE_TEMPLATES[0];
}

// ---------------------------------------------------------------------------
// Tier 2 – Pattern over days → Suggest grown-up
// ---------------------------------------------------------------------------

export const TIER_2_MAIN_PHRASE =
  'This feels like a big one. Would you like to talk to a grown-up too?';

export const TIER_2_RESPONSE_TEMPLATES: string[] = [
  `${TIER_2_MAIN_PHRASE} I can help you think of what to say if you want.`,
  `Sometimes talking to a grown-up who knows you helps a lot. ${TIER_2_MAIN_PHRASE}`,
  `${TIER_2_MAIN_PHRASE} We could think together about how to start that conversation.`,
];

export function getTier2Response(_conversationId?: string): string {
  return TIER_2_RESPONSE_TEMPLATES[0];
}

// ---------------------------------------------------------------------------
// Tier 3 – Severe keywords → Parent alert (quietly)
// ---------------------------------------------------------------------------

/** Tier 3: Pre-approved supportive responses. No specifics; encourage adult involvement now. */
export const TIER_3_RESPONSE_TEMPLATES: string[] = [
  "I'm really glad you told me. Can you find an adult you trust right now and tell them what you told me? They can help.",
  "Thank you for sharing that with me. The next step is to talk to a grown-up you trust, right away. Can you go find them?",
  "I hear you. Please tell a grown-up you trust what you just said. They know how to help better than I do.",
];

export function getTier3Response(_conversationId?: string): string {
  return TIER_3_RESPONSE_TEMPLATES[0];
}

// ---------------------------------------------------------------------------
// Escalation tier → response selector
// ---------------------------------------------------------------------------

export function getEscalationResponse(
  tier: EscalationTier,
  conversationId?: string
): string | null {
  switch (tier) {
    case 0:
      return null; // use normal pipeline output
    case 1:
      return getTier1Response(conversationId);
    case 2:
      return getTier2Response(conversationId);
    case 3:
      return getTier3Response(conversationId);
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Parent / caregiver alert messaging (quiet – not shown to child)
// ---------------------------------------------------------------------------

export interface ParentAlertPayload {
  /** Internal: tier that triggered the alert (3 = severe) */
  escalationTier: EscalationTier;
  /** Short, non-identifying reason for the alert (do not include child's exact words) */
  reasonCode: 'severe_safety_keywords' | 'pattern_over_days' | 'other';
  /** Suggested copy for in-app or email to parent (high-level only) */
  suggestedParentMessage: string;
  /** Optional: timestamp of trigger (ISO) */
  triggeredAt?: string;
}

const PARENT_ALERT_REASONS: Record<ParentAlertPayload['reasonCode'], string> = {
  severe_safety_keywords:
    'Tammy detected language that may need a trusted adult\'s support. We encourage you to check in with your child when you can.',
  pattern_over_days:
    'Your child has had some tough conversations with Tammy lately. You might want to check in and see how they\'re doing.',
  other:
    'Tammy noticed something that might be worth a gentle check-in with your child.',
};

export function buildParentAlertPayload(
  escalationTier: EscalationTier,
  reasonCode: ParentAlertPayload['reasonCode'],
  triggeredAt?: string
): ParentAlertPayload {
  const suggestedParentMessage =
    escalationTier === 3
      ? 'Tammy had a conversation with your child that touched on something serious. We recommend talking with your child and, if needed, reaching out to a professional for support.'
      : PARENT_ALERT_REASONS[reasonCode];

  return {
    escalationTier,
    reasonCode,
    suggestedParentMessage,
    triggeredAt: triggeredAt ?? new Date().toISOString(),
  };
}
