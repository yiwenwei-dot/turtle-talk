/**
 * Tattle Cards — data layer.
 *
 * Provides the TattleCard type, hardcoded defaults (used as fallback),
 * and async fetchers that pull from Supabase when available.
 */

export interface TattleCard {
  id: string;
  title: string;
  description: string;
  emoji: string;
  /** Optional grouping (e.g. "emotions", "social", "self"). */
  category?: string;
  /** Developmental skill this card targets (e.g. "Social Repair"). */
  skill?: string;
  /** Scenario context shown when display settings allow it. */
  scenario?: string;
  /** When false the card is hidden from the picker. Default true. */
  isActive?: boolean;
  /** Controls ordering in the picker grid. */
  sortOrder?: number;
}

export interface CardDisplaySettings {
  showSkill: boolean;
  showScenario: boolean;
  showCategory: boolean;
}

export const DEFAULT_DISPLAY_SETTINGS: CardDisplaySettings = {
  showSkill: false,
  showScenario: false,
  showCategory: false,
};

export const DEFAULT_TATTLE_CARDS: readonly TattleCard[] = [
  {
    id: 'fix-friend',
    emoji: '🧑‍🤝‍🧑',
    title: 'Friend problem',
    description: 'I had trouble with a friend',
    skill: 'Social Repair',
    scenario:
      'Sometimes friends argue, misunderstand each other, or say something that hurts feelings.',
    category: 'social',
    sortOrder: 0,
  },
  {
    id: 'tried-hard',
    emoji: '🎉',
    title: 'Proud moment',
    description: 'I tried something hard',
    skill: 'Growth Mindset',
    scenario:
      'Sometimes we try something new or difficult, even when we are not sure we will succeed.',
    category: 'self',
    sortOrder: 1,
  },
  {
    id: 'big-feelings',
    emoji: '😡',
    title: 'Big feelings',
    description: 'Something made me really upset',
    skill: 'Emotional Regulation',
    scenario: 'Sometimes we feel angry, frustrated, or overwhelmed.',
    category: 'emotions',
    sortOrder: 2,
  },
  {
    id: 'made-mistake',
    emoji: '😬',
    title: 'A mistake happened',
    description: "Something didn't go well",
    skill: 'Resilience Development',
    scenario:
      'Everyone makes mistakes sometimes. What matters is what we do next.',
    category: 'self',
    sortOrder: 3,
  },
  {
    id: 'helped-someone',
    emoji: '❤️',
    title: 'Kind moment',
    description: 'I helped someone or someone helped me',
    skill: 'Empathy / Connection',
    scenario: 'Kind actions help people feel connected and safe.',
    category: 'social',
    sortOrder: 4,
  },
  {
    id: 'big-wonder',
    emoji: '🤔',
    title: 'Big question',
    description: "Something I'm curious about",
    skill: 'Cognitive Development',
    scenario: 'Sometimes our minds are full of big questions.',
    category: 'self',
    sortOrder: 5,
  },
];

/**
 * Returns the active tattle cards (synchronous, hardcoded fallback).
 */
export function getTattleCards(): readonly TattleCard[] {
  return DEFAULT_TATTLE_CARDS.filter((c) => c.isActive !== false);
}

/**
 * Fetches tattle cards from Supabase. Falls back to hardcoded defaults on error.
 */
export async function fetchTattleCards(): Promise<readonly TattleCard[]> {
  try {
    const res = await fetch('/api/admin/tattle-cards', { cache: 'no-store' });
    if (!res.ok) return getTattleCards();
    const rows: TattleCard[] = await res.json();
    return rows.length > 0 ? rows : getTattleCards();
  } catch {
    return getTattleCards();
  }
}

/**
 * Fetches display settings from Supabase. Falls back to defaults on error.
 */
export async function fetchCardDisplaySettings(): Promise<CardDisplaySettings> {
  try {
    const res = await fetch('/api/admin/tattle-cards/display-settings', {
      cache: 'no-store',
    });
    if (!res.ok) return DEFAULT_DISPLAY_SETTINGS;
    return await res.json();
  } catch {
    return DEFAULT_DISPLAY_SETTINGS;
  }
}
