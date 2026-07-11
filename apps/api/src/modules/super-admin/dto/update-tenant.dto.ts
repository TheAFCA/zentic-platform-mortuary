import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { TenantPlan } from '@zentic/shared-types';

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  country?: string;

  @IsOptional()
  @IsEnum(TenantPlan)
  plan?: TenantPlan;
}
