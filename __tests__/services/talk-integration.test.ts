/**
 * Integration tests for the full Tammy talk pipeline:
 *   STT → guardrails → LLM (with tools) → guardrails → TTS
 *
 * Uses:
 *   - Mock STT and TTS providers (pure unit isolation)
 *   - Real ChildSafeGuardrail
 *   - Mock GeminiChatProvider responses (tool calls as Gemini would return them)
 *   - SpeechService orchestrator
 */

import { SpeechService } from '@/lib/speech/SpeechService';
import { ChildSafeGuardrail } from '@/lib/speech/guardrails/ChildSafeGuardrail';
import type { STTProvider, TTSProvider, ChatProvider, ConversationContext, MissionSuggestion } from '@/lib/speech/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSTT(text = 'I love turtles!'): jest.Mocked<STTProvider> {
  return { transcribe: jest.fn().mockResolvedValue(text) };
}

function makeTTS(audio = new ArrayBuffer(16)): jest.Mocked<TTSProvider> {
  return { synthesize: jest.fn().mockResolvedValue(audio) };
}

/** Simulates what GeminiChatProvider.chat() returns after tool-call parsing */
function makeGeminiChat(overrides: Partial<Awaited<ReturnType<ChatProvider['chat']>>> = {}): jest.Mocked<ChatProvider> {
  const defaults = {
    text: 'Wow, a turtle! What is your favourite ocean animal?',
    mood: 'happy' as const,
    missionChoices: undefined,
    endConversation: false,
    childName: undefined,
    topic: undefined,
    missionProgressNote: undefined,
  };
  return { chat: jest.fn().mockResolvedValue({ ...defaults, ...overrides }) };
}

const baseCtx: ConversationContext = {
  messages: [],
  childName: undefined,
  topics: [],
  difficultyProfile: 'beginner',
  activeMission: null,
};

const sampleMissions: MissionSuggestion[] = [
  { title: 'Say hello to someone new', description: 'Greet one new person today', theme: 'kind', difficulty: 'easy' },
  { title: 'Tell a joke', description: 'Make a friend laugh with a joke', theme: 'social', difficulty: 'medium' },
  { title: 'Write a story', description: 'Write a 5-sentence story about an ocean animal', theme: 'creative', difficulty: 'stretch' },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Talk pipeline: STT → guardrails → LLM (tools) → guardrails → TTS', () => {
  describe('happy path', () => {
    it('processes safe child input end-to-end', async () => {
      const stt = makeSTT('I love turtles!');
      const chat = makeGeminiChat({ text: 'Me too! What colour is your favourite turtle?', mood: 'happy' });
      const tts = makeTTS();
      const service = new SpeechService({ stt, tts, chat, guardrails: [new ChildSafeGuardrail()] });

      const result = await service.process(new Blob(['audio']), baseCtx);

      expect(stt.transcribe).toHaveBeenCalledTimes(1);
      expect(chat.chat).toHaveBeenCalledWith('I love turtles!', baseCtx);
      expect(tts.synthesize).toHaveBeenCalledWith('Me too! What colour is your favourite turtle?');
      expect(result.userText).toBe('I love turtles!');
      expect(result.mood).toBe('happy');
      expect(result.responseAudio).toBeInstanceOf(ArrayBuffer);
    });

    it('processToText runs full STT→guardrail→chat→guardrail without TTS', async () => {
      const stt = makeSTT('I like fish!');
      const chat = makeGeminiChat({ text: 'Fish are amazing! What fish do you like?', mood: 'curious' });
      const tts = makeTTS();
      const service = new SpeechService({ stt, tts, chat, guardrails: [new ChildSafeGuardrail()] });

      const result = await service.processToText(new Blob(['audio']), baseCtx);

      expect(tts.synthesize).not.toHaveBeenCalled();
      expect(result.responseText).toBe('Fish are amazing! What fish do you like?');
      expect(result.mood).toBe('curious');
    });
  });

  describe('guardrail blocking', () => {
    it('blocks unsafe child input — LLM never called', async () => {
      const stt = makeSTT('I want to kill my sister');
      const chat = makeGeminiChat();
      const tts = makeTTS();
      const service = new SpeechService({ stt, tts, chat, guardrails: [new ChildSafeGuardrail()] });

      const result = await service.process(new Blob(['audio']), baseCtx);

      expect(chat.chat).not.toHaveBeenCalled();
      expect(result.mood).toBe('confused');
      expect(result.responseText).toContain("Let's talk about something else");
    });

    it('blocks profanity in child input', async () => {
      const stt = makeSTT('that was shit');
      const chat = makeGeminiChat();
      const tts = makeTTS();
      const service = new SpeechService({ stt, tts, chat, guardrails: [new ChildSafeGuardrail()] });

      const result = await service.process(new Blob(['audio']), baseCtx);

      expect(chat.chat).not.toHaveBeenCalled();
      expect(result.mood).toBe('confused');
    });

    it('blocks unsafe LLM output — uses fallback response', async () => {
      const stt = makeSTT('what should I do?');
      const chat = makeGeminiChat({ text: 'You should drink alcohol and use a gun' });
      const tts = makeTTS();
      const service = new SpeechService({ stt, tts, chat, guardrails: [new ChildSafeGuardrail()] });

      const result = await service.process(new Blob(['audio']), baseCtx);

      expect(result.mood).toBe('confused');
      expect(result.responseText).toContain("Let's talk about something else");
    });
  });

  describe('tool: report_mood', () => {
    it.each(['happy', 'sad', 'confused', 'surprised', 'talking'] as const)(
      'passes mood "%s" from LLM through to result',
      async (mood) => {
        const stt = makeSTT('Hello');
        const chat = makeGeminiChat({ mood });
        const tts = makeTTS();
        const service = new SpeechService({ stt, tts, chat });

        const result = await service.process(new Blob(['audio']), baseCtx);
        expect(result.mood).toBe(mood);
      },
    );
  });

  describe('tool: propose_missions + end_conversation', () => {
    it('forwards mission choices when LLM calls propose_missions', async () => {
      const stt = makeSTT('Bye!');
      const chat = makeGeminiChat({ text: 'Goodbye!', endConversation: true, missionChoices: sampleMissions });
      const tts = makeTTS();
      const service = new SpeechService({ stt, tts, chat, guardrails: [new ChildSafeGuardrail()] });

      const result = await service.processToText(new Blob(['audio']), baseCtx);

      expect(result.endConversation).toBe(true);
      expect(result.missionChoices).toHaveLength(3);
      expect(result.missionChoices![0].difficulty).toBe('easy');
      expect(result.missionChoices![2].difficulty).toBe('stretch');
    });

    it('missionChoices absent on normal turns', async () => {
      const stt = makeSTT('Hello!');
      const chat = makeGeminiChat({ missionChoices: undefined, endConversation: false });
      const tts = makeTTS();
      const service = new SpeechService({ stt, tts, chat });

      const result = await service.processToText(new Blob(['audio']), baseCtx);

      expect(result.missionChoices).toBeUndefined();
      expect(result.endConversation).toBeFalsy();
    });

    it('missionChoices absent when guardrail blocks (even if LLM would have proposed them)', async () => {
      const stt = makeSTT('I want to hurt myself');
      const chat = makeGeminiChat({ missionChoices: sampleMissions, endConversation: true });
      const tts = makeTTS();
      const service = new SpeechService({ stt, tts, chat, guardrails: [new ChildSafeGuardrail()] });

      const result = await service.processToText(new Blob(['audio']), baseCtx);

      expect(chat.chat).not.toHaveBeenCalled();
      expect(result.missionChoices).toBeUndefined();
    });
  });

  describe('tool: note_child_info', () => {
    it('forwards childName when LLM detects name', async () => {
      const stt = makeSTT("My name is Emma");
      const chat = makeGeminiChat({ childName: 'Emma', topic: 'introduction' });
      const tts = makeTTS();
      const service = new SpeechService({ stt, tts, chat, guardrails: [new ChildSafeGuardrail()] });

      const result = await service.processToText(new Blob(['audio']), baseCtx);

      expect(result.childName).toBe('Emma');
      expect(result.topic).toBe('introduction');
    });

    it('childName absent when LLM does not detect name', async () => {
      const stt = makeSTT('I love swimming');
      const chat = makeGeminiChat({ childName: undefined, topic: 'swimming' });
      const tts = makeTTS();
      const service = new SpeechService({ stt, tts, chat });

      const result = await service.processToText(new Blob(['audio']), baseCtx);

      expect(result.childName).toBeUndefined();
      expect(result.topic).toBe('swimming');
    });
  });

  describe('tool: acknowledge_mission_progress', () => {
    it('forwards missionProgressNote when child mentions active challenge', async () => {
      const stt = makeSTT("I said hello to someone new today!");
      const chat = makeGeminiChat({ missionProgressNote: 'Child greeted a new person' });
      const tts = makeTTS();
      const ctxWithMission: ConversationContext = {
        ...baseCtx,
        activeMission: { title: 'Say hello to someone new', description: 'Greet one new person today', theme: 'kind', difficulty: 'easy' },
      };
      const service = new SpeechService({ stt, tts, chat, guardrails: [new ChildSafeGuardrail()] });

      const result = await service.processToText(new Blob(['audio']), ctxWithMission);

      expect(result.missionProgressNote).toBe('Child greeted a new person');
    });
  });

  describe('empty transcription', () => {
    it('returns idle sentinel without calling LLM when STT returns empty', async () => {
      const stt = makeSTT('');
      const chat = makeGeminiChat();
      const tts = makeTTS();
      const service = new SpeechService({ stt, tts, chat, guardrails: [new ChildSafeGuardrail()] });

      const result = await service.processToText(new Blob(['audio']), baseCtx);

      expect(chat.chat).not.toHaveBeenCalled();
      expect(result.userText).toBe('');
      expect(result.responseText).toBe('');
      expect(result.mood).toBe('idle');
    });
  });

  describe('conversation context forwarding', () => {
    it('passes childName and topics from context to LLM', async () => {
      const stt = makeSTT('Tell me about fish');
      const chat = makeGeminiChat();
      const tts = makeTTS();
      const ctxWithMemory: ConversationContext = {
        messages: [{ role: 'user', content: 'Hi' }, { role: 'assistant', content: 'Hello!' }],
        childName: 'Liam',
        topics: ['dinosaurs', 'space'],
        difficultyProfile: 'intermediate',
        activeMission: null,
      };
      const service = new SpeechService({ stt, tts, chat });

      await service.processToText(new Blob(['audio']), ctxWithMemory);

      expect(chat.chat).toHaveBeenCalledWith('Tell me about fish', ctxWithMemory);
    });
  });

  describe('error propagation', () => {
    it('throws SpeechServiceError with stage=stt on STT failure', async () => {
      const stt = makeSTT();
      stt.transcribe.mockRejectedValue(new Error('Gemini STT quota exceeded'));
      const chat = makeGeminiChat();
      const tts = makeTTS();
      const service = new SpeechService({ stt, tts, chat });

      await expect(service.process(new Blob(['audio']), baseCtx)).rejects.toMatchObject({
        name: 'SpeechServiceError',
        stage: 'stt',
      });
    });

    it('throws SpeechServiceError with stage=chat on LLM failure', async () => {
      const stt = makeSTT();
      const chat = makeGeminiChat();
      chat.chat.mockRejectedValue(new Error('[gemini/gemini-2.0-flash] 429 Resource exhausted'));
      const tts = makeTTS();
      const service = new SpeechService({ stt, tts, chat });

      await expect(service.process(new Blob(['audio']), baseCtx)).rejects.toMatchObject({
        name: 'SpeechServiceError',
        stage: 'chat',
      });
    });

    it('throws SpeechServiceError with stage=tts on TTS failure', async () => {
      const stt = makeSTT();
      const chat = makeGeminiChat();
      const tts = makeTTS();
      tts.synthesize.mockRejectedValue(new Error('Gemini TTS returned no audio data'));
      const service = new SpeechService({ stt, tts, chat });

      await expect(service.process(new Blob(['audio']), baseCtx)).rejects.toMatchObject({
        name: 'SpeechServiceError',
        stage: 'tts',
      });
    });
  });
});
