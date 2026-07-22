import { ConfigService } from '@nestjs/config';
import { MuxStreamProvider } from './mux-stream.provider';

const mockLiveStreamsCreate = jest.fn();
const mockLiveStreamsRetrieve = jest.fn();
const mockLiveStreamsDisable = jest.fn();
const mockLiveStreamsResetStreamKey = jest.fn();
const mockSignPlaybackId = jest.fn();
const mockWebhooksUnwrap = jest.fn();

jest.mock('@mux/mux-node', () => {
  const MockMux = jest.fn().mockImplementation(() => ({
    video: {
      liveStreams: {
        create: mockLiveStreamsCreate,
        retrieve: mockLiveStreamsRetrieve,
        disable: mockLiveStreamsDisable,
        resetStreamKey: mockLiveStreamsResetStreamKey,
      },
    },
    jwt: { signPlaybackId: mockSignPlaybackId },
    webhooks: {
      unwrap: mockWebhooksUnwrap,
    },
  }));
  return { __esModule: true, default: MockMux };
});

describe('MuxStreamProvider', () => {
  let provider: MuxStreamProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    const config = {
      get: jest.fn((key: string) =>
        key === 'MUX_PLAYBACK_TOKEN_TTL_SECONDS' ? 3600 : 'test-value',
      ),
    } as unknown as ConfigService;
    provider = new MuxStreamProvider(config);
  });

  it('has name "mux"', () => {
    expect(provider.name).toBe('mux');
  });

  describe('createLiveStream', () => {
    it('creates a live stream with public playback and returns normalized credentials', async () => {
      mockLiveStreamsCreate.mockResolvedValue({
        id: 'mux-live-1',
        stream_key: 'streamkey123',
        playback_ids: [{ id: 'playback-public', policy: 'public' }],
      });

      const result = await provider.createLiveStream();

      expect(mockLiveStreamsCreate).toHaveBeenCalledWith({
        advanced_playback_policies: [{ policy: 'public' }],
        new_asset_settings: {
          advanced_playback_policies: [{ policy: 'public' }],
        },
      });
      expect(result).toEqual({
        streamKey: 'streamkey123',
        rtmpUrl: 'rtmps://global-live.mux.com:443/app',
        providerStreamId: 'mux-live-1',
        playbackId: 'playback-public',
        playbackPolicy: 'public',
      });
    });

    it('creates private streams with signed playback policies', async () => {
      mockLiveStreamsCreate.mockResolvedValue({
        id: 'mux-live-private',
        stream_key: 'private-key',
        playback_ids: [{ id: 'playback-signed', policy: 'signed' }],
      });

      const result = await provider.createLiveStream({ signedPlayback: true });

      expect(mockLiveStreamsCreate).toHaveBeenCalledWith({
        advanced_playback_policies: [{ policy: 'signed' }],
        new_asset_settings: {
          advanced_playback_policies: [{ policy: 'signed' }],
        },
      });
      expect(result.playbackId).toBe('playback-signed');
      expect(result.playbackPolicy).toBe('signed');
    });
  });

  describe('getStreamStatus', () => {
    it('returns active when Mux reports an active status', async () => {
      mockLiveStreamsRetrieve.mockResolvedValue({ status: 'active' });

      const status = await provider.getStreamStatus('mux-live-1');

      expect(mockLiveStreamsRetrieve).toHaveBeenCalledWith('mux-live-1');
      expect(status).toBe('active');
    });

    it('returns idle for any non-active status', async () => {
      mockLiveStreamsRetrieve.mockResolvedValue({ status: 'idle' });

      const status = await provider.getStreamStatus('mux-live-1');

      expect(status).toBe('idle');
    });
  });

  describe('disableLiveStream', () => {
    it('calls liveStreams.disable', async () => {
      mockLiveStreamsDisable.mockResolvedValue(undefined);

      await provider.disableLiveStream('mux-live-1');

      expect(mockLiveStreamsDisable).toHaveBeenCalledWith('mux-live-1');
    });
  });

  describe('credentials and playback', () => {
    it('resets and returns the new Mux stream key', async () => {
      mockLiveStreamsResetStreamKey.mockResolvedValue({
        stream_key: 'new-key',
      });

      await expect(provider.resetStreamKey('mux-live-1')).resolves.toBe(
        'new-key',
      );
    });

    it('signs URLs only for signed playback IDs', async () => {
      mockSignPlaybackId.mockResolvedValue('signed-jwt');

      await expect(
        provider.getPlaybackUrl('public-id', 'public'),
      ).resolves.toBe('https://stream.mux.com/public-id.m3u8');
      await expect(
        provider.getPlaybackUrl('signed-id', 'signed'),
      ).resolves.toBe('https://stream.mux.com/signed-id.m3u8?token=signed-jwt');
      expect(mockSignPlaybackId).toHaveBeenCalledWith('signed-id', {
        expiration: '3600s',
        type: 'video',
      });
    });
  });

  describe('parseWebhookEvent', () => {
    const rawBody = Buffer.from('{"type":"video.live_stream.active"}');
    const headers = { 'mux-signature': 'v1=abc' };

    it('returns a normalized stream.active event', () => {
      mockWebhooksUnwrap.mockReturnValue({
        type: 'video.live_stream.active',
        data: { id: 'mux-live-1' },
      });

      const event = provider.parseWebhookEvent(rawBody, headers);

      expect(event).toEqual({
        type: 'stream.active',
        providerStreamId: 'mux-live-1',
      });
    });

    it('returns a normalized stream.idle event', () => {
      mockWebhooksUnwrap.mockReturnValue({
        type: 'video.live_stream.idle',
        data: { id: 'mux-live-1' },
      });

      const event = provider.parseWebhookEvent(rawBody, headers);

      expect(event).toEqual({
        type: 'stream.idle',
        providerStreamId: 'mux-live-1',
      });
    });

    it('returns a normalized recording.ready event from video.asset.ready', () => {
      mockWebhooksUnwrap.mockReturnValue({
        type: 'video.asset.ready',
        data: {
          live_stream_id: 'mux-live-1',
          playback_ids: [{ id: 'playback-abc' }],
        },
      });

      const event = provider.parseWebhookEvent(rawBody, headers);

      expect(event).toEqual({
        type: 'recording.ready',
        providerStreamId: 'mux-live-1',
        playbackId: 'playback-abc',
        playbackPolicy: 'public',
      });
    });

    it('returns null when video.asset.ready has no live_stream_id or playback id', () => {
      mockWebhooksUnwrap.mockReturnValue({
        type: 'video.asset.ready',
        data: {},
      });

      expect(provider.parseWebhookEvent(rawBody, headers)).toBeNull();
    });

    it('returns null for unrecognized event types', () => {
      mockWebhooksUnwrap.mockReturnValue({
        type: 'video.upload.created',
        data: {},
      });

      expect(provider.parseWebhookEvent(rawBody, headers)).toBeNull();
    });

    it('returns null when signature verification throws', () => {
      mockWebhooksUnwrap.mockImplementation(() => {
        throw new Error(
          'No signatures found matching the expected signature for payload.',
        );
      });

      expect(provider.parseWebhookEvent(rawBody, headers)).toBeNull();
    });
  });
});
