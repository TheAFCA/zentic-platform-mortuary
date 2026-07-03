import { PrismaClient, UserRole, TenantPlan, TenantStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

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
          create: [
            { feature: 'streaming', enabled: true },
            { feature: 'obituaries', enabled: true },
            { feature: 'leads', enabled: true },
            { feature: 'allies_store', enabled: true },
            { feature: 'album', enabled: true },
            { feature: 'permanent_memorial', enabled: true },
            { feature: 'service_management', enabled: true },
          ],
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
