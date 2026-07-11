import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ClientStatus } from '@zentic/shared-types';

export class CreateClientDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  relationship?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(ClientStatus)
  status?: ClientStatus;

  @IsOptional()
  @IsDateString()
  serviceDate?: string;

  // Presente cuando el cliente se crea a partir de un lead (RF-ADMIN-006); el formulario del
  // frontend viene pre-rellenado con los datos del lead que ya tiene en mano.
  @IsOptional()
  @IsString()
  convertedFrom?: string;
}
