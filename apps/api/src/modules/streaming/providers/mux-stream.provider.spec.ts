import { ConfigService } from '@nestjs/config';
import { MuxStreamProvider } from './mux-stream.provider';

const mockLiveStreamsCreate = jest.fn();
const mockLiveStreamsRetrieve = jest.fn();
const mockLiveStreamsDisable = jest.fn();
const mockWebhooksUnwrap = jest.fn();

jest.mock('@mux/mux-node', () => {
  const MockMux = jest.fn().mockImplementation(() => ({
    video: {
      liveStreams: {
        create: mockLiveStreamsCreate,
        retrieve: mockLiveStreamsRetrieve,
        disable: mockLiveStreamsDisable,
      },
    },
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
      get: jest.fn().mockReturnValue('test-value'),
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
      });
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
        recordingUrl: 'https://stream.mux.com/playback-abc.m3u8',
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
