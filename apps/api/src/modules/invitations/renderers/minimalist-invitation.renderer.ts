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

const BACKGROUND = '#FFFFFF';
const FONT_FAMILY = "'Segoe UI', Helvetica, Arial, sans-serif";

/** §5 del spec: fondo blanco, líneas simples, texto centrado. */
@Injectable()
export class MinimalistInvitationRenderer implements InvitationTemplateRenderer {
  renderSvg(
    context: InvitationRenderContext,
    size: InvitationRenderSize,
  ): string {
    const { width, height } = size;
    const cx = width / 2;
    const photoRadius = Math.min(width, height) * 0.14;
    const photoCy = height * 0.26;
    const dateLabel = formatInvitationDate(context.scheduledAt);
    const timeLabel = formatInvitationTime(context.scheduledAt);
    const placeLines = context.place
      ? [
          `${context.place.venueName} — ${context.place.roomName}`,
          context.place.address ?? 'Dirección por confirmar',
        ]
      : ['Dirección por confirmar'];
    const messageLines = context.message
      ? wrapText(context.message, 46, 4)
      : [];

    return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <rect width="${width}" height="${height}" fill="${BACKGROUND}" />

  ${buildPhotoMarkup(context.deceasedPhotoDataUri, context.deceasedFullName, cx, photoCy, photoRadius, '#EDEDED', context.brand.textColor)}

  <line x1="${cx - 40}" y1="${photoCy + photoRadius + 30}" x2="${cx + 40}" y2="${photoCy + photoRadius + 30}" stroke="${context.brand.primaryColor}" stroke-width="3" />

  <text x="${cx}" y="${photoCy + photoRadius + 70}" text-anchor="middle" font-family="${FONT_FAMILY}" font-size="30" font-weight="300" letter-spacing="1" fill="${context.brand.textColor}">${escapeXml(context.deceasedFullName)}</text>

  <text x="${cx}" y="${photoCy + photoRadius + 106}" text-anchor="middle" font-family="${FONT_FAMILY}" font-size="18" letter-spacing="0.5" fill="${context.brand.primaryColor}">${escapeXml(dateLabel)} · ${escapeXml(timeLabel)}</text>

  ${svgTextLines(placeLines, cx, photoCy + photoRadius + 138, 24, `text-anchor="middle" font-family="${FONT_FAMILY}" font-size="16" font-weight="300" fill="${context.brand.textColor}"`)}

  ${messageLines.length > 0 ? svgTextLines(messageLines, cx, photoCy + photoRadius + 138 + placeLines.length * 24 + 28, 24, `text-anchor="middle" font-family="${FONT_FAMILY}" font-size="15" font-weight="300" fill="${context.brand.textColor}"`) : ''}

  ${context.accessCodeDisplay ? `<text x="${cx}" y="${height - 48}" text-anchor="middle" font-family="${FONT_FAMILY}" font-size="15" fill="${context.brand.primaryColor}">Código de acceso: ${escapeXml(context.accessCodeDisplay)}</text>` : ''}

  <text x="${cx}" y="${height - 20}" text-anchor="middle" font-family="${FONT_FAMILY}" font-size="13" fill="${context.brand.textColor}" opacity="0.6">${escapeXml(context.tenantName)}</text>
</svg>`.trim();
  }
}
