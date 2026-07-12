import { IsString, MaxLength, MinLength } from 'class-validator';

export class ImpersonateTenantDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}
