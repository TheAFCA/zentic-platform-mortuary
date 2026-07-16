import { randomUUID } from 'crypto';

const MAX_BASE_LENGTH = 60;
const SUFFIX_LENGTH = 4;
// Rango Unicode de diacríticos combinantes (acentos) que quedan sueltos tras un normalize('NFD').
const COMBINING_DIACRITICS = /[̀-ͯ]/g;

/**
 * Genera un slug corto y único a partir de un texto base: normaliza acentos, minúsculas,
 * reemplaza caracteres no alfanuméricos por guiones y agrega un sufijo aleatorio de 4
 * caracteres para evitar colisiones entre registros con el mismo texto base.
 */
export function generateSlug(base: string): string {
  const slugBase = slugify(base).slice(0, MAX_BASE_LENGTH);
  const suffix = randomUUID().replace(/-/g, '').slice(0, SUFFIX_LENGTH);
  return `${slugBase}-${suffix}`;
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(COMBINING_DIACRITICS, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
