import { randomUUID } from 'crypto';

const MAX_BASE_LENGTH = 60;
const SUFFIX_LENGTH = 4;
// Rango Unicode de diacríticos combinantes (acentos) que quedan sueltos tras un normalize('NFD').
const COMBINING_DIACRITICS = /[̀-ͯ]/g;

/**
 * RN-OBT-004: el slug se genera al crear y es inmutable — nunca se regenera al editar el
 * nombre, para no romper enlaces ya compartidos con la familia.
 */
export function generateObituarySlug(
  firstName: string,
  lastName: string,
): string {
  const base = slugify(`${firstName} ${lastName}`).slice(0, MAX_BASE_LENGTH);
  const suffix = randomUUID().replace(/-/g, '').slice(0, SUFFIX_LENGTH);
  return `${base}-${suffix}`;
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
