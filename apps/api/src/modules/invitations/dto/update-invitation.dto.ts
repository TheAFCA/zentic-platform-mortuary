import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { InvitationTemplate } from '@zentic/shared-types';

export class UpdateInvitationDto {
  @IsOptional()
  @IsEnum(InvitationTemplate)
  template?: InvitationTemplate;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  message?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  accessCodeDisplay?: string;

  // Sin eventId: el vínculo con el evento es inmutable tras crear la invitación.
}
