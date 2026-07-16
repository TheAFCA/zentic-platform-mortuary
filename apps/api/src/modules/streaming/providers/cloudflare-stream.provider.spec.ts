import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { CloudflareStreamProvider } from './cloudflare-stream.provider';

function buildSignatureHeader(
  secret: string,
  time: string,
  body: string,
): string {
  const sig1 = createHmac('sha256', secret)
    .update(`${time}.${body}`)
    .digest('hex');
  return `time=${time},sig1=${sig1}`;
}

describe('CloudflareStreamProvider', () => {
  let provider: CloudflareStreamProvider;
  let fetchMock: jest.Mock;

  const configValues: Record<string, string> = {
    CLOUDFLARE_ACCOUNT_ID: 'account-1',
    CLOUDFLARE_STREAM_API_TOKEN: 'token-123',
    CLOUDFLARE_STREAM_WEBHOOK_SECRET: 'webhook-secret',
    CLOUDFLARE_STREAM_CUSTOMER_CODE: 'customer-code',
  };

  beforeEach(() => {
    const config = {
      get: jest.fn((key: string) => configValues[key]),
    } as unknown as ConfigService;
    provider = new CloudflareStreamProvider(config);

    fetchMock = jest.fn();
    global.fetch = fetchMock as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('has name "cloudflare"', () => {
    expect(provider.name).toBe('cloudflare');
  });

  describe('createLiveStream', () => {
    it('creates a live input with automatic recording and returns normalized credentials', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          result: {
            uid: 'cf-live-1',
            rtmps: {
              url: 'rtmps://live.cloudflare.com:443/live/',
              streamKey: 'key-abc',
            },
          },
        }),
      });

      const result = await provider.createLiveStream();

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.cloudflare.com/client/v4/accounts/account-1/stream/live_inputs',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer token-123',
          }),
          body: JSON.stringify({
            recording: {
              mode: 'automatic',
              requireSignedURLs: false,
            },
          }),
        }),
      );
      expect(result).toEqual({
        streamKey: 'key-abc',
        rtmpUrl: 'rtmps://live.cloudflare.com:443/live/',
        providerStreamId: 'cf-live-1',
        playbackId: 'cf-live-1',
        playbackPolicy: 'public',
        playbackUrl:
          'https://customer-customer-code.cloudflarestream.com/cf-live-1/manifest/video.m3u8',
      });
    });

    it('configures signed playback for private live inputs', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          result: {
            uid: 'cf-private-1',
            rtmps: {
              url: 'rtmps://live.cloudflare.com/live',
              streamKey: 'key',
            },
          },
        }),
      });

      const result = await provider.createLiveStream({ signedPlayback: true });

      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
        recording: {
          mode: 'automatic',
          requireSignedURLs: true,
        },
      });
      expect(result.playbackPolicy).toBe('signed');
    });

    it('throws when Cloudflare responds with an error status', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 500 });

      await expect(provider.createLiveStream()).rejects.toThrow(
        'Cloudflare Stream: no se pudo crear el live input (500)',
      );
    });
  });

  describe('getPlaybackUrl', () => {
    it('returns the canonical manifest URL for public playback', async () => {
      await expect(
        provider.getPlaybackUrl('cf-live-1', 'public'),
      ).resolves.toBe(
        'https://customer-customer-code.cloudflarestream.com/cf-live-1/manifest/video.m3u8',
      );
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('requests a token and places it in the private manifest URL', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ result: { token: 'signed.jwt.token' } }),
      });

      await expect(
        provider.getPlaybackUrl('cf-private-1', 'signed'),
      ).resolves.toBe(
        'https://customer-customer-code.cloudflarestream.com/signed.jwt.token/manifest/video.m3u8',
      );
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.cloudflare.com/client/v4/accounts/account-1/stream/cf-private-1/token',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('rejects an unsuccessful token response', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 403 });

      await expect(
        provider.getPlaybackUrl('cf-private-1', 'signed'),
      ).rejects.toThrow('no se pudo firmar el playback (403)');
    });
  });

  describe('legacy playback protection', () => {
    it('enables signed URLs for a legacy video', async () => {
      fetchMock.mockResolvedValue({ ok: true });

      await provider.enableSignedPlayback('legacy-video');

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.cloudflare.com/client/v4/accounts/account-1/stream/legacy-video',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ requireSignedURLs: true }),
        }),
      );
    });

    it('extracts a video id only from an HLS manifest URL', () => {
      expect(
        provider.extractPlaybackId(
          'https://videodelivery.net/legacy-video/manifest/video.m3u8',
        ),
      ).toBe('legacy-video');
      expect(
        provider.extractPlaybackId('https://example.com/video.mp4'),
      ).toBeNull();
    });
  });

  describe('getStreamStatus', () => {
    it('returns active when the live input is connected', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          result: { status: { current: { state: 'connected' } } },
        }),
      });

      const status = await provider.getStreamStatus('cf-live-1');

      expect(status).toBe('active');
    });

    it('returns idle when disconnected', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          result: { status: { current: { state: 'disconnected' } } },
        }),
      });

      expect(await provider.getStreamStatus('cf-live-1')).toBe('idle');
    });

    it('returns idle when the request fails', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 404 });

      expect(await provider.getStreamStatus('cf-live-1')).toBe('idle');
    });
  });

  describe('disableLiveStream', () => {
    it('sends a DELETE request for the live input', async () => {
      fetchMock.mockResolvedValue({ ok: true });

      await provider.disableLiveStream('cf-live-1');

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.cloudflare.com/client/v4/accounts/account-1/stream/live_inputs/cf-live-1',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });

  describe('parseWebhookEvent', () => {
    it('returns null when the signature is invalid', () => {
      const body = Buffer.from(
        JSON.stringify({ event_type: 'live_input.connected', input_id: 'x' }),
      );
      const headers = { 'webhook-signature': 'time=123,sig1=deadbeef' };

      expect(provider.parseWebhookEvent(body, headers)).toBeNull();
    });

    it('returns null when there is no signature header', () => {
      const body = Buffer.from('{}');

      expect(provider.parseWebhookEvent(body, {})).toBeNull();
    });

    it('returns a normalized stream.active event for live_input.connected', () => {
      const payload = {
        event_type: 'live_input.connected',
        input_id: 'cf-live-1',
      };
      const body = Buffer.from(JSON.stringify(payload));
      const headers = {
        'webhook-signature': buildSignatureHeader(
          'webhook-secret',
          '1700000000',
          body.toString('utf8'),
        ),
      };

      const event = provider.parseWebhookEvent(body, headers);

      expect(event).toEqual({
        type: 'stream.active',
        providerStreamId: 'cf-live-1',
      });
    });

    it('returns a normalized stream.idle event for live_input.disconnected', () => {
      const payload = {
        event_type: 'live_input.disconnected',
        input_id: 'cf-live-1',
      };
      const body = Buffer.from(JSON.stringify(payload));
      const headers = {
        'webhook-signature': buildSignatureHeader(
          'webhook-secret',
          '1700000000',
          body.toString('utf8'),
        ),
      };

      const event = provider.parseWebhookEvent(body, headers);

      expect(event).toEqual({
        type: 'stream.idle',
        providerStreamId: 'cf-live-1',
      });
    });

    it('returns a normalized recording.ready event when readyToStream and playback.hls are present', () => {
      const payload = {
        uid: 'cf-live-1',
        liveInput: 'cf-input-1',
        readyToStream: true,
        playback: {
          hls: 'https://videodelivery.net/cf-live-1/manifest/video.m3u8',
        },
      };
      const body = Buffer.from(JSON.stringify(payload));
      const headers = {
        'webhook-signature': buildSignatureHeader(
          'webhook-secret',
          '1700000000',
          body.toString('utf8'),
        ),
      };

      const event = provider.parseWebhookEvent(body, headers);

      expect(event).toEqual({
        type: 'recording.ready',
        providerStreamId: 'cf-input-1',
        playbackId: 'cf-live-1',
        recordingUrl: 'https://videodelivery.net/cf-live-1/manifest/video.m3u8',
      });
    });

    it('returns null when readyToStream is true but there is no playback.hls', () => {
      const payload = { uid: 'cf-live-1', readyToStream: true };
      const body = Buffer.from(JSON.stringify(payload));
      const headers = {
        'webhook-signature': buildSignatureHeader(
          'webhook-secret',
          '1700000000',
          body.toString('utf8'),
        ),
      };

      expect(provider.parseWebhookEvent(body, headers)).toBeNull();
    });
  });
});
