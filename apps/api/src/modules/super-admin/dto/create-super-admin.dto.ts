import { IsEmail } from 'class-validator';

export class CreateSuperAdminDto {
  @IsEmail()
  email!: string;
}
