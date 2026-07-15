import { ConfigService } from '@nestjs/config';
import { streamProviderFactory } from './stream-provider.factory';
import { MuxStreamProvider } from './mux-stream.provider';
import { CloudflareStreamProvider } from './cloudflare-stream.provider';

describe('streamProviderFactory', () => {
  const mux = { name: 'mux' } as unknown as MuxStreamProvider;
  const cloudflare = {
    name: 'cloudflare',
  } as unknown as CloudflareStreamProvider;

  it('resolves to the Mux provider by default', () => {
    const config = {
      get: jest.fn().mockReturnValue('mux'),
    } as unknown as ConfigService;

    const result = (streamProviderFactory.useFactory as any)(
      config,
      mux,
      cloudflare,
    );

    expect(result).toBe(mux);
  });

  it('resolves to the Cloudflare provider when configured', () => {
    const config = {
      get: jest.fn().mockReturnValue('cloudflare'),
    } as unknown as ConfigService;

    const result = (streamProviderFactory.useFactory as any)(
      config,
      mux,
      cloudflare,
    );

    expect(result).toBe(cloudflare);
  });
});
