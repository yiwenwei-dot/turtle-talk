import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { TTSProvider } from '../types';
import { speechConfig } from '../config';

// ---------------------------------------------------------------------------
// ElevenLabs TTS
// ---------------------------------------------------------------------------

export class ElevenLabsTTSProvider implements TTSProvider {
  private client: ElevenLabsClient;

  constructor(apiKey?: string) {
    this.client = new ElevenLabsClient({
      apiKey: apiKey ?? process.env.ELEVENLABS_API_KEY,
    });
  }

  async synthesize(text: string): Promise<ArrayBuffer> {
    const stream = await this.client.textToSpeech.convert(speechConfig.tts.voiceId, {
      text,
      modelId: speechConfig.tts.model,
      outputFormat: speechConfig.tts.outputFormat,
      languageCode: speechConfig.tts.languageCode,
      voiceSettings: speechConfig.tts.voiceSettings,
    });

    const reader = stream.getReader();
    const chunks: Buffer[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(Buffer.from(value));
    }
    return Buffer.concat(chunks).buffer;
  }
}

// ---------------------------------------------------------------------------
// Gemini TTS  (gemini-2.5-flash-preview-tts)
//
// Returns audio/wav from the Gemini TTS model.
// If the model returns raw PCM (audio/L16), we wrap it in a WAV header so
// AudioContext.decodeAudioData() can play it without extra dependencies.
// ---------------------------------------------------------------------------

const GEMINI_TTS_SAMPLE_RATE = 24000;

function pcmToWav(pcm: Buffer, sampleRate = GEMINI_TTS_SAMPLE_RATE, channels = 1, bitDepth = 16): Buffer {
  const byteRate = (sampleRate * channels * bitDepth) / 8;
  const blockAlign = (channels * bitDepth) / 8;
  const wav = Buffer.alloc(44 + pcm.length);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(36 + pcm.length, 4);
  wav.write('WAVE', 8);
  wav.write('fmt ', 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);          // PCM format
  wav.writeUInt16LE(channels, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(byteRate, 28);
  wav.writeUInt16LE(blockAlign, 32);
  wav.writeUInt16LE(bitDepth, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(pcm.length, 40);
  pcm.copy(wav, 44);
  return wav;
}

export class GeminiTTSProvider implements TTSProvider {
  private genAI: GoogleGenerativeAI;

  constructor(apiKey?: string) {
    this.genAI = new GoogleGenerativeAI(apiKey ?? process.env.GEMINI_API_KEY ?? '');
  }

  async synthesize(text: string): Promise<ArrayBuffer> {
    const modelId = speechConfig.tts.geminiModel;
    const model = this.genAI.getGenerativeModel({ model: modelId });

    // TTS model must receive a clear directive to output only audio (no text generation).
    const ttsPrompt = `Say the following aloud. Output only speech, no text: ${text}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (model as any).generateContent({
      contents: [{ role: 'user', parts: [{ text: ttsPrompt }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: speechConfig.tts.geminiVoice },
          },
        },
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const part = (result as any).response?.candidates?.[0]?.content?.parts?.[0];
    if (!part?.inlineData?.data) {
      throw new Error('Gemini TTS returned no audio data');
    }

    const audioBuffer = Buffer.from(part.inlineData.data, 'base64');
    const mimeType: string = part.inlineData.mimeType ?? '';

    console.log(`[GeminiTTS] mimeType="${mimeType}" bytes=${audioBuffer.byteLength}`);

    // Raw PCM needs a WAV header; wav can be returned as-is
    const finalBuffer = (mimeType.startsWith('audio/L16') || mimeType.startsWith('audio/pcm'))
      ? pcmToWav(audioBuffer)
      : audioBuffer;
    return finalBuffer.buffer.slice(finalBuffer.byteOffset, finalBuffer.byteOffset + finalBuffer.byteLength) as ArrayBuffer;
  }
}
