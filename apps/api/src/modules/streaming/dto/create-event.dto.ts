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
  Min,
  IsUrl,
  IsEmail,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ModerationMode } from '@zentic/shared-types';

const VALID_CEREMONY_TYPES = [
  'VELATORIO',
  'CREMACION',
  'ENTIERRO',
  'MISA',
  'OTRO',
] as const;

class CreateDeceasedDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName: string;

  @IsDateString()
  @IsOptional()
  birthDate?: string;

  @IsDateString()
  @IsOptional()
  deathDate?: string;

  @IsUrl()
  @IsOptional()
  photoUrl?: string;

  @IsString()
  @MaxLength(2000)
  @IsOptional()
  biography?: string;

  @IsString()
  @MaxLength(150)
  @IsOptional()
  epitaph?: string;
}

export class CreateEventDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsString()
  @IsOptional()
  deceasedId?: string;

  // Crea el evento reutilizando el difunto y los datos del servicio de este obituario;
  // al terminar, el backend autovincula Obituary.eventId al evento nuevo.
  @IsString()
  @IsOptional()
  obituaryId?: string;

  @ValidateNested()
  @Type(() => CreateDeceasedDto)
  @IsOptional()
  deceased?: CreateDeceasedDto;

  @IsString()
  @IsOptional()
  roomId?: string;

  @IsString()
  @IsOptional()
  clientId?: string;

  @IsString()
  @IsOptional()
  assignedToId?: string;

  @IsString()
  @MaxLength(2000)
  @IsOptional()
  description?: string;

  @IsString()
  @IsEnum(VALID_CEREMONY_TYPES)
  ceremonyType: string;

  @IsDateString()
  scheduledAt: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  estimatedDuration?: number;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsString()
  @MinLength(4)
  @MaxLength(20)
  @IsOptional()
  accessCode?: string;

  @IsEnum(ModerationMode)
  @IsOptional()
  moderationMode?: ModerationMode;
}
