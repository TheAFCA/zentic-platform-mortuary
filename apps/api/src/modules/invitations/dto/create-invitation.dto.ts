import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { InvitationTemplate } from '@zentic/shared-types';

export class CreateInvitationDto {
  @IsString()
  @IsNotEmpty()
  eventId!: string;

  @IsOptional()
  @IsEnum(InvitationTemplate)
  template?: InvitationTemplate;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  message?: string;

  // Ver Invitation.accessCodeDisplay en el schema — nunca se usa para autenticar.
  @IsOptional()
  @IsString()
  @MaxLength(50)
  accessCodeDisplay?: string;
}
