/** Regex-based patterns for fast child-safety checks. */

export const BLOCKED_PATTERNS: RegExp[] = [
  // Violence
  /\b(kill|murder|stab|shoot|weapon|gun|knife|bomb|explode|violence|blood|gore)\b/i,
  // Adult content
  /\b(sex|porn|nude|naked|adult|xxx)\b/i,
  // Profanity (common)
  /\b(fuck|shit|damn|ass|bitch|bastard|crap|hell)\b/i,
  // Self-harm
  /\b(suicide|self.?harm|cut myself|hurt myself|die)\b/i,
  // Substances
  /\b(drug|alcohol|beer|wine|vodka|cocaine|marijuana|weed)\b/i,
];

export const MAX_OUTPUT_LENGTH = 500;

