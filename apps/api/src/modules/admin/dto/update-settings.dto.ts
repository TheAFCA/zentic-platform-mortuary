import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

const SUPPORTED_LOCALES = ['es', 'en'] as const;

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsIn(SUPPORTED_LOCALES)
  locale?: (typeof SUPPORTED_LOCALES)[number];

  @IsOptional()
  @IsBoolean()
  notifyNewLead?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyPendingMessages?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyWeeklySummary?: boolean;

  @IsOptional()
  @IsBoolean()
  requireAccessCodeDefault?: boolean;
}
