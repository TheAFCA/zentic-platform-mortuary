import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { FilesService } from './files.service';

@Controller('files/images')
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Public()
  @Get(':category/:tenantId/:filename')
  async image(
    @Param('category') category: string,
    @Param('tenantId') tenantId: string,
    @Param('filename') filename: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const image = await this.files.readPublicImage(
      `${category}/${tenantId}/${filename}`,
    );
    if (!image) throw new NotFoundException('Imagen no encontrada');
    response.setHeader('Cache-Control', 'public, max-age=3600');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; sandbox",
    );
    return new StreamableFile(image.buffer, { type: image.contentType });
  }
}
