import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

// Mismo catálogo que streaming (CreateEventDto) — no divergir entre módulos.
const VALID_SERVICE_TYPES = [
  'VELATORIO',
  'CREMACION',
  'ENTIERRO',
  'MISA',
  'OTRO',
] as const;

export class CreateObituaryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  lastName!: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsDateString()
  deathDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  birthCity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  deathCity?: string;

  // RF-OBT-003: editor de texto enriquecido restringido — se sanitiza igual en el service,
  // sin confiar en lo que envía el cliente.
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  biography?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  epitaph?: string;

  @IsOptional()
  @IsEnum(VALID_SERVICE_TYPES)
  serviceType?: string;

  @IsOptional()
  @IsDateString()
  serviceAt?: string;

  @IsOptional()
  @IsString()
  roomId?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsString()
  accessCode?: string;
}
