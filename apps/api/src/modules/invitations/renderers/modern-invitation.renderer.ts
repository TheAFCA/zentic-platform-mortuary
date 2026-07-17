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

const FONT_FAMILY = "'Segoe UI', Helvetica, Arial, sans-serif";

/** §5 del spec: fondo oscuro, tipografía sans, acento en color primario del tenant. */
@Injectable()
export class ModernInvitationRenderer implements InvitationTemplateRenderer {
  renderSvg(
    context: InvitationRenderContext,
    size: InvitationRenderSize,
  ): string {
    const { width, height } = size;
    const cx = width / 2;
    const photoRadius = Math.min(width, height) * 0.16;
    const photoCy = height * 0.28;
    const background = context.brand.secondaryColor;
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
  <rect width="${width}" height="${height}" fill="${background}" />
  <rect x="0" y="0" width="${width}" height="6" fill="${context.brand.primaryColor}" />

  ${buildPhotoMarkup(context.deceasedPhotoDataUri, context.deceasedFullName, cx, photoCy, photoRadius, context.brand.primaryColor, '#FFFFFF')}

  <text x="${cx}" y="${photoCy + photoRadius + 56}" text-anchor="middle" font-family="${FONT_FAMILY}" font-size="34" font-weight="600" fill="#FFFFFF">${escapeXml(context.deceasedFullName)}</text>

  <text x="${cx}" y="${photoCy + photoRadius + 96}" text-anchor="middle" font-family="${FONT_FAMILY}" font-size="20" font-weight="600" fill="${context.brand.primaryColor}">${escapeXml(dateLabel)} · ${escapeXml(timeLabel)}</text>

  ${svgTextLines(placeLines, cx, photoCy + photoRadius + 130, 26, `text-anchor="middle" font-family="${FONT_FAMILY}" font-size="18" fill="#E4E4E8"`)}

  ${messageLines.length > 0 ? svgTextLines(messageLines, cx, photoCy + photoRadius + 130 + placeLines.length * 26 + 30, 26, `text-anchor="middle" font-family="${FONT_FAMILY}" font-size="17" fill="#E4E4E8"`) : ''}

  ${context.accessCodeDisplay ? `<text x="${cx}" y="${height - 48}" text-anchor="middle" font-family="${FONT_FAMILY}" font-size="16" font-weight="600" fill="${context.brand.primaryColor}">Código de acceso: ${escapeXml(context.accessCodeDisplay)}</text>` : ''}

  <text x="${cx}" y="${height - 20}" text-anchor="middle" font-family="${FONT_FAMILY}" font-size="14" fill="#FFFFFF" opacity="0.7">${escapeXml(context.tenantName)}</text>
</svg>`.trim();
  }
}
