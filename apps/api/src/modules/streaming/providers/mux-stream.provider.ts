import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Mux from '@mux/mux-node';
import {
  CreateLiveStreamResult,
  StreamProvider,
  StreamWebhookEvent,
} from './stream-provider.interface';
import { Env } from '../../../config/env.validation';

const MUX_RTMP_URL = 'rtmps://global-live.mux.com:443/app';

@Injectable()
export class MuxStreamProvider implements StreamProvider {
  readonly name = 'mux' as const;

  private readonly logger = new Logger(MuxStreamProvider.name);
  private readonly client: Mux;
  private readonly hasPlaybackSigning: boolean;

  constructor(config: ConfigService<Env>) {
    const signingKeyId = config.get<string>('MUX_SIGNING_KEY_ID');
    const privateKey = config.get<string>('MUX_PRIVATE_KEY');
    this.hasPlaybackSigning = Boolean(signingKeyId && privateKey);
    this.client = new Mux({
      tokenId: config.get<string>('MUX_TOKEN_ID'),
      tokenSecret: config.get<string>('MUX_TOKEN_SECRET'),
      webhookSecret: config.get<string>('MUX_WEBHOOK_SECRET'),
      jwtSigningKey: signingKeyId,
      jwtPrivateKey: privateKey,
    });
    this.playbackTokenTtlSeconds = config.get(
      'MUX_PLAYBACK_TOKEN_TTL_SECONDS',
      14400,
    );
  }

  private readonly playbackTokenTtlSeconds: number;

  async createLiveStream(options?: {
    signedPlayback?: boolean;
  }): Promise<CreateLiveStreamResult> {
    if (options?.signedPlayback && !this.hasPlaybackSigning) {
      throw new Error(
        'Mux signed playback requiere MUX_SIGNING_KEY_ID y MUX_PRIVATE_KEY',
      );
    }
    const playbackPolicy = options?.signedPlayback ? 'signed' : 'public';
    const liveStream = await this.client.video.liveStreams.create({
      advanced_playback_policies: [{ policy: playbackPolicy }],
      new_asset_settings: {
        advanced_playback_policies: [{ policy: playbackPolicy }],
      },
    });
    const playbackId = liveStream.playback_ids?.find(
      ({ policy }) => policy === playbackPolicy,
    )?.id;

    return {
      streamKey: liveStream.stream_key,
      rtmpUrl: MUX_RTMP_URL,
      providerStreamId: liveStream.id,
      playbackId,
      playbackPolicy,
    };
  }

  async getStreamStatus(providerStreamId: string): Promise<'idle' | 'active'> {
    const liveStream =
      await this.client.video.liveStreams.retrieve(providerStreamId);
    return liveStream.status === 'active' ? 'active' : 'idle';
  }

  async disableLiveStream(providerStreamId: string): Promise<void> {
    await this.client.video.liveStreams.disable(providerStreamId);
  }

  async resetStreamKey(providerStreamId: string): Promise<string> {
    const stream =
      await this.client.video.liveStreams.resetStreamKey(providerStreamId);
    if (!stream.stream_key) {
      throw new Error('Mux no devolvió la nueva stream key');
    }
    return stream.stream_key;
  }

  async getPlaybackUrl(
    playbackId: string,
    policy: 'public' | 'signed',
  ): Promise<string> {
    const baseUrl = `https://stream.mux.com/${playbackId}.m3u8`;
    if (policy === 'public') return baseUrl;
    const token = await this.client.jwt.signPlaybackId(playbackId, {
      expiration: `${this.playbackTokenTtlSeconds}s`,
      type: 'video',
    });
    return `${baseUrl}?token=${token}`;
  }

  parseWebhookEvent(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): StreamWebhookEvent | null {
    try {
      const event = this.client.webhooks.unwrap(
        rawBody.toString('utf8'),
        headers,
      );

      switch (event.type) {
        case 'video.live_stream.active':
          return { type: 'stream.active', providerStreamId: event.data.id };
        case 'video.live_stream.idle':
          return { type: 'stream.idle', providerStreamId: event.data.id };
        case 'video.asset.ready': {
          const providerStreamId = event.data.live_stream_id;
          const playbackId = event.data.playback_ids?.[0]?.id;
          if (!providerStreamId || !playbackId) return null;
          return {
            type: 'recording.ready',
            providerStreamId,
            playbackId,
            playbackPolicy:
              event.data.playback_ids?.[0]?.policy === 'signed'
                ? 'signed'
                : 'public',
          };
        }
        default:
          return null;
      }
    } catch (error) {
      this.logger.warn(`Invalid Mux webhook: ${(error as Error).message}`);
      return null;
    }
  }
}
