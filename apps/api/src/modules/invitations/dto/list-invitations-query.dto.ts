import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { InvitationStatus } from '@zentic/shared-types';

export class ListInvitationsQueryDto {
  @IsOptional()
  @IsEnum(InvitationStatus)
  status?: InvitationStatus;

  @IsOptional()
  @IsString()
  eventId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 25;
}
