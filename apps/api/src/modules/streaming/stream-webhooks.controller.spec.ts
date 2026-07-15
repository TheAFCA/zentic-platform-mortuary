import { Test, TestingModule } from '@nestjs/testing';
import { StreamWebhooksController } from './stream-webhooks.controller';
import { StreamingService } from './streaming.service';

describe('StreamWebhooksController', () => {
  let controller: StreamWebhooksController;
  let service: jest.Mocked<StreamingService>;

  beforeEach(async () => {
    service = {
      handleMuxWebhook: jest.fn().mockResolvedValue(undefined),
      handleCloudflareWebhook: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<StreamingService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StreamWebhooksController],
      providers: [{ provide: StreamingService, useValue: service }],
    }).compile();

    controller = module.get(StreamWebhooksController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('mux', () => {
    it('forwards the raw body and headers to the service', async () => {
      const req = {
        rawBody: Buffer.from('{"type":"video.live_stream.active"}'),
        headers: { 'mux-signature': 'v1=abc' },
      } as any;

      const result = await controller.mux(req);

      expect(service.handleMuxWebhook).toHaveBeenCalledWith(
        req.rawBody,
        req.headers,
      );
      expect(result).toEqual({ received: true });
    });

    it('falls back to an empty buffer when rawBody is missing', async () => {
      const req = { headers: {} } as any;

      await controller.mux(req);

      expect(service.handleMuxWebhook).toHaveBeenCalledWith(
        Buffer.from(''),
        {},
      );
    });
  });

  describe('cloudflare', () => {
    it('forwards the raw body and headers to the service', async () => {
      const req = {
        rawBody: Buffer.from('{"event_type":"live_input.connected"}'),
        headers: { 'webhook-signature': 'time=1,sig1=abc' },
      } as any;

      const result = await controller.cloudflare(req);

      expect(service.handleCloudflareWebhook).toHaveBeenCalledWith(
        req.rawBody,
        req.headers,
      );
      expect(result).toEqual({ received: true });
    });
  });
});
