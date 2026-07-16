import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import {
  CreateLiveStreamResult,
  StreamProvider,
  StreamWebhookEvent,
} from './stream-provider.interface';
import { Env } from '../../../config/env.validation';

/**
 * Adapter para Cloudflare Stream. Usa `fetch` nativo contra la REST API
 * (mismo estilo que `EmailService` con Resend) en vez de un SDK, ya que
 * Cloudflare no publica uno oficial para Node con la misma cobertura.
 *
 * @remarks
 * El campo `readyToStream`/`playback.hls` del webhook de video-listo se
 * verificó contra la documentación pública al momento de escribir esto,
 * pero no contra una cuenta real — validar con un evento real antes de
 * confiar en producción.
 */
@Injectable()
export class CloudflareStreamProvider implements StreamProvider {
  readonly name = 'cloudflare' as const;

  private readonly logger = new Logger(CloudflareStreamProvider.name);
  private readonly accountId?: string;
  private readonly apiToken?: string;
  private readonly webhookSecret?: string;
  private readonly customerCode?: string;

  constructor(private readonly config: ConfigService<Env>) {
    this.accountId = config.get<string>('CLOUDFLARE_ACCOUNT_ID');
    this.apiToken = config.get<string>('CLOUDFLARE_STREAM_API_TOKEN');
    this.webhookSecret = config.get<string>('CLOUDFLARE_STREAM_WEBHOOK_SECRET');
    this.customerCode = config.get<string>('CLOUDFLARE_STREAM_CUSTOMER_CODE');
  }

  private get baseUrl(): string {
    return `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/stream`;
  }

  private authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  async createLiveStream(options?: {
    signedPlayback?: boolean;
  }): Promise<CreateLiveStreamResult> {
    const signedPlayback = options?.signedPlayback ?? false;
    const response = await fetch(`${this.baseUrl}/live_inputs`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify({
        recording: {
          mode: 'automatic',
          requireSignedURLs: signedPlayback,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Cloudflare Stream: no se pudo crear el live input (${response.status})`,
      );
    }

    const { result } = (await response.json()) as {
      result: { uid: string; rtmps: { url: string; streamKey: string } };
    };

    return {
      streamKey: result.rtmps.streamKey,
      rtmpUrl: result.rtmps.url,
      providerStreamId: result.uid,
      playbackId: result.uid,
      playbackPolicy: signedPlayback ? 'signed' : 'public',
      playbackUrl: this.buildLiveHlsUrl(result.uid),
    };
  }

  private buildLiveHlsUrl(identifier: string): string {
    const host = this.customerCode
      ? `customer-${this.customerCode}.cloudflarestream.com`
      : 'videodelivery.net';
    return `https://${host}/${identifier}/manifest/video.m3u8`;
  }

  async getStreamStatus(providerStreamId: string): Promise<'idle' | 'active'> {
    const response = await fetch(
      `${this.baseUrl}/live_inputs/${providerStreamId}`,
      {
        headers: this.authHeaders(),
      },
    );

    if (!response.ok) return 'idle';

    const { result } = (await response.json()) as {
      result: { status?: { current?: { state?: string } } | string };
    };

    const state =
      typeof result.status === 'string'
        ? result.status
        : result.status?.current?.state;

    return state === 'connected' ? 'active' : 'idle';
  }

  async disableLiveStream(providerStreamId: string): Promise<void> {
    await fetch(`${this.baseUrl}/live_inputs/${providerStreamId}`, {
      method: 'DELETE',
      headers: this.authHeaders(),
    });
  }

  async resetStreamKey(_providerStreamId: string): Promise<string> {
    throw new Error(
      'La rotación de stream key de Cloudflare no está habilitada',
    );
  }

  async getPlaybackUrl(
    playbackId: string,
    policy: 'public' | 'signed',
  ): Promise<string> {
    if (policy === 'public') return this.buildLiveHlsUrl(playbackId);

    const response = await fetch(
      `${this.baseUrl}/${encodeURIComponent(playbackId)}/token`,
      {
        method: 'POST',
        headers: this.authHeaders(),
      },
    );
    if (!response.ok) {
      throw new Error(
        `Cloudflare Stream: no se pudo firmar el playback (${response.status})`,
      );
    }

    const { result } = (await response.json()) as {
      result?: { token?: string };
    };
    if (!result?.token) {
      throw new Error('Cloudflare Stream: respuesta de firma sin token');
    }
    return this.buildLiveHlsUrl(result.token);
  }

  parseWebhookEvent(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): StreamWebhookEvent | null {
    if (!this.verifySignature(rawBody, headers)) {
      this.logger.warn('Invalid Cloudflare Stream webhook signature');
      return null;
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch {
      return null;
    }

    const eventType = payload.event_type as string | undefined;
    const inputId = payload.input_id as string | undefined;

    if (eventType === 'live_input.connected' && inputId) {
      return { type: 'stream.active', providerStreamId: inputId };
    }
    if (eventType === 'live_input.disconnected' && inputId) {
      return { type: 'stream.idle', providerStreamId: inputId };
    }

    if (payload.readyToStream === true && typeof payload.uid === 'string') {
      const playback = payload.playback as { hls?: string } | undefined;
      if (!playback?.hls) return null;
      return {
        type: 'recording.ready',
        providerStreamId:
          typeof payload.liveInput === 'string'
            ? payload.liveInput
            : payload.uid,
        playbackId: payload.uid,
        recordingUrl: playback.hls,
      };
    }

    return null;
  }

  private verifySignature(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): boolean {
    if (!this.webhookSecret) return false;

    const header = headers['webhook-signature'] ?? headers['Webhook-Signature'];
    const headerValue = Array.isArray(header) ? header[0] : header;
    if (!headerValue) return false;

    const parts = Object.fromEntries(
      headerValue.split(',').map((pair) => pair.split('=') as [string, string]),
    );
    const { time, sig1 } = parts;
    if (!time || !sig1) return false;

    const expected = createHmac('sha256', this.webhookSecret)
      .update(`${time}.${rawBody.toString('utf8')}`)
      .digest('hex');

    const expectedBuf = Buffer.from(expected, 'hex');
    const actualBuf = Buffer.from(sig1, 'hex');
    if (expectedBuf.length !== actualBuf.length) return false;

    return timingSafeEqual(expectedBuf, actualBuf);
  }
}
