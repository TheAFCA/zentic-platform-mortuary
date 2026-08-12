import {
  IsBoolean,
  IsDateString,
  IsEnum,
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

export class UpdateObituaryDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  lastName?: string;

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
