import { IsIn } from 'class-validator';
import { MessageOrigin } from '@zentic/shared-types';

/** Usado por delete/restore, donde solo hace falta identificar la tabla de origen. */
export class MessageOriginDto {
  @IsIn(['STREAMING', 'OBITUARY'])
  origin!: MessageOrigin;
}
