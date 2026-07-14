import { IsEnum, IsOptional } from 'class-validator';
import { MessageStatus } from '@zentic/shared-types';

export class ListObituaryMessagesQueryDto {
  @IsOptional()
  @IsEnum(MessageStatus)
  status?: MessageStatus;
}
