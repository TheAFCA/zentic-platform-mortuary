/**
 * Escapa texto de usuario antes de interpolarlo en un template SVG. A diferencia de
 * sanitizeHtml (usado en Obituario para HTML enriquecido), este es el único punto del código
 * donde texto arbitrario del operador (nombre, mensaje, lugar) entra a un documento XML/SVG.
 */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
