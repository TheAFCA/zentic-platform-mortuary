import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { MessageStatus, MessageOrigin } from '@zentic/shared-types';

export class ListTributeMessagesQueryDto {
  @IsOptional()
  @IsEnum(MessageStatus)
  status?: MessageStatus;

  @IsOptional()
  @IsIn(['STREAMING', 'OBITUARY'])
  origin?: MessageOrigin;

  @IsOptional()
  @IsString()
  eventId?: string;

  @IsOptional()
  @IsString()
  obituaryId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  // class-transformer aplica la coerción de enableImplicitConversion (Boolean(value), que
  // convierte CUALQUIER string no vacío — incluido "false" — a `true`) ANTES de correr este
  // @Transform, así que `value` ya llega corrompido. Se lee el valor crudo desde `obj`/`key`
  // para poder distinguir "true" de "false" de verdad.
  @IsOptional()
  @Transform(({ obj, key }) => obj[key] === true || obj[key] === 'true')
  @IsBoolean()
  trashed?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}
