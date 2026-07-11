import { PartialType } from '@nestjs/swagger';
import { CreateEventDto } from './create-event.dto';

/**
 * DTO para la actualización parcial de un evento de streaming.
 * Todos los campos son opcionales; solo se actualizan los enviados.
 * Extiende CreateEventDto usando PartialType de NestJS Swagger.
 */
export class UpdateEventDto extends PartialType(CreateEventDto) {}
