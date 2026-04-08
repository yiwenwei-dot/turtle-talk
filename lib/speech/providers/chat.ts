/**
 * Shelly — mission-aware conversation agent.
 *
 * Architecture: instead of a single withStructuredOutput blob, the agent
 * uses individual bound tools so each concern is separate and inspectable:
 *
 *   report_mood              — required every turn (sets the turtle face)
 *   propose_missions         — offers 3 graded challenges (mid-conversation or at wrap-up)
 *   end_conversation         — signals conversation end (after child reacts to missions)
 *   acknowledge_mission_progress — optional, when child mentions their active challenge
 *   note_child_info          — optional, records child's name and turn topic
 */

import { z } from 'zod';
import { tool } from '@langchain/core/tools';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import type { ChatProvider, ChatResponse, ConversationContext, MissionSuggestion, MissionTheme, TurtleMood } from '../types';
import { speechConfig } from '../config';
import { buildSystemPrompt } from '../prompts';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const MOOD_VALUES = ['idle', 'listening', 'talking', 'happy', 'sad', 'confused', 'surprised'] as const;
const THEME_VALUES = ['brave', 'kind', 'calm', 'confident', 'creative', 'social', 'curious'] as const;
const DIFF_VALUES = ['easy', 'medium', 'stretch'] as const;

const VALID_MOODS = [...MOOD_VALUES] as TurtleMood[];
const VALID_THEMES = [...THEME_VALUES] as MissionTheme[];

const missionItemSchema = z.object({
  title: z.string().describe("Mission title — short, exciting, child-friendly"),
  description: z.string().describe("1 sentence, friendly, actionable for a child aged 5-13"),
  theme: z.enum(THEME_VALUES),
  difficulty: z.enum(DIFF_VALUES),
});

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

const reportMoodTool = tool(
  async () => '', // executor not used — we read tool_calls from the response
  {
    name: 'report_mood',
    description: "Set Shelly's current emotional state. You MUST call this every single turn.",
    schema: z.object({
      mood: z.enum(MOOD_VALUES).describe('Turtle mood for this response'),
    }),
  },
);

const proposeMissionsTool = tool(
  async () => '',
  {
    name: 'propose_missions',
    description:
      'Offer the child exactly 3 graded challenges — one easy, one medium, one stretch. ' +
      'Call this when you want to offer missions — either during the conversation at a natural moment, or when wrapping up. ' +
      'Missions should relate to what you discussed. You do NOT need to end the conversation just because you proposed missions.',
    schema: z.object({
      choices: z
        .array(missionItemSchema)
        .length(3)
        .describe('Exactly 3 missions: [easy, medium, stretch]'),
    }),
  },
);

const endConversationTool = tool(
  async () => '',
  {
    name: 'end_conversation',
    description:
      'Signal the conversation has reached a warm, natural close. ' +
      'Call this only after the child has had a chance to react to proposed missions (if any) and the conversation feels complete. ' +
      'Say a warm goodbye that references what you talked about before calling this.',
    schema: z.object({}),
  },
);

const acknowledgeMissionProgressTool = tool(
  async () => '',
  {
    name: 'acknowledge_mission_progress',
    description:
      "Call when the child mentions working on or completing their active challenge. " +
      "Celebrate their effort warmly.",
    schema: z.object({
      note: z.string().describe('Brief note on what the child shared about their progress'),
    }),
  },
);

const noteChildInfoTool = tool(
  async () => '',
  {
    name: 'note_child_info',
    description:
      "Record the child's first name if they just mentioned it, and the main topic of this exchange.",
    schema: z.object({
      childName: z.string().optional().describe("Child's name if just introduced"),
      topic: z.string().optional().describe('2-4 word phrase describing the main subject'),
    }),
  },
);

const AGENT_TOOLS = [
  reportMoodTool,
  proposeMissionsTool,
  endConversationTool,
  acknowledgeMissionProgressTool,
  noteChildInfoTool,
];

// ---------------------------------------------------------------------------
// Response parsing
// ---------------------------------------------------------------------------

function parseMissionChoices(raw: unknown): MissionSuggestion[] | undefined {
  if (!Array.isArray(raw) || raw.length < 3) return undefined;
  const validated = raw.slice(0, 3).map((item) => {
    if (!item || typeof item !== 'object') return null;
    const m = item as Record<string, unknown>;
    if (typeof m.title !== 'string' || typeof m.description !== 'string') return null;
    const theme = VALID_THEMES.includes(m.theme as MissionTheme) ? (m.theme as MissionTheme) : 'curious';
    const diff = DIFF_VALUES.includes(m.difficulty as 'easy') ? (m.difficulty as 'easy') : 'easy';
    return { title: m.title, description: m.description, theme, difficulty: diff } satisfies MissionSuggestion;
  });
  if (validated.some((c) => !c)) return undefined;
  return validated as MissionSuggestion[];
}

/** Extract text from a single content block (LangChain can use .text, .content, or type+'text'). */
function textFromBlock(part: unknown): string {
  if (typeof part === 'string') return part.trim();
  if (!part || typeof part !== 'object') return '';
  const p = part as Record<string, unknown>;
  if (typeof p.text === 'string') return p.text.trim();
  if (typeof p.content === 'string') return p.content.trim();
  // Some integrations use type: 'text' with content or text
  if (p.type === 'text') {
    if (typeof p.text === 'string') return p.text.trim();
    if (typeof p.content === 'string') return p.content.trim();
  }
  return '';
}

function extractTextContent(content: unknown): string {
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    const parts: string[] = [];
    for (const c of content) {
      const t = textFromBlock(c);
      if (t) parts.push(t);
    }
    return parts.join(' ').trim();
  }
  return '';
}

/** Try to get text from Gemini-style response (e.g. additional_kwargs.candidates). */
function extractTextFromGeminiFallback(response: { content?: unknown; additional_kwargs?: Record<string, unknown> }): string {
  const kw = response.additional_kwargs;
  if (!kw || typeof kw !== 'object') return '';

  const candidates = kw.candidates as Array<{ content?: { parts?: Array<{ text?: string }> } }> | undefined;
  if (!Array.isArray(candidates) || candidates.length === 0) return '';

  const parts: string[] = [];
  for (const cand of candidates) {
    const content = cand?.content;
    const partList = content?.parts;
    if (!Array.isArray(partList)) continue;
    for (const p of partList) {
      if (p && typeof p.text === 'string') parts.push(p.text.trim());
    }
  }
  return parts.join(' ').trim();
}

// ---------------------------------------------------------------------------
// Base agent class
// ---------------------------------------------------------------------------

abstract class BaseChatProvider implements ChatProvider {
  protected model: BaseChatModel;

  constructor(model: BaseChatModel) {
    this.model = model;
  }

  async chat(input: string, ctx: ConversationContext): Promise<ChatResponse> {
    const systemContent = buildSystemPrompt(ctx);

    // Current turn: the child's words from STT. This MUST be the last message so the model responds to it.
    const currentTurnFromChild = typeof input === 'string' ? input.trim() : '';
    const messages = [
      new SystemMessage(systemContent),
      ...ctx.messages.map((m) =>
        m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content),
      ),
      new HumanMessage(currentTurnFromChild || input),
    ];

    // bindTools exists on ChatAnthropic/ChatOpenAI but not typed on the base class
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const modelWithTools = (this.model as any).bindTools(AGENT_TOOLS);
    const response = await modelWithTools.invoke(messages);

    // --- Extract spoken text (Gemini often returns only tool_calls with empty content; use fallbacks) ---
    let text = extractTextContent(response.content);
    if (!text.trim() && this instanceof GeminiChatProvider) {
      const fallback = extractTextFromGeminiFallback(response as { content?: unknown; additional_kwargs?: Record<string, unknown> });
      if (fallback.trim()) text = fallback;
    }
    const llmExtractedText = text;

    // --- Parse tool calls (needed before we may synthesize reply) ---
    let mood: TurtleMood = 'talking';
    let missionChoices: MissionSuggestion[] | undefined;
    let endConversation = false;
    let childName: string | undefined;
    let topic: string | undefined;
    let missionProgressNote: string | undefined;

    for (const tc of (response.tool_calls ?? [])) {
      switch (tc.name) {
        case 'report_mood': {
          const m = tc.args?.mood as string;
          if (VALID_MOODS.includes(m as TurtleMood)) mood = m as TurtleMood;
          break;
        }
        case 'propose_missions': {
          missionChoices = parseMissionChoices(tc.args?.choices);
          break;
        }
        case 'end_conversation': {
          endConversation = true;
          break;
        }
        case 'acknowledge_mission_progress': {
          missionProgressNote = typeof tc.args?.note === 'string' ? tc.args.note : undefined;
          break;
        }
        case 'note_child_info': {
          if (typeof tc.args?.childName === 'string' && tc.args.childName.trim()) {
            childName = tc.args.childName.trim();
          }
          if (typeof tc.args?.topic === 'string' && tc.args.topic.trim()) {
            topic = tc.args.topic.trim();
          }
          break;
        }
      }
    }

    // When the LLM returns only tool_calls and no text (e.g. Gemini with tools), use one generic fallback
    // so we never loop "I'm listening! Tell me more." — one neutral phrase for all empty responses.
    const isFallback = !text.trim();
    if (isFallback) {
      text = "I didn't quite catch that. Can you say it again?";
    }

    return { text, mood, missionChoices, endConversation, childName, topic, missionProgressNote };
  }
}

// ---------------------------------------------------------------------------
// Concrete providers
// ---------------------------------------------------------------------------

export class AnthropicChatProvider extends BaseChatProvider {
  constructor(apiKey?: string) {
    super(
      new ChatAnthropic({
        model: speechConfig.chat.anthropicModel,
        apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY,
        maxTokens: speechConfig.chat.maxTokens,
      }),
    );
  }
}

export class OpenAIChatProvider extends BaseChatProvider {
  constructor(apiKey?: string) {
    super(
      new ChatOpenAI({
        model: speechConfig.chat.openaiModel,
        apiKey: apiKey ?? process.env.OPENAI_API_KEY,
        maxTokens: speechConfig.chat.maxTokens,
      }),
    );
  }
}

export class GeminiChatProvider extends BaseChatProvider {
  constructor(apiKey?: string) {
    super(
      new ChatGoogleGenerativeAI({
        model: speechConfig.chat.geminiModel,
        apiKey: apiKey ?? process.env.GEMINI_API_KEY,
        maxOutputTokens: speechConfig.chat.maxTokens,
      }),
    );
  }
}

export function createChatProvider(name: 'anthropic' | 'openai' | 'gemini' = 'anthropic'): ChatProvider {
  if (name === 'openai') return new OpenAIChatProvider();
  if (name === 'gemini') return new GeminiChatProvider();
  return new AnthropicChatProvider();
}
