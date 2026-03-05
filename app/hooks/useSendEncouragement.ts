'use client';

export function useSendEncouragement(childId: string | null | undefined) {
  const send = async (emoji: string): Promise<{ id: string } | null> => {
    if (!childId) return null;
    const res = await fetch('/api/parent/encouragement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ childId, emoji }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to send');
    return data.item ?? null;
  };
  return { send };
}
