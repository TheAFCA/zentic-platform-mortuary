import { ArrayMaxSize, IsArray, IsEmail, IsIn, IsOptional, IsString } from 'class-validator';

// Solo OPERATOR/VIEWER: TENANT_ADMIN/SUPER_ADMIN no se crean desde este panel (RN-RBAC-002).
export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsIn(['OPERATOR', 'VIEWER'])
  role!: 'OPERATOR' | 'VIEWER';

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  permissions?: string[];
}
