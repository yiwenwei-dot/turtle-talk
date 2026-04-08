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
        })
      );

      const [, options] = (global.fetch as jest.Mock).mock.calls[0] as [string, { body: string }];
      const body = JSON.parse(options.body) as {
        roomName?: string;
        participantName?: string;
        childName?: string;
        topics?: string[];
      };
      expect(body.participantName).toBe('child');
      expect(body.childName).toBe('little explorer');
      expect(body.roomName).toBeUndefined();
      expect(body.topics).toBeUndefined();
    });

    it('sends childName but no roomName when childName is provided', async () => {
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

      const [, options] = (global.fetch as jest.Mock).mock.calls[0] as [string, { body: string }];
      const body = JSON.parse(options.body) as {
        roomName?: string;
        participantName?: string;
        childName?: string;
      };
      expect(body.participantName).toBe('child');
      expect(body.childName).toBe('Max');
      expect(body.roomName).toBeUndefined();
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

  describe('data channel (handleData)', () => {
    it('emits missionChoices when agent sends missionChoices data message', () => {
      const choices = [
        { title: 'Draw a turtle', description: 'Draw a picture', difficulty: 'easy' },
        { title: 'Read a book', description: 'Read for 10 mins', difficulty: 'medium' },
        { title: 'Write a story', description: 'Write 5 sentences', difficulty: 'stretch' },
      ];
      const payload = Buffer.from(JSON.stringify({ type: 'missionChoices', choices }));

      const provider = new LiveKitVoiceProvider();
      const onChoices = jest.fn();
      provider.on('missionChoices', onChoices);

      (provider as any).handleData(payload);

      expect(onChoices).toHaveBeenCalledWith(choices);
    });

    it('calls stop() when agent sends endConversation data message', () => {
      const provider = new LiveKitVoiceProvider();
      const stopSpy = jest.spyOn(provider, 'stop');
      const payload = Buffer.from(JSON.stringify({ type: 'endConversation' }));

      (provider as any).handleData(payload);

      expect(stopSpy).toHaveBeenCalled();
    });
  });
});
