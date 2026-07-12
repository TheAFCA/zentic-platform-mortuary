import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { TenantPlan } from '@zentic/shared-types';

export class CreateTenantDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @Matches(/^[a-z0-9-]+$/, {
    message: 'El slug solo puede tener minúsculas, números y guiones',
  })
  @MaxLength(60)
  slug!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  country?: string;

  @IsEmail()
  adminEmail!: string;

  @IsEnum(TenantPlan)
  plan!: TenantPlan;
}
