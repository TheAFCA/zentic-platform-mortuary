import { escapeXml } from '../utils/escape-xml.util';

const DATE_FORMATTER = new Intl.DateTimeFormat('es-CO', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  timeZone: 'America/Bogota',
});

const TIME_FORMATTER = new Intl.DateTimeFormat('es-CO', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: 'America/Bogota',
});

export function formatInvitationDate(date: Date): string {
  const formatted = DATE_FORMATTER.format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function formatInvitationTime(date: Date): string {
  return TIME_FORMATTER.format(date).toUpperCase();
}

export function initialsOf(fullName: string): string {
  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/** SVG <text> no hace word-wrap solo — parte el texto en líneas de máx. `maxCharsPerLine`. */
export function wrapText(
  text: string,
  maxCharsPerLine: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
      if (lines.length === maxLines) break;
    } else {
      current = candidate;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);

  if (
    lines.length === maxLines &&
    words.join(' ').length > lines.join(' ').length
  ) {
    lines[maxLines - 1] =
      `${lines[maxLines - 1].slice(0, maxCharsPerLine - 1)}…`;
  }

  return lines;
}

export function svgTextLines(
  lines: string[],
  x: number,
  startY: number,
  lineHeight: number,
  attrs: string,
): string {
  return lines
    .map(
      (line, index) =>
        `<text x="${x}" y="${startY + index * lineHeight}" ${attrs}>${escapeXml(line)}</text>`,
    )
    .join('\n');
}

/** Foto circular recortada vía clipPath, o círculo placeholder con iniciales si no hay foto. */
export function buildPhotoMarkup(
  photoDataUri: string | null,
  fullName: string,
  cx: number,
  cy: number,
  radius: number,
  placeholderFill: string,
  placeholderTextColor: string,
): string {
  if (photoDataUri) {
    const clipId = `photo-clip-${cx}-${cy}-${radius}`;
    return `
      <defs><clipPath id="${clipId}"><circle cx="${cx}" cy="${cy}" r="${radius}" /></clipPath></defs>
      <image href="${photoDataUri}" x="${cx - radius}" y="${cy - radius}" width="${radius * 2}" height="${radius * 2}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})" />
      <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${placeholderTextColor}" stroke-width="2" opacity="0.35" />
    `;
  }
  return `
    <circle cx="${cx}" cy="${cy}" r="${radius}" fill="${placeholderFill}" />
    <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-size="${radius}" font-family="Georgia, 'Times New Roman', serif" fill="${placeholderTextColor}">${escapeXml(initialsOf(fullName))}</text>
  `;
}
