import { IsString, IsOptional, IsBoolean, IsNumber, IsDateString, IsEnum, ValidateNested, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ModerationMode } from '@zentic/shared-types';

class CreateDeceasedDto {
  @IsString()
  @MinLength(1)
  firstName: string;

  @IsString()
  @MinLength(1)
  lastName: string;

  @IsDateString()
  @IsOptional()
  birthDate?: string;

  @IsDateString()
  @IsOptional()
  deathDate?: string;

  @IsString()
  @IsOptional()
  photoUrl?: string;

  @IsString()
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
  title: string;

  @IsString()
  @IsOptional()
  deceasedId?: string;

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
  description?: string;

  @IsString()
  ceremonyType: string;

  @IsDateString()
  scheduledAt: string;

  @IsNumber()
  @IsOptional()
  estimatedDuration?: number;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsString()
  @IsOptional()
  accessCode?: string;

  @IsEnum(ModerationMode)
  @IsOptional()
  moderationMode?: ModerationMode;
}
