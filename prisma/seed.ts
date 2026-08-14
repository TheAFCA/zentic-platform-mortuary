import { PrismaClient, UserRole, TenantPlan, TenantStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { TENANT_MODULE_KEYS } from '@zentic/shared-types';

const prisma = new PrismaClient();

async function main() {
  // Super Admin
  const superAdminEmail = 'superadmin@zentic.pro';
  const existing = await prisma.user.findFirst({ where: { email: superAdminEmail, tenantId: null } });

  if (!existing) {
    const passwordHash = await bcrypt.hash('Zentic2026!', 12);
    await prisma.user.create({
      data: {
        email: superAdminEmail,
        passwordHash,
        role: UserRole.SUPER_ADMIN,
        tenantId: null,
      },
    });
    console.log('Super admin created:', superAdminEmail);
  }

  // Demo tenant for local development
  const demoSlug = 'demo-funeraria';
  let demoTenant = await prisma.tenant.findUnique({ where: { slug: demoSlug } });

  if (!demoTenant) {
    demoTenant = await prisma.tenant.create({
      data: {
        slug: demoSlug,
        name: 'Funeraria Demo',
        plan: TenantPlan.PRO,
        status: TenantStatus.ACTIVE,
        brandConfig: {
          create: {
            primaryColor: '#1a1a2e',
            secondaryColor: '#16213e',
            textColor: '#333333',
            backgroundColor: '#f5f5f5',
          },
        },
        featureFlags: {
          create: TENANT_MODULE_KEYS.map((feature) => ({ feature, enabled: true })),
        },
      },
    });
    console.log('Demo tenant created:', demoTenant.name);
  }

  // Demo tenant admin
  const adminEmail = 'admin@demo-funeraria.zentic.pro';
  const existingAdmin = await prisma.user.findFirst({
    where: { email: adminEmail, tenantId: demoTenant.id },
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('Demo2026!', 12);
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        role: UserRole.TENANT_ADMIN,
        tenantId: demoTenant.id,
      },
    });
    console.log('Demo tenant admin created:', adminEmail);
  }

  // Demo operator with a couple of granted permissions (Módulo 03: Roles y Permisos) — para
  // poder probar de verdad el flujo de permisos, no solo el bypass de rol de los admins.
  const operatorEmail = 'operador@demo-funeraria.zentic.pro';
  const existingOperator = await prisma.user.findFirst({
    where: { email: operatorEmail, tenantId: demoTenant.id },
  });

  if (!existingOperator) {
    const passwordHash = await bcrypt.hash('Operador2026!', 12);
    const operator = await prisma.user.create({
      data: {
        email: operatorEmail,
        passwordHash,
        role: UserRole.OPERATOR,
        tenantId: demoTenant.id,
      },
    });

    const superAdmin = await prisma.user.findFirst({ where: { email: superAdminEmail, tenantId: null } });
    await prisma.userPermission.createMany({
      data: ['leads:read', 'leads:export', 'obituary:read'].map(permission => ({
        userId: operator.id,
        permission,
        grantedBy: superAdmin?.id ?? operator.id,
      })),
    });
    console.log('Demo operator created:', operatorEmail);
  }

  console.log('Seed completed.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
