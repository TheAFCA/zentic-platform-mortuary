import { FactoryProvider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from '../../../config/env.validation';
import { MuxStreamProvider } from './mux-stream.provider';
import { CloudflareStreamProvider } from './cloudflare-stream.provider';
import { STREAM_PROVIDER_TOKEN } from './stream-provider.interface';

export const streamProviderFactory: FactoryProvider = {
  provide: STREAM_PROVIDER_TOKEN,
  inject: [ConfigService, MuxStreamProvider, CloudflareStreamProvider],
  useFactory: (
    config: ConfigService<Env>,
    mux: MuxStreamProvider,
    cloudflare: CloudflareStreamProvider,
  ) => {
    const provider = config.get<string>('STREAM_PROVIDER');
    return provider === 'cloudflare' ? cloudflare : mux;
  },
};
