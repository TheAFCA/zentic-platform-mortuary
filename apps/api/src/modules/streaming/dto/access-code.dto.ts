import {
  IsString,
  IsOptional,
  IsBoolean,
  MinLength,
  MaxLength,
  IsEmail,
} from 'class-validator';

export class AccessCodeDto {
  @IsString()
  @MinLength(4)
  @MaxLength(20)
  code: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsBoolean()
  @IsOptional()
  consent?: boolean;

  @IsString()
  @IsOptional()
  consentVersion?: string;

  @IsString()
  @IsOptional()
  consentSource?: string;
}
