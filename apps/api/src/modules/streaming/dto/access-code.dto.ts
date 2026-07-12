import { IsString, IsOptional, IsBoolean, MinLength } from 'class-validator';

/**
 * DTO para validar el código de acceso de un evento privado.
 * También permite registrar al visitante como lead si proporciona sus datos.
 */
export class AccessCodeDto {
  /** Código de acceso alfanumérico proporcionado por el organizador */
  @IsString()
  @MinLength(1)
  code: string;

  /** Nombre completo del visitante (opcional, usado para registro como lead) */
  @IsString()
  @IsOptional()
  name?: string;

  /** Email del visitante (opcional, usado para notificaciones y registro como lead) */
  @IsString()
  @IsOptional()
  email?: string;

  /** Consentimiento para registrar los datos del visitante */
  @IsBoolean()
  @IsOptional()
  consent?: boolean;
}
