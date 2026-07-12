import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsDateString,
  IsEnum,
  ValidateNested,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ModerationMode } from '@zentic/shared-types';

/**
 * Datos opcionales del difunto para crear junto con el evento.
 * Usado cuando no existe un registro previo de Deceased.
 */
class CreateDeceasedDto {
  /** Nombre del difunto (requerido) */
  @IsString()
  @MinLength(1)
  firstName: string;

  /** Apellido del difunto (requerido) */
  @IsString()
  @MinLength(1)
  lastName: string;

  /** Fecha de nacimiento (ISO 8601) */
  @IsDateString()
  @IsOptional()
  birthDate?: string;

  /** Fecha de fallecimiento (ISO 8601) */
  @IsDateString()
  @IsOptional()
  deathDate?: string;

  /** URL de la foto del difunto */
  @IsString()
  @IsOptional()
  photoUrl?: string;

  /** Biografía o semblanza */
  @IsString()
  @IsOptional()
  biography?: string;

  /** Epitafio (máx 150 caracteres) */
  @IsString()
  @MaxLength(150)
  @IsOptional()
  epitaph?: string;
}

/**
 * DTO para la creación de un nuevo evento de streaming.
 * Valida todos los campos requeridos y opcionales según el spec del módulo.
 */
export class CreateEventDto {
  /** Nombre del evento (ej: "Velatorio de María López") */
  @IsString()
  @MinLength(1)
  title: string;

  /** ID del difunto existente (alternativa a deceased) */
  @IsString()
  @IsOptional()
  deceasedId?: string;

  /** Datos del difunto para crear junto al evento (alternativa a deceasedId) */
  @ValidateNested()
  @Type(() => CreateDeceasedDto)
  @IsOptional()
  deceased?: CreateDeceasedDto;

  /** ID de la sala donde se realizará el evento */
  @IsString()
  @IsOptional()
  roomId?: string;

  /** ID del cliente/familia asociada */
  @IsString()
  @IsOptional()
  clientId?: string;

  /** ID del operador asignado para gestionar el evento */
  @IsString()
  @IsOptional()
  assignedToId?: string;

  /** Descripción del servicio funeral */
  @IsString()
  @IsOptional()
  description?: string;

  /** Tipo de ceremonia: VELATORIO, CREMACION, ENTIERRO, MISA, OTRO */
  @IsString()
  ceremonyType: string;

  /** Fecha y hora programada del evento (ISO 8601, con zona horaria del tenant) */
  @IsDateString()
  scheduledAt: string;

  /** Duración estimada en minutos */
  @IsNumber()
  @IsOptional()
  estimatedDuration?: number;

  /** Visibilidad: true = público, false = requiere código de acceso */
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  /** Código de acceso (si isPublic es false) */
  @IsString()
  @IsOptional()
  accessCode?: string;

  /** Modo de moderación de mensajes: AUTO o MANUAL */
  @IsEnum(ModerationMode)
  @IsOptional()
  moderationMode?: ModerationMode;
}
