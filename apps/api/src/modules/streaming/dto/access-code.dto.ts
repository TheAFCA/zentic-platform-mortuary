import { IsString, IsOptional, IsBoolean, MinLength } from 'class-validator';

export class AccessCodeDto {
  @IsString()
  @MinLength(1)
  code: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsBoolean()
  @IsOptional()
  consent?: boolean;
}
