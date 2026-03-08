import type { GuardrailAgent, GuardrailResult } from './types';
import { BLOCKED_PATTERNS, MAX_OUTPUT_LENGTH } from './patterns';

function containsBlocked(text: string): string | null {
  for (const pattern of BLOCKED_PATTERNS) {
    const match = text.match(pattern);
    if (match) return match[0];
  }
  return null;
}

export class ChildSafeGuardrail implements GuardrailAgent {
  readonly name = 'ChildSafeGuardrail';

  async checkInput(text: string): Promise<GuardrailResult> {
    const blocked = containsBlocked(text);
    if (blocked) {
      return { safe: false, reason: `Blocked term detected: "${blocked}"` };
    }
    return { safe: true };
  }

  async checkOutput(text: string): Promise<GuardrailResult> {
    const blocked = containsBlocked(text);
    if (blocked) {
      return { safe: false, reason: `Output contains blocked term: "${blocked}"` };
    }
    if (text.length > MAX_OUTPUT_LENGTH) {
      const sanitized = text.slice(0, MAX_OUTPUT_LENGTH).trimEnd() + '...';
      return { safe: true, sanitized };
    }
    return { safe: true };
  }
}
