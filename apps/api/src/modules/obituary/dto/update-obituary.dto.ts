import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

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
  @IsString()
  eventId?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsString()
  accessCode?: string;
}
