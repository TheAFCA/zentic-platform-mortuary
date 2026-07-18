import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { MessageOrigin } from '@zentic/shared-types';

export class RejectMessageDto {
  @IsIn(['STREAMING', 'OBITUARY'])
  origin!: MessageOrigin;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  rejectedReason?: string;
}
