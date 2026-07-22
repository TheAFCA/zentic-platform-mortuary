import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsString,
  ValidateNested,
} from 'class-validator';
import { MessageOrigin } from '@zentic/shared-types';

class BulkApproveItemDto {
  @IsString()
  id!: string;

  @IsIn(['STREAMING', 'OBITUARY'])
  origin!: MessageOrigin;
}

export class BulkApproveMessagesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkApproveItemDto)
  items!: BulkApproveItemDto[];
}
