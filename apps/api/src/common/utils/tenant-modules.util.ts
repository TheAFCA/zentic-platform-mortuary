import { TENANT_MODULE_KEYS, TenantModuleKey } from '@zentic/shared-types';

export function toEnabledModules(
  flags: { feature: string; enabled: boolean }[] | undefined,
): TenantModuleKey[] {
  return TENANT_MODULE_KEYS.filter(
    (key) => flags?.find((f) => f.feature === key)?.enabled === true,
  );
}
