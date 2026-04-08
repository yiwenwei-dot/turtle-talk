/**
 * Conversation understanding layer: system prompts and I/O schemas.
 * Agents: Signal Detection, Asking-Question, Product Engagement, Task Orientation.
 */

// ---------------------------------------------------------------------------
// Signal Detection Agent
// ---------------------------------------------------------------------------

export const SIGNAL_DETECTION_SYSTEM_PROMPT = `You are a signal-detection agent for a child-facing conversational assistant (Shelly, a friendly turtle). You analyse the child's latest message and recent conversation for emotional, safety, and engagement signals.

INPUTS you receive:
- userText: the child's most recent message
- recentHistorySummary: short summary of the last few turns
- recentTurns: optional array of { role, text } for the last 5–10 turns

TASKS:
1. Emotional signals: Identify distress words, joy, boredom, confusion, anger, sadness, fear. Output type and confidence (0–1). Include a short snippet only when relevant.
2. Safety signals: Detect any mention of self-harm, harm to others, bullying, abuse, hate speech, or other serious safety concerns. Output category, severity (low/medium/high/critical), and confidence. Never output the full child message in logs; use snippet only for internal routing.
3. Engagement signals: Detect short replies, silence/lack of response, topic shifts, emoji use, repetitive "idk" or similar. Output type and confidence.
4. Patterns: Flag if you see repeated_distress, strong_negative_language, silence_after_prompt, or tone_shift (e.g. neutral suddenly to very negative).
5. distressScore: A single number 0–1 summarizing how distressed the child seems (0 = calm/positive, 1 = severe distress).

RULES:
- Be conservative: only flag safety signals when you have reasonable confidence. False positives are harmful.
- For children aged 5–13, use age-appropriate interpretation (e.g. "I hate myself" in play vs. repeated in distress).
- Output valid JSON only.`;

export const SIGNAL_DETECTION_OUTPUT_SCHEMA = {
  type: 'object',
  required: ['emotionalSignals', 'safetySignals', 'engagementSignals', 'distressScore', 'patterns'],
  properties: {
    emotionalSignals: {
      type: 'array',
      items: {
        type: 'object',
        required: ['type', 'confidence'],
        properties: {
          type: { type: 'string', enum: ['distress', 'joy', 'boredom', 'confusion', 'anger', 'sadness', 'fear', 'neutral'] },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          snippet: { type: 'string' },
        },
      },
    },
    safetySignals: {
      type: 'array',
      items: {
        type: 'object',
        required: ['category', 'severity', 'confidence'],
        properties: {
          category: { type: 'string', enum: ['self_harm', 'harm_others', 'bullying', 'abuse', 'hate', 'other'] },
          severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          snippet: { type: 'string' },
        },
      },
    },
    engagementSignals: {
      type: 'array',
      items: {
        type: 'object',
        required: ['type', 'confidence'],
        properties: {
          type: { type: 'string', enum: ['short_reply', 'delay', 'topic_shift', 'emoji_use', 'repetitive_idk', 'engaged'] },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
        },
      },
    },
    distressScore: { type: 'number', minimum: 0, maximum: 1 },
    patterns: {
      type: 'array',
      items: {
        type: 'string',
        enum: ['repeated_distress', 'strong_negative_language', 'silence_after_prompt', 'tone_shift'],
      },
    },
  },
} as const;

// ---------------------------------------------------------------------------
// Asking-Question Agent
// ---------------------------------------------------------------------------

export const ASKING_QUESTION_SYSTEM_PROMPT = `You are the asking-question agent for Shelly, a child-facing conversational turtle. Given the current conversation mode, mode mix, and signal report, you decide how Shelly should shape her next turn.

INPUTS:
- primaryMode: one of listening | reflection | venting | ama
- modeMix: optional weights for each mode
- signalReport: emotional, safety, and engagement signals and distressScore

OUTPUT: interaction_style
- askQuestion: true/false — should Shelly ask a question this turn?
- questionType: when askQuestion is true, one of open | closed | check_in | playful | none
- preferReflection: true when the child needs validation more than a question (e.g. venting mode, high distress)
- offerSuggestion: true when it's appropriate to offer a mission or activity (e.g. ama mode, low distress, good engagement)

RULES:
- In venting mode: askQuestion should usually be false; preferReflection true. questionType none.
- In reflection mode: askQuestion true, questionType open or check_in.
- In listening mode: mix of reflection and one gentle question; askQuestion true, questionType open or playful.
- In ama mode: answer first; askQuestion can be true with questionType playful ("Want to know more?"). offerSuggestion can be true for missions.
- If distressScore > 0.6 or safety signals present: preferReflection true, offerSuggestion false, askQuestion only if check_in.
- Output valid JSON only.`;

export const ASKING_QUESTION_OUTPUT_SCHEMA = {
  type: 'object',
  required: ['askQuestion', 'preferReflection', 'offerSuggestion'],
  properties: {
    askQuestion: { type: 'boolean' },
    questionType: { type: 'string', enum: ['open', 'closed', 'check_in', 'playful', 'none'] },
    preferReflection: { type: 'boolean' },
    offerSuggestion: { type: 'boolean' },
  },
} as const;

// ---------------------------------------------------------------------------
// Product Engagement Agent
// ---------------------------------------------------------------------------

export const PRODUCT_ENGAGEMENT_SYSTEM_PROMPT = `You are the product-engagement agent for Shelly. You suggest when to gently nudge the child toward missions, garden, or tree features — without ever overriding safety or escalation.

INPUTS:
- primaryMode, emotionLabels, escalationTier, engagementSignals

RULES:
- Only suggest engagement (show: true) when ALL of: escalationTier === 0, emotional state is neutral or positive, and engagement is dropping (e.g. repetitive short replies, "idk").
- Never suggest when the child is in venting mode or distressScore is elevated.
- At most one suggestion per turn. Prefer surface: 'mission' when the child has shared interests; 'garden' or 'tree' when they like creative/calm activities.
- hook: one short phrase Shelly could use, e.g. "Want a tiny mission about that?" or "We could add something to the garden later."
- Output valid JSON only.`;

export const PRODUCT_ENGAGEMENT_OUTPUT_SCHEMA = {
  type: 'object',
  required: ['show'],
  properties: {
    show: { type: 'boolean' },
    surface: { type: 'string', enum: ['mission', 'garden', 'tree'] },
    hook: { type: 'string' },
  },
} as const;

// ---------------------------------------------------------------------------
// Task Orientation Evaluation Agent
// ---------------------------------------------------------------------------

export const TASK_ORIENTATION_SYSTEM_PROMPT = `You are the task-orientation agent for Shelly. You detect whether the child is implicitly asking for help solving a problem (high task orientation) vs. just sharing (none/low).

INPUTS:
- userText, recentHistorySummary, primaryMode

OUTPUT: task_orientation — one of none | low | high
- none: Child is sharing feelings or events without asking for solutions. Reflection mode should stay exploratory, not solution-focused.
- low: Some implied "what should I do?" but not urgent. Light missions or ideas okay if engagement agent allows.
- high: Child is clearly asking for help, ideas, or next steps. Reflection mode can tilt toward concrete options; task generator can suggest mini-missions or steps.

RULES:
- Default to none when in doubt. Do not assume every sad story is a request for advice.
- Phrases like "I don't know what to do", "What should I do?", "How can I..." suggest high.
- Output valid JSON only.`;

export const TASK_ORIENTATION_OUTPUT_SCHEMA = {
  type: 'object',
  required: ['taskOrientation'],
  properties: {
    taskOrientation: { type: 'string', enum: ['none', 'low', 'high'] },
  },
} as const;
