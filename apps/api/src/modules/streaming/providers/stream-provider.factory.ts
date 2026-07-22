import { FactoryProvider, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from '../../../config/env.validation';
import { MuxStreamProvider } from './mux-stream.provider';
import { CloudflareStreamProvider } from './cloudflare-stream.provider';
import {
  STREAM_PROVIDER_TOKEN,
  StreamProvider,
  UnknownProviderError,
} from './stream-provider.interface';
import { Event } from '@prisma/client';

export const streamProviderFactory: FactoryProvider = {
  provide: STREAM_PROVIDER_TOKEN,
  inject: [ConfigService, MuxStreamProvider, CloudflareStreamProvider],
  useFactory: (
    config: ConfigService<Env>,
    mux: MuxStreamProvider,
    cloudflare: CloudflareStreamProvider,
  ) => {
    const defaultProvider = config.get<string>('STREAM_PROVIDER');
    return defaultProvider === 'cloudflare' ? cloudflare : mux;
  },
};

/**
 * Resuelve el proveedor de streaming para un evento específico (PROV-01).
 * Usa `event.provider` si está definido, o el proveedor por defecto de la configuración.
 * Rechaza de forma controlada proveedores desconocidos (PROV-03).
 */
export function resolveProviderForEvent(
  event: { provider: string | null },
  mux: MuxStreamProvider,
  cloudflare: CloudflareStreamProvider,
  defaultProvider: StreamProvider,
): StreamProvider {
  const providerName = event.provider || defaultProvider.name;

  switch (providerName) {
    case 'mux':
      return mux;
    case 'cloudflare':
      return cloudflare;
    default:
      throw new UnknownProviderError(providerName);
  }
}

/**
 * Ejecuta una operación del proveedor con timeout (PROV-05).
 */
export async function withProviderTimeout<T>(
  provider: StreamProvider,
  operation: string,
  fn: () => Promise<T>,
  timeoutMs = 10000,
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const result = await Promise.race([
      fn(),
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(
            new Error(`Provider operation timed out after ${timeoutMs}ms`),
          );
        });
      }),
    ]);
    return result;
  } finally {
    clearTimeout(timeoutId);
  }
}
