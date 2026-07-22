export interface CreateLiveStreamResult {
  streamKey: string;
  rtmpUrl: string;
  providerStreamId: string;
  playbackId?: string;
  playbackPolicy?: 'public' | 'signed';
  playbackUrl?: string;
}

export type StreamWebhookEvent =
  | { type: 'stream.active'; providerStreamId: string }
  | { type: 'stream.idle'; providerStreamId: string }
  | {
      type: 'recording.ready';
      providerStreamId: string;
      recordingUrl?: string;
      playbackId?: string;
      playbackPolicy?: 'public' | 'signed';
    };

export class ProviderTimeoutError extends Error {
  constructor(
    public readonly providerName: string,
    public readonly operation: string,
    public readonly timeoutMs: number,
  ) {
    super(
      `Proveedor ${providerName}: timeouterror en ${operation} después de ${timeoutMs}ms`,
    );
    this.name = 'ProviderTimeoutError';
  }
}

export class ProviderUnavailableError extends Error {
  constructor(
    public readonly providerName: string,
    public readonly operation: string,
    public readonly cause?: Error,
  ) {
    super(
      `Proveedor ${providerName} no disponible en ${operation}: ${cause?.message ?? 'desconocido'}`,
    );
    this.name = 'ProviderUnavailableError';
  }
}

export class NoSignalError extends Error {
  constructor(public readonly providerStreamId: string) {
    super(`No se detecta señal de video para el stream ${providerStreamId}`);
    this.name = 'NoSignalError';
  }
}

export class UnknownProviderError extends Error {
  constructor(provider: string) {
    super(
      `Proveedor de streaming desconocido: "${provider}". Los proveedores válidos son: mux, cloudflare.`,
    );
    this.name = 'UnknownProviderError';
  }
}

/**
 * Contrato común para proveedores de streaming en vivo (Mux, Cloudflare Stream).
 * `StreamingService` depende únicamente de esta interfaz; el proveedor activo
 * se resuelve vía `STREAM_PROVIDER_TOKEN` según la env var `STREAM_PROVIDER`,
 * o por el campo `event.provider` para eventos históricos (PROV-01).
 */
export interface StreamProvider {
  readonly name: 'mux' | 'cloudflare';

  /** Crea un live stream real en el proveedor y devuelve las credenciales para OBS. */
  createLiveStream(options?: {
    signedPlayback?: boolean;
  }): Promise<CreateLiveStreamResult>;

  /** Consulta si el proveedor está recibiendo señal RTMP (HU-STREAM-002). */
  getStreamStatus(providerStreamId: string): Promise<'idle' | 'active'>;

  /** Desactiva el live stream para que la stream key no pueda reutilizarse. */
  disableLiveStream(providerStreamId: string): Promise<void>;

  /** Rota la clave RTMP y devuelve la nueva clave en texto plano. */
  resetStreamKey(providerStreamId: string): Promise<string>;

  /** Genera una URL de playback; las políticas signed deben expirar. */
  getPlaybackUrl(
    playbackId: string,
    policy: 'public' | 'signed',
  ): Promise<string>;

  /**
   * Verifica la firma del webhook y devuelve el evento normalizado, o `null`
   * si la firma es inválida o el evento no es relevante para la aplicación.
   */
  parseWebhookEvent(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): StreamWebhookEvent | null;
}

export const STREAM_PROVIDER_TOKEN = Symbol('STREAM_PROVIDER_TOKEN');
export { resolveProviderForEvent } from './stream-provider.factory';
