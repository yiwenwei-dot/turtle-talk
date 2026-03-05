/** @jest-environment jsdom */
/** Unit tests for LiveKitVoiceProvider */

const mockSetMicrophoneEnabled = jest.fn().mockResolvedValue(undefined);
const mockConnect = jest.fn().mockResolvedValue(undefined);
const mockDisconnect = jest.fn();

jest.mock('livekit-client', () => {
  return {
    Room: jest.fn().mockImplementation(() => ({
      on: jest.fn(),
      connect: mockConnect,
      disconnect: mockDisconnect,
      localParticipant: {
        setMicrophoneEnabled: mockSetMicrophoneEnabled,
      },
    })),
    RoomEvent: {
      Disconnected: 'disconnected',
      DataReceived: 'dataReceived',
      TrackSubscribed: 'trackSubscribed',
      TrackUnsubscribed: 'trackUnsubscribed',
    },
    Track: {
      Kind: { Audio: 'audio', Video: 'video' },
    },
  };
});

import { LiveKitVoiceProvider } from '@/lib/speech/voice/livekit';

describe('LiveKitVoiceProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConnect.mockResolvedValue(undefined);
    mockSetMicrophoneEnabled.mockResolvedValue(undefined);
    global.fetch = jest.fn();
  });

  it('has name livekit', () => {
    expect(new LiveKitVoiceProvider().name).toBe('livekit');
  });

  describe('start()', () => {
    it('calls POST /api/livekit/token with participantName and optional roomName', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          token: 'jwt-token',
          roomName: 'talk-123',
          livekitUrl: 'wss://test.livekit.cloud',
        }),
      });

      const provider = new LiveKitVoiceProvider();
      await provider.start({});

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/livekit/token',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomName: undefined,
            participantName: 'child',
          }),
        })
      );
    });

    it('sends roomName when childName is provided', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          token: 'jwt-token',
          roomName: 'talk-Max',
          livekitUrl: 'wss://test.livekit.cloud',
        }),
      });

      const provider = new LiveKitVoiceProvider();
      await provider.start({ childName: 'Max' });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/livekit/token',
        expect.objectContaining({
          body: JSON.stringify({
            roomName: 'talk-Max',
            participantName: 'child',
            childName: 'Max',
          }),
        })
      );
    });

    it('connects room with token and livekitUrl from response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          token: 'secret-jwt',
          roomName: 'talk-abc',
          livekitUrl: 'wss://my.livekit.cloud',
        }),
      });

      const provider = new LiveKitVoiceProvider();
      await provider.start({});

      expect(mockConnect).toHaveBeenCalledWith(
        'wss://my.livekit.cloud',
        'secret-jwt',
        { autoSubscribe: true }
      );
    });

    it('enables microphone after connect', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          token: 'jwt',
          roomName: 'talk-r',
          livekitUrl: 'wss://lk.cloud',
        }),
      });

      const provider = new LiveKitVoiceProvider();
      await provider.start({});

      expect(mockSetMicrophoneEnabled).toHaveBeenCalledWith(true);
    });

    it('emits error and idle state when token request fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({ error: 'Service unavailable' }),
      });

      const provider = new LiveKitVoiceProvider();
      const onError = jest.fn();
      const onState = jest.fn();
      provider.on('error', onError);
      provider.on('stateChange', onState);

      await provider.start({});

      expect(onError).toHaveBeenCalledWith('Service unavailable');
      expect(onState).toHaveBeenCalledWith('idle');
      expect(mockConnect).not.toHaveBeenCalled();
    });

    it('emits error when response is missing token or livekitUrl', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ roomName: 'talk-x' }),
      });

      const provider = new LiveKitVoiceProvider();
      const onError = jest.fn();
      provider.on('error', onError);

      await provider.start({});

      expect(onError).toHaveBeenCalledWith('Missing token or livekitUrl');
      expect(mockConnect).not.toHaveBeenCalled();
    });
  });

  describe('stop()', () => {
    it('disconnects room and emits ended', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          token: 'jwt',
          roomName: 'talk-r',
          livekitUrl: 'wss://lk.cloud',
        }),
      });

      const provider = new LiveKitVoiceProvider();
      await provider.start({});

      const onEnd = jest.fn();
      const onState = jest.fn();
      provider.on('end', onEnd);
      provider.on('stateChange', onState);

      provider.stop();

      expect(mockDisconnect).toHaveBeenCalled();
      expect(onState).toHaveBeenCalledWith('ended');
      expect(onEnd).toHaveBeenCalled();
    });
  });

  describe('setMuted()', () => {
    it('calls setMicrophoneEnabled(false) when muting and room is connected', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          token: 'jwt',
          roomName: 'talk-r',
          livekitUrl: 'wss://lk.cloud',
        }),
      });

      const provider = new LiveKitVoiceProvider();
      await provider.start({});

      mockSetMicrophoneEnabled.mockClear();
      provider.setMuted(true);

      expect(mockSetMicrophoneEnabled).toHaveBeenCalledWith(false);
    });

    it('calls setMicrophoneEnabled(true) when unmuting', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          token: 'jwt',
          roomName: 'talk-r',
          livekitUrl: 'wss://lk.cloud',
        }),
      });

      const provider = new LiveKitVoiceProvider();
      await provider.start({});
      provider.setMuted(true);
      mockSetMicrophoneEnabled.mockClear();

      provider.setMuted(false);

      expect(mockSetMicrophoneEnabled).toHaveBeenCalledWith(true);
    });
  });
});
