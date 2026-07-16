import { generateSlug } from '../../../common/utils/slug.util';

/**
 * RN-OBT-004: el slug se genera al crear y es inmutable — nunca se regenera al editar el
 * nombre, para no romper enlaces ya compartidos con la familia.
 */
export function generateObituarySlug(
  firstName: string,
  lastName: string,
): string {
  return generateSlug(`${firstName} ${lastName}`);
}
