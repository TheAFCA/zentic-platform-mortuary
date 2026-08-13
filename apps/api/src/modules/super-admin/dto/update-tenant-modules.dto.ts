import { IsArray, IsIn } from 'class-validator';
import { TENANT_MODULE_KEYS, TenantModuleKey } from '@zentic/shared-types';

export class UpdateTenantModulesDto {
  /** Módulos a activar; cualquier módulo configurable fuera de esta lista queda desactivado. */
  @IsArray()
  @IsIn(TENANT_MODULE_KEYS, { each: true })
  enabledModules!: TenantModuleKey[];
}
