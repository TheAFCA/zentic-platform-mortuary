import { Injectable } from '@nestjs/common';
import { escapeXml } from '../utils/escape-xml.util';
import {
  buildPhotoMarkup,
  formatInvitationDate,
  formatInvitationTime,
  svgTextLines,
  wrapText,
} from './render-helpers';
import {
  InvitationRenderContext,
  InvitationRenderSize,
  InvitationTemplateRenderer,
} from './invitation-template-renderer.interface';

const BACKGROUND = '#F4EDE0';
const FONT_FAMILY = "Georgia, 'Times New Roman', serif";

/** §5 del spec: fondo crema, tipografía serif, tonos tierra. Colores de acento = marca del tenant. */
@Injectable()
export class ClassicInvitationRenderer implements InvitationTemplateRenderer {
  renderSvg(
    context: InvitationRenderContext,
    size: InvitationRenderSize,
  ): string {
    const { width, height } = size;
    const cx = width / 2;
    const photoRadius = Math.min(width, height) * 0.16;
    const photoCy = height * 0.28;
    const dateLabel = formatInvitationDate(context.scheduledAt);
    const timeLabel = formatInvitationTime(context.scheduledAt);
    const placeLines = context.place
      ? [
          `${context.place.venueName} — ${context.place.roomName}`,
          context.place.address ?? 'Dirección por confirmar',
        ]
      : ['Dirección por confirmar'];
    const messageLines = context.message
      ? wrapText(context.message, 42, 4)
      : [];

    return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <rect width="${width}" height="${height}" fill="${BACKGROUND}" />
  <rect x="24" y="24" width="${width - 48}" height="${height - 48}" fill="none" stroke="${context.brand.primaryColor}" stroke-width="2" />

  ${buildPhotoMarkup(context.deceasedPhotoDataUri, context.deceasedFullName, cx, photoCy, photoRadius, context.brand.secondaryColor, '#FFFFFF')}

  <text x="${cx}" y="${photoCy + photoRadius + 56}" text-anchor="middle" font-family="${FONT_FAMILY}" font-size="34" font-weight="bold" fill="${context.brand.textColor}">${escapeXml(context.deceasedFullName)}</text>

  <text x="${cx}" y="${photoCy + photoRadius + 96}" text-anchor="middle" font-family="${FONT_FAMILY}" font-size="20" fill="${context.brand.primaryColor}">${escapeXml(dateLabel)} · ${escapeXml(timeLabel)}</text>

  ${svgTextLines(placeLines, cx, photoCy + photoRadius + 130, 26, `text-anchor="middle" font-family="${FONT_FAMILY}" font-size="18" fill="${context.brand.textColor}"`)}

  ${messageLines.length > 0 ? svgTextLines(messageLines, cx, photoCy + photoRadius + 130 + placeLines.length * 26 + 30, 26, `text-anchor="middle" font-family="${FONT_FAMILY}" font-style="italic" font-size="17" fill="${context.brand.textColor}"`) : ''}

  ${context.accessCodeDisplay ? `<text x="${cx}" y="${height - 48}" text-anchor="middle" font-family="${FONT_FAMILY}" font-size="16" fill="${context.brand.primaryColor}">Código de acceso: ${escapeXml(context.accessCodeDisplay)}</text>` : ''}

  <text x="${cx}" y="${height - 20}" text-anchor="middle" font-family="${FONT_FAMILY}" font-size="14" fill="${context.brand.textColor}" opacity="0.7">${escapeXml(context.tenantName)}</text>
</svg>`.trim();
  }
}
