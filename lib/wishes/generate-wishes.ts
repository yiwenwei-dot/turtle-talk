/**
 * AI-generated wish options for a child.
 * Uses the same LLM config as speech chat; returns 5 { label, theme_slug } for a round.
 */
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { speechConfig } from '@/lib/speech/config';
import { WISH_THEME_SLUGS } from '@/lib/wishes/thematic-areas';
import type { WishThemeSlug } from '@/lib/wishes/thematic-areas';

export interface GeneratedWishOption {
  label: string;
  theme_slug: WishThemeSlug;
}

const THEME_LIST = WISH_THEME_SLUGS.join(', ');

function getModel() {
  const provider = speechConfig.chat.provider;
  if (provider === 'openai') {
    return new ChatOpenAI({
      model: speechConfig.chat.openaiModel,
      apiKey: process.env.OPENAI_API_KEY,
      maxTokens: 400,
    });
  }
  if (provider === 'gemini') {
    return new ChatGoogleGenerativeAI({
      model: speechConfig.chat.geminiModel,
      apiKey: process.env.GEMINI_API_KEY,
      maxOutputTokens: 400,
    });
  }
  return new ChatAnthropic({
    model: speechConfig.chat.anthropicModel,
    apiKey: process.env.ANTHROPIC_API_KEY,
    maxTokens: 400,
  });
}

/**
 * Generate 5 wish options. Uses LLM; themes from thematic-areas.
 * Falls back to template labels if LLM fails or is not configured.
 *
 * - previousLabels: avoid suggesting same/similar wishes (e.g. from past rounds).
 * - favoriteTopics: short phrases about things this child likes (from child memory).
 */
export async function generateWishOptions(
  previousLabels?: string[],
  favoriteTopics?: string[],
): Promise<GeneratedWishOption[]> {
  const boundedPrevious = (previousLabels ?? []).slice(0, 15).filter(Boolean);
  const previousLine =
    boundedPrevious.length > 0
      ? `Do not suggest wishes that are the same or very similar to these already chosen: ${boundedPrevious.join('; ')}.`
      : '';

  const boundedFavorites = (favoriteTopics ?? [])
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 8);
  const favoritesLine =
    boundedFavorites.length > 0
      ? `This child especially loves or talks about: ${boundedFavorites.join(
          ', ',
        )}. When it fits, prefer wishes that connect to these favourite things (for example, if they love dinosaurs, a dinosaur book or trip to a museum).`
      : '';

  const system = `You generate short wish ideas for a child aged 5-13. Reply with exactly 5 lines. Each line must be in this format: theme_slug: wish label
Allowed theme_slug values (use exactly these): ${THEME_LIST}
Use a mix of themes. Keep each wish label under 50 characters, friendly and concrete (e.g. "A new LEGO set", "Go to the cinema to see a movie").${previousLine ? ` ${previousLine}` : ''}${
    favoritesLine ? ` ${favoritesLine}` : ''
  }`;

  const human = 'Generate 5 wish ideas now, one per line, format: theme_slug: label';

  try {
    const model = getModel();
    const response = await model.invoke([
      new SystemMessage(system),
      new HumanMessage(human),
    ]);
    const content = typeof response.content === 'string' ? response.content : String(response.content ?? '');
    const lines = content
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 5);

    const parsed: GeneratedWishOption[] = [];
    for (const line of lines) {
      const colon = line.indexOf(':');
      if (colon === -1) continue;
      const theme_slug = line.slice(0, colon).trim().toLowerCase().replace(/\s+/g, '-') as WishThemeSlug;
      const label = line.slice(colon + 1).trim().slice(0, 200);
      if (!label) continue;
      const validTheme = WISH_THEME_SLUGS.includes(theme_slug) ? theme_slug : 'other';
      parsed.push({ label, theme_slug: validTheme });
    }
    if (parsed.length >= 5) return parsed;
    // Pad with fallbacks if LLM returned fewer
    const fallbacks: GeneratedWishOption[] = [
      { label: 'A new toy', theme_slug: 'toys' },
      { label: 'A movie night', theme_slug: 'movies' },
      { label: 'A special Christmas present', theme_slug: 'christmas-present' },
      { label: 'A new book', theme_slug: 'books' },
      { label: 'A new game', theme_slug: 'games' },
    ];
    for (let i = parsed.length; i < 5; i++) {
      parsed.push(fallbacks[i] ?? fallbacks[0]);
    }
    return parsed.slice(0, 5);
  } catch (err) {
    console.error('[generateWishOptions]', err);
    return [
      { label: 'A new toy', theme_slug: 'toys' },
      { label: 'A movie night', theme_slug: 'movies' },
      { label: 'A special Christmas present', theme_slug: 'christmas-present' },
      { label: 'A new book', theme_slug: 'books' },
      { label: 'A new game', theme_slug: 'games' },
    ];
  }
}
