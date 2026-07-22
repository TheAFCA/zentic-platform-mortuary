import { IsBoolean, IsOptional, IsString } from 'class-validator';

/** Exactamente uno de eventId/obituaryId es requerido — validado en el service (RF-TRIB-005). */
export class GenerateTributeBookDto {
  @IsOptional()
  @IsString()
  eventId?: string;

  @IsOptional()
  @IsString()
  obituaryId?: string;

  @IsOptional()
  @IsBoolean()
  includeStreamingMessages?: boolean;

  @IsOptional()
  @IsBoolean()
  includeObituaryMessages?: boolean;
}
