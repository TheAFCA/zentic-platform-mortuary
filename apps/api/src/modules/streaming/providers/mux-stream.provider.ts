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

  constructor(config: ConfigService<Env>) {
    this.client = new Mux({
      tokenId: config.get<string>('MUX_TOKEN_ID'),
      tokenSecret: config.get<string>('MUX_TOKEN_SECRET'),
      webhookSecret: config.get<string>('MUX_WEBHOOK_SECRET'),
    });
  }

  async createLiveStream(): Promise<CreateLiveStreamResult> {
    const liveStream = await this.client.video.liveStreams.create({
      advanced_playback_policies: [{ policy: 'public' }],
      new_asset_settings: {
        advanced_playback_policies: [{ policy: 'public' }],
      },
    });

    return {
      streamKey: liveStream.stream_key,
      rtmpUrl: MUX_RTMP_URL,
      providerStreamId: liveStream.id,
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
            recordingUrl: `https://stream.mux.com/${playbackId}.m3u8`,
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
