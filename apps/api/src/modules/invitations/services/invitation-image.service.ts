import { Injectable } from '@nestjs/common';
import { InvitationTemplate } from '@zentic/shared-types';
import { FilesService } from '../../files/files.service';
import { InvitationTemplateFactory } from '../factories/invitation-template.factory';
import {
  InvitationRenderContext,
  InvitationRenderSize,
} from '../renderers/invitation-template-renderer.interface';

// Ver el comentario equivalente en obituary/services/deceased-photo.service.ts: sharp publica un
// paquete dual ESM/CJS que ningún import estándar tipa correctamente bajo nuestro tsconfig CJS.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharpFactory = require('sharp') as (input: Buffer) => SharpPipeline;

interface SharpPipeline {
  png(options?: { quality?: number }): SharpPipeline;
  toBuffer(): Promise<Buffer>;
}

// RF-INV-004: 1080×1080 para descarga/redes sociales, 1200×630 para preview de chat/Open Graph.
export const INVITATION_SOCIAL_SIZE: InvitationRenderSize = {
  width: 1080,
  height: 1080,
};
export const INVITATION_CHAT_SIZE: InvitationRenderSize = {
  width: 1200,
  height: 630,
};

const MIME_BY_EXTENSION: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  svg: 'image/svg+xml',
};

@Injectable()
export class InvitationImageService {
  constructor(
    private readonly templateFactory: InvitationTemplateFactory,
    private readonly filesService: FilesService,
  ) {}

  renderSocial(
    template: InvitationTemplate,
    context: InvitationRenderContext,
  ): Promise<Buffer> {
    return this.rasterize(template, context, INVITATION_SOCIAL_SIZE);
  }

  renderChatPreview(
    template: InvitationTemplate,
    context: InvitationRenderContext,
  ): Promise<Buffer> {
    return this.rasterize(template, context, INVITATION_CHAT_SIZE);
  }

  /**
   * Lee un archivo servido por FilesService y lo codifica como data URI, para embeberlo en el
   * SVG sin depender de una petición de red durante el rasterizado (garantiza RNF-INV-001, <5s).
   */
  async toDataUri(fileUrl: string | null): Promise<string | null> {
    if (!fileUrl) return null;
    const buffer = await this.filesService.readLocalFile(fileUrl);
    if (!buffer) return null;

    const extension = fileUrl.split('.').pop()?.toLowerCase() ?? '';
    const mime = MIME_BY_EXTENSION[extension] ?? 'image/png';
    return `data:${mime};base64,${buffer.toString('base64')}`;
  }

  private async rasterize(
    template: InvitationTemplate,
    context: InvitationRenderContext,
    size: InvitationRenderSize,
  ): Promise<Buffer> {
    const svg = this.templateFactory.create(template).renderSvg(context, size);
    return sharpFactory(Buffer.from(svg)).png({ quality: 90 }).toBuffer();
  }
}
