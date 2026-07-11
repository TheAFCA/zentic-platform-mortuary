import { ArrayMaxSize, IsArray, IsString } from 'class-validator';

export class SetUserPermissionsDto {
  // RNF-RBAC-004: el sistema soporta hasta 50 permisos granulares sin degradación.
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  permissions!: string[];
}
