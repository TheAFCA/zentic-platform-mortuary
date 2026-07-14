import { IsString, IsIn } from 'class-validator';

/** Tipos de reacción rápida permitidos durante un evento en vivo */
const ALLOWED_REACTIONS = ['heart', 'candle', 'flower', 'dove'] as const;

/**
 * DTO para enviar una reacción rápida durante un evento en vivo.
 * Las reacciones no requieren moderación y se muestran como animaciones.
 */
export class SendReactionDto {
  /** Tipo de reacción: heart, candle, flower, dove */
  @IsString()
  @IsIn(ALLOWED_REACTIONS)
  type: string;
}
