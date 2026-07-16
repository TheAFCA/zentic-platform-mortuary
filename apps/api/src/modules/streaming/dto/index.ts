/**
 * Módulo de Streaming — Data Transfer Objects
 *
 * Punto de entrada unificado para todos los DTOs del módulo de streaming.
 * Facilita importaciones limpias en controladores y servicios.
 *
 * @module StreamingDTOs
 */

export { CreateEventDto } from './create-event.dto';
export { UpdateEventDto } from './update-event.dto';
export { SendMessageDto } from './send-message.dto';
export { SendReactionDto } from './send-reaction.dto';
export { AccessCodeDto } from './access-code.dto';
export {
  EventListItemResponseDto,
  EventDetailResponseDto,
  PublicEventResponseDto,
  StreamCredentialsResponseDto,
  PlaybackResponseDto,
} from './streaming-response.dto';
