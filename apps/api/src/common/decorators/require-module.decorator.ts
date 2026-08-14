import { SetMetadata } from '@nestjs/common';
import { TenantModuleKey } from '@zentic/shared-types';

export const MODULE_KEY = 'required_tenant_module';

export const RequireModule = (module: TenantModuleKey) =>
  SetMetadata(MODULE_KEY, module);
