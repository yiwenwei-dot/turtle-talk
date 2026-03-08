/**
 * First greeting instruction for Shelly when a new voice session starts.
 * Used by the LiveKit agent so the very first message is warm and focused.
 */
export function getFirstMessageInstruction(childName?: string | null): string {
  if (childName && childName.trim()) {
    const name = childName.trim();
    return `Greet ${name} warmly and ask how they are or what they did today. One sentence and one question.`;
  }
  return 'Greet them as a little explorer warmly and ask how they are or what they did today. One sentence and one question.';
}

