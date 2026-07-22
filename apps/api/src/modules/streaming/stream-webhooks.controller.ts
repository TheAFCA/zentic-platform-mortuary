import {
  Controller,
  HttpCode,
  Post,
  Req,
  RawBodyRequest,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Request } from 'express';
import { StreamingService } from './streaming.service';
import { Public } from '../../common/decorators/public.decorator';

/**
 * Recibe los webhooks de los proveedores de streaming (Mux, Cloudflare Stream).
 * La autenticidad de cada request se verifica por firma dentro del servicio
 * (no por un guard de Nest), ya que requiere el cuerpo crudo del request.
 */
@ApiExcludeController()
@Controller('webhooks/streaming')
export class StreamWebhooksController {
  constructor(private readonly streamingService: StreamingService) {}

  @Post('mux')
  @Public()
  @HttpCode(200)
  async mux(@Req() req: RawBodyRequest<Request>): Promise<{ received: true }> {
    await this.streamingService.handleMuxWebhook(
      req.rawBody ?? Buffer.from(''),
      req.headers,
    );
    return { received: true };
  }

  @Post('cloudflare')
  @Public()
  @HttpCode(200)
  async cloudflare(
    @Req() req: RawBodyRequest<Request>,
  ): Promise<{ received: true }> {
    await this.streamingService.handleCloudflareWebhook(
      req.rawBody ?? Buffer.from(''),
      req.headers,
    );
    return { received: true };
  }
}
