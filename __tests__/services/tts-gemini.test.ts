/**
 * @jest-environment node
 *
 * Unit tests for GeminiTTSProvider — verifies:
 *   - PCM (audio/L16) → wrapped in WAV header
 *   - audio/wav passthrough
 *   - audio/pcm → wrapped in WAV header
 *   - No audio data → throws
 *   - WAV header is structurally valid (RIFF/WAVE markers, correct sizes)
 */

import { GeminiTTSProvider } from '@/lib/speech/providers/tts';
import { GoogleGenerativeAI } from '@google/generative-ai';

jest.mock('@google/generative-ai');

const MockGenAI = GoogleGenerativeAI as jest.MockedClass<typeof GoogleGenerativeAI>;

function makeMockModel(mimeType: string, base64Data: string) {
  const mockGenerateContent = jest.fn().mockResolvedValue({
    response: {
      candidates: [{
        content: {
          parts: [{
            inlineData: { data: base64Data, mimeType },
          }],
        },
      }],
    },
  });
  MockGenAI.mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({ generateContent: mockGenerateContent }),
  }) as never);
  return mockGenerateContent;
}

// 32 bytes of fake PCM (silence — all zeros)
const FAKE_PCM = Buffer.alloc(32, 0);
const FAKE_PCM_B64 = FAKE_PCM.toString('base64');

// Minimal valid WAV (44-byte header + 4 bytes data)
const FAKE_WAV = Buffer.alloc(48, 0);
FAKE_WAV.write('RIFF', 0);
FAKE_WAV.writeUInt32LE(40, 4);
FAKE_WAV.write('WAVE', 8);
const FAKE_WAV_B64 = FAKE_WAV.toString('base64');

beforeEach(() => jest.clearAllMocks());

describe('GeminiTTSProvider', () => {
  describe('audio/L16 (raw PCM) → WAV wrapping', () => {
    it('wraps audio/L16 PCM in a WAV header', async () => {
      makeMockModel('audio/L16;codec=pcm;rate=24000', FAKE_PCM_B64);
      const provider = new GeminiTTSProvider('test-key');
      const result = await provider.synthesize('Hello Tammy');
      const view = new DataView(result);
      // RIFF marker
      expect(String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3))).toBe('RIFF');
      // WAVE marker
      expect(String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11))).toBe('WAVE');
      // Total size = 44 header + 32 PCM data
      expect(result.byteLength).toBe(44 + FAKE_PCM.length);
    });

    it('writes correct file size in WAV header', async () => {
      makeMockModel('audio/L16', FAKE_PCM_B64);
      const provider = new GeminiTTSProvider('test-key');
      const result = await provider.synthesize('Hi');
      const view = new DataView(result);
      // Bytes 4-7: file size - 8 = 36 + pcm.length
      expect(view.getUint32(4, true)).toBe(36 + FAKE_PCM.length);
    });

    it('writes correct data chunk size', async () => {
      makeMockModel('audio/L16', FAKE_PCM_B64);
      const provider = new GeminiTTSProvider('test-key');
      const result = await provider.synthesize('Hi');
      const view = new DataView(result);
      // Bytes 40-43: PCM data size
      expect(view.getUint32(40, true)).toBe(FAKE_PCM.length);
    });

    it('PCM data follows header unchanged', async () => {
      const pcm = Buffer.from([0x01, 0x02, 0x03, 0x04]);
      makeMockModel('audio/L16', pcm.toString('base64'));
      const provider = new GeminiTTSProvider('test-key');
      const result = await provider.synthesize('Hi');
      const bytes = new Uint8Array(result);
      expect(bytes[44]).toBe(0x01);
      expect(bytes[45]).toBe(0x02);
      expect(bytes[46]).toBe(0x03);
      expect(bytes[47]).toBe(0x04);
    });
  });

  describe('audio/pcm → WAV wrapping', () => {
    it('wraps audio/pcm in a WAV header', async () => {
      makeMockModel('audio/pcm;rate=24000', FAKE_PCM_B64);
      const provider = new GeminiTTSProvider('test-key');
      const result = await provider.synthesize('Hello');
      const view = new DataView(result);
      expect(String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3))).toBe('RIFF');
      expect(result.byteLength).toBe(44 + FAKE_PCM.length);
    });
  });

  describe('audio/wav → passthrough', () => {
    it('passes through audio/wav without re-wrapping', async () => {
      makeMockModel('audio/wav', FAKE_WAV_B64);
      const provider = new GeminiTTSProvider('test-key');
      const result = await provider.synthesize('Hello');
      expect(result.byteLength).toBe(FAKE_WAV.length);
    });
  });

  describe('error handling', () => {
    it('throws when Gemini returns no audio data', async () => {
      const mockGenerateContent = jest.fn().mockResolvedValue({
        response: { candidates: [{ content: { parts: [{}] } }] },
      });
      MockGenAI.mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue({ generateContent: mockGenerateContent }),
      }) as never);
      const provider = new GeminiTTSProvider('test-key');
      await expect(provider.synthesize('Hello')).rejects.toThrow('Gemini TTS returned no audio data');
    });

    it('throws when candidates are empty', async () => {
      const mockGenerateContent = jest.fn().mockResolvedValue({
        response: { candidates: [] },
      });
      MockGenAI.mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue({ generateContent: mockGenerateContent }),
      }) as never);
      const provider = new GeminiTTSProvider('test-key');
      await expect(provider.synthesize('Hello')).rejects.toThrow('Gemini TTS returned no audio data');
    });

    it('returns an ArrayBuffer (not a Node Buffer)', async () => {
      makeMockModel('audio/L16', FAKE_PCM_B64);
      const provider = new GeminiTTSProvider('test-key');
      const result = await provider.synthesize('Hi');
      expect(result.constructor.name).toBe('ArrayBuffer');
    });
  });

  describe('WAV header format fields', () => {
    it('sets PCM format (1) in fmt chunk', async () => {
      makeMockModel('audio/L16', FAKE_PCM_B64);
      const provider = new GeminiTTSProvider('test-key');
      const result = await provider.synthesize('Hi');
      const view = new DataView(result);
      expect(view.getUint16(20, true)).toBe(1); // PCM = 1
    });

    it('sets mono channel count', async () => {
      makeMockModel('audio/L16', FAKE_PCM_B64);
      const provider = new GeminiTTSProvider('test-key');
      const result = await provider.synthesize('Hi');
      const view = new DataView(result);
      expect(view.getUint16(22, true)).toBe(1); // mono
    });

    it('sets 24000 Hz sample rate', async () => {
      makeMockModel('audio/L16', FAKE_PCM_B64);
      const provider = new GeminiTTSProvider('test-key');
      const result = await provider.synthesize('Hi');
      const view = new DataView(result);
      expect(view.getUint32(24, true)).toBe(24000);
    });

    it('sets 16-bit depth', async () => {
      makeMockModel('audio/L16', FAKE_PCM_B64);
      const provider = new GeminiTTSProvider('test-key');
      const result = await provider.synthesize('Hi');
      const view = new DataView(result);
      expect(view.getUint16(34, true)).toBe(16);
    });
  });
});
