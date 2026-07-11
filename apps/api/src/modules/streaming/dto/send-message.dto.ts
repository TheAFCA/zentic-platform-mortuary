import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

/**
 * DTO para que un viewer envíe un mensaje de homenaje durante un evento en vivo.
 * El mensaje puede requerir moderación según la configuración del evento.
 */
export class SendMessageDto {
  /** Nombre del autor del mensaje (requerido, visible públicamente) */
  @IsString()
  @MinLength(1)
  authorName: string;

  /** Contenido del mensaje (máx 500 caracteres) */
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  content: string;

  /** Icono/emoción asociada (HEART, CANDLE, FLOWER, DOVE) */
  @IsString()
  @IsOptional()
  iconType?: string;
}
