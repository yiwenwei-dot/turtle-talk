import type { GuardrailAgent, GuardrailResult } from './types';
import { INPUT_SAFETY_PROMPT, OUTPUT_SAFETY_PROMPT } from './prompts';

/**
 * LLMGuardrail — optional deep safety checker.
 *
 * This class is intentionally a stub: it defines the natural-language prompts
 * used for classification, but does not yet call a specific LLM. When you are
 * ready to enable it, wire INPUT_SAFETY_PROMPT / OUTPUT_SAFETY_PROMPT into a
 * small classifier client here and register the guardrail alongside
 * ChildSafeGuardrail in SpeechService.
 */
export class LLMGuardrail implements GuardrailAgent {
  readonly name = 'LLMGuardrail';

  async checkInput(text: string): Promise<GuardrailResult> {
    void text;
    void INPUT_SAFETY_PROMPT;
    // TODO: call LLM with INPUT_SAFETY_PROMPT and the child's message.
    return { safe: true };
  }

  async checkOutput(text: string): Promise<GuardrailResult> {
    void text;
    void OUTPUT_SAFETY_PROMPT;
    // TODO: call LLM with OUTPUT_SAFETY_PROMPT and Shelly's reply.
    return { safe: true };
  }
}
