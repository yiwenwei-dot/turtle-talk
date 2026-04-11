/**
 * Data contracts for the Tammy conversation and safety pipeline.
 * Used by the conversation-understanding, processing, refinement, and gatekeeping layers.
 */

import type { TammyMode } from '../speech/prompts/tammy-modes';

// ---------------------------------------------------------------------------
// Turn context (input to the pipeline each turn)
// ---------------------------------------------------------------------------

export interface TurnContext {
  userText: string;
  timestamp: string; // ISO
  recentHistorySummary: string;
  priorMode: TammyMode;
  emotionLast?: string;
  escalationLast?: EscalationTier;
  /** Optional: last N turns for pattern detection */
  recentTurns?: Array<{ role: 'user' | 'assistant'; text: string }>;
}

// ---------------------------------------------------------------------------
// Conversation understanding layer outputs
// ---------------------------------------------------------------------------

export interface SignalReport {
  emotionalSignals: EmotionalSignal[];
  safetySignals: SafetySignal[];
  engagementSignals: EngagementSignal[];
  /** Overall distress score 0–1 (higher = more distress) */
  distressScore: number;
  /** Detected patterns: repeated_distress, strong_negative_language, silence_after_prompt, tone_shift */
  patterns: string[];
}

export interface EmotionalSignal {
  type: 'distress' | 'joy' | 'boredom' | 'confusion' | 'anger' | 'sadness' | 'fear' | 'neutral';
  confidence: number;
  snippet?: string;
}

export interface SafetySignal {
  category: 'self_harm' | 'harm_others' | 'bullying' | 'abuse' | 'hate' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  /** Do not log full snippet in analytics; use for internal routing only */
  snippet?: string;
}

export interface EngagementSignal {
  type: 'short_reply' | 'delay' | 'topic_shift' | 'emoji_use' | 'repetitive_idk' | 'engaged';
  confidence: number;
}

export type QuestionType = 'open' | 'closed' | 'check_in' | 'playful' | 'none';

export interface InteractionStyle {
  /** Whether to ask a question this turn */
  askQuestion: boolean;
  questionType?: QuestionType;
  /** Prefer reflection/paraphrase over question */
  preferReflection: boolean;
  /** Whether to offer a suggestion or mission hook this turn */
  offerSuggestion: boolean;
}

export type TaskOrientation = 'none' | 'low' | 'high';

export interface ProductEngagementSuggestion {
  show: boolean;
  /** e.g. 'mission' | 'garden' | 'tree' */
  surface?: string;
  /** Short copy or hook to use */
  hook?: string;
}

export interface UnderstandingOutput {
  primaryMode: TammyMode;
  modeMix: Partial<Record<TammyMode, number>>;
  modeConfidence: number;
  interactionStyle: InteractionStyle;
  taskOrientation: TaskOrientation;
  productEngagementSuggestion: ProductEngagementSuggestion;
  signalReport: SignalReport;
}

// ---------------------------------------------------------------------------
// Processing layer outputs
// ---------------------------------------------------------------------------

export interface EmotionLabels {
  emotionPrimary: string;
  emotionSecondary?: string;
  intensity: 'low' | 'medium' | 'high';
}

export type EscalationTier = 0 | 1 | 2 | 3;

export type RecommendedSafetyAction =
  | 'none'
  | 'longer_empathy'
  | 'suggest_grownup'
  | 'parent_alert_quiet';

export interface ProcessingOutput {
  emotionLabels: EmotionLabels;
  escalationTier: EscalationTier;
  recommendedSafetyAction: RecommendedSafetyAction;
  missionsCandidates: Array<{ title: string; description: string }>;
  contentSummary: string;
  /** Filtered for parent-facing / analytics */
  contentSummaryFiltered?: string;
  recs: Array<{ type: 'book' | 'movie'; title: string; ageNote?: string }>;
  resources: Array<{ title: string; url?: string; description: string }>;
}

// ---------------------------------------------------------------------------
// Refinement layer outputs
// ---------------------------------------------------------------------------

export interface RefinementOutput {
  candidateResponses: string[];
  finalCandidate: string;
  riskFlags: ('contentious' | 'borderline' | 'none')[];
}

// ---------------------------------------------------------------------------
// Gatekeeping layer outputs
// ---------------------------------------------------------------------------

export type GatekeepingAction = 'allow_response' | 'modify_response' | 'block_and_escalate';

export interface GatekeepingOutput {
  finalResponse: string;
  action: GatekeepingAction;
  parentAlertTriggered: boolean;
  /** If action is modify_response, the guardrail may suggest replacement phrasing */
  suggestedModification?: string;
}
