/**
 * Natural-language prompts for LLM-based guardrails.
 * These are not wired to any particular model yet; LLMGuardrail can consume
 * them when a classification client is available.
 */

export const INPUT_SAFETY_PROMPT = `
You are a content safety checker for TurtleTalk, a voice app for children aged 5–13.

Task: Decide if the CHILD'S MESSAGE is safe for a child audience.

Consider:
- Violence or self-harm
- Adult or sexual content
- Strong profanity or slurs
- Drugs, alcohol, or other substances

Reply in JSON with:
  { "label": "SAFE" | "UNSAFE", "reason": string }
`.trim();

export const OUTPUT_SAFETY_PROMPT = `
You are a content safety checker for TurtleTalk, a voice app for children aged 5–13.

Task: Decide if SHELLY'S REPLY is safe and appropriate for a child audience.

Consider:
- Violence or self-harm
- Adult or sexual content
- Strong profanity or slurs
- Drugs, alcohol, or other substances
- Tone and length (keep it gentle, short, and child-appropriate)

Reply in JSON with:
  { "label": "SAFE" | "UNSAFE", "reason": string }
`.trim();

