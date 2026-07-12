import { IsBoolean } from 'class-validator';

export class UpdateSuperAdminDto {
  @IsBoolean()
  active!: boolean;
}
