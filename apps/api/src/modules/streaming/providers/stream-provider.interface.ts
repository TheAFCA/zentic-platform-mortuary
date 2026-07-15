export interface CreateLiveStreamResult {
  streamKey: string;
  rtmpUrl: string;
  providerStreamId: string;
}

export type StreamWebhookEvent =
  | { type: 'stream.active'; providerStreamId: string }
  | { type: 'stream.idle'; providerStreamId: string }
  | { type: 'recording.ready'; providerStreamId: string; recordingUrl: string };

/**
 * Contrato común para proveedores de streaming en vivo (Mux, Cloudflare Stream).
 * `StreamingService` depende únicamente de esta interfaz; el proveedor activo
 * se resuelve vía `STREAM_PROVIDER_TOKEN` según la env var `STREAM_PROVIDER`.
 */
export interface StreamProvider {
  readonly name: 'mux' | 'cloudflare';

  /** Crea un live stream real en el proveedor y devuelve las credenciales para OBS. */
  createLiveStream(): Promise<CreateLiveStreamResult>;

  /** Consulta si el proveedor está recibiendo señal RTMP (HU-STREAM-002). */
  getStreamStatus(providerStreamId: string): Promise<'idle' | 'active'>;

  /** Desactiva el live stream para que la stream key no pueda reutilizarse. */
  disableLiveStream(providerStreamId: string): Promise<void>;

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
