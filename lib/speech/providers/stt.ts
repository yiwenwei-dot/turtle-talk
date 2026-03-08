import OpenAI from 'openai';
import { toFile } from 'openai/uploads';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { STTProvider } from '../types';
import { speechConfig } from '../config';

// ---------------------------------------------------------------------------
// OpenAI STT (Whisper / gpt-4o-mini-transcribe)
// ---------------------------------------------------------------------------

export class OpenAISTTProvider implements STTProvider {
  private client: OpenAI;

  constructor(apiKey?: string) {
    this.client = new OpenAI({ apiKey: apiKey ?? process.env.OPENAI_API_KEY });
  }

  async transcribe(audio: Blob): Promise<string> {
    const arrayBuffer = await audio.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = audio.type || 'audio/webm';
    const ext = mimeType.startsWith('audio/ogg') ? 'ogg'
      : mimeType.startsWith('audio/mp4') ? 'mp4'
      : mimeType.startsWith('audio/wav') ? 'wav'
      : 'webm';
    const file = await toFile(buffer, `audio.${ext}`, { type: mimeType });

    const transcription = await this.client.audio.transcriptions.create({
      file,
      model: speechConfig.stt.model,
      language: 'en', // force English — prevents Whisper from auto-detecting wrong language
    });

    const text = transcription.text ?? '';
    return text;
  }
}

// ---------------------------------------------------------------------------
// Gemini STT  (gemini-2.0-flash-lite with inline audio input)
// ---------------------------------------------------------------------------

export class GeminiSTTProvider implements STTProvider {
  private genAI: GoogleGenerativeAI;

  constructor(apiKey?: string) {
    this.genAI = new GoogleGenerativeAI(apiKey ?? process.env.GEMINI_API_KEY ?? '');
  }

  /** True if the error looks like a transient 503 / high demand from Gemini. */
  private static isRetryable503(err: unknown): boolean {
    const msg = err instanceof Error ? err.message : String(err);
    return (
      msg.includes('503') ||
      msg.includes('Service Unavailable') ||
      msg.includes('high demand') ||
      msg.includes('temporary')
    );
  }

  async transcribe(audio: Blob): Promise<string> {
    const arrayBuffer = await audio.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = (audio.type || 'audio/webm') as string;

    const model = this.genAI.getGenerativeModel({ model: speechConfig.stt.geminiModel });
    const prompt =
      'Transcribe the English speech in this audio clip. Return only the spoken words with no punctuation corrections, labels, or commentary. If there is no speech or only silence, return an empty string.';

    const readText = (result: Awaited<ReturnType<typeof model.generateContent>>): string => {
      try {
        const t = result.response.text();
        return (t ?? '').trim();
      } catch (e) {
        return '';
      }
    };

    try {
      const result = await model.generateContent([
        { inlineData: { mimeType, data: base64 } },
        prompt,
      ]);
      const text = readText(result);
      return text;
    } catch (firstErr) {
      if (!GeminiSTTProvider.isRetryable503(firstErr)) throw firstErr;
      await new Promise((r) => setTimeout(r, 1500));
      const result = await model.generateContent([
        { inlineData: { mimeType, data: base64 } },
        prompt,
      ]);
      const text = readText(result);
      return text;
    }
  }
}
