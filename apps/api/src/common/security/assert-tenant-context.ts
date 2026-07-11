import { ForbiddenException } from '@nestjs/common';

/**
 * El SUPER_ADMIN se salta TenantGuard/PermissionGuard por diseño (para soporte cross-tenant),
 * pero eso significa que, si entra a una pantalla de tenant sin haber resuelto un tenant real
 * (sin subdominio, sin impersonar), `tenantId` llega vacío/nulo. Sin este chequeo, los repos
 * terminan filtrando por un tenantId vacío y devuelven listas vacías en silencio en vez de un
 * error claro — parece "este tenant no tiene usuarios" cuando en realidad es "no hay tenant".
 */
export function assertTenantContext(tenantId: string | null | undefined): asserts tenantId is string {
  if (!tenantId) {
    throw new ForbiddenException(
      'Esta operación requiere un tenant activo. Si eres Super Admin, usa la impersonación desde el panel de Super Admin.',
    );
  }
}
