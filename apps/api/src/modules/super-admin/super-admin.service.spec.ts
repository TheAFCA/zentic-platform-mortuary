import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  JwtPayload,
  TenantPlan,
  TenantStatus,
  UserRole,
} from '@zentic/shared-types';
import { SuperAdminService } from './super-admin.service';
import { SuperAdminRepository } from './super-admin.repository';
import { EmailService } from '../email/email.service';

describe('SuperAdminService', () => {
  let service: SuperAdminService;
  let repo: jest.Mocked<SuperAdminRepository>;
  let emailService: jest.Mocked<EmailService>;
  let jwtService: jest.Mocked<JwtService>;

  const actor: JwtPayload = {
    sub: 'super-1',
    email: 'super@zentic.pro',
    role: UserRole.SUPER_ADMIN,
    tenantId: null,
    permissions: [],
  };

  const baseTenant = {
    id: 'tenant-1',
    slug: 'funeraria-demo',
    name: 'Funeraria Demo',
    country: 'Colombia',
    plan: TenantPlan.PRO,
    status: TenantStatus.ACTIVE,
    suspendedAt: null,
    suspendReason: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    featureFlags: [] as { feature: string; enabled: boolean }[],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuperAdminService,
        {
          provide: SuperAdminRepository,
          useValue: {
            findTenants: jest.fn(),
            findTenantById: jest.fn(),
            findTenantBySlug: jest.fn(),
            createTenantWithAdmin: jest.fn(),
            updateTenant: jest.fn(),
            setTenantModules: jest.fn(),
            suspendTenant: jest.fn(),
            reactivateTenant: jest.fn(),
            softDeleteTenant: jest.fn(),
            countActiveEventsForTenant: jest.fn(),
            countUsersForTenant: jest.fn(),
            countEventsForTenant: jest.fn(),
            findTenantAdmin: jest.fn(),
            createImpersonationLog: jest.fn(),
            findImpersonationLogById: jest.fn(),
            endImpersonationLog: jest.fn(),
            findSuperAdmins: jest.fn(),
            findSuperAdminByEmail: jest.fn(),
            findSuperAdminById: jest.fn(),
            createSuperAdmin: jest.fn(),
            countActiveSuperAdmins: jest.fn(),
            setSuperAdminActive: jest.fn(),
            getDashboardMetrics: jest.fn(),
            findAuditLogs: jest.fn(),
            findAuditLogsForExport: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendNewUserCredentialsEmail: jest.fn(),
            sendTenantSuspendedEmail: jest.fn(),
            sendTenantReactivatedEmail: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('signed-token') },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('http://localhost:4200') },
        },
      ],
    }).compile();

    service = module.get<SuperAdminService>(SuperAdminService);
    repo = module.get(SuperAdminRepository);
    emailService = module.get(EmailService);
    jwtService = module.get(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDashboard', () => {
    it('aggregates tenant counts, live events, obituaries and recent audit logs', async () => {
      // ARRANGE
      repo.getDashboardMetrics.mockResolvedValue({
        tenantsByStatus: [
          { status: TenantStatus.ACTIVE, _count: { _all: 3 } },
          { status: TenantStatus.SUSPENDED, _count: { _all: 1 } },
        ],
        liveEvents: 2,
        obituariesToday: 1,
        obituariesThisWeek: 4,
        totalUsers: 10,
        recentAuditLogs: [
          {
            id: 'log-1',
            actorId: 'super-1',
            role: UserRole.SUPER_ADMIN,
            action: 'TENANT_CREATED',
            entityType: 'Tenant',
            entityId: 'tenant-1',
            metadata: null,
            ipAddress: null,
            tenantId: 'tenant-1',
            createdAt: new Date('2026-01-01'),
          },
        ],
      } as never);

      // ACT
      const result = await service.getDashboard();

      // ASSERT
      expect(result.tenants).toEqual({ active: 3, suspended: 1, trial: 0 });
      expect(result.liveEvents).toBe(2);
      expect(result.recentAuditLogs).toHaveLength(1);
      expect(result.recentAuditLogs[0].createdAt).toBe(
        new Date('2026-01-01').toISOString(),
      );
    });
  });

  describe('getTenants / getTenant', () => {
    it('returns a paginated list of tenants', async () => {
      // ARRANGE
      repo.findTenants.mockResolvedValue({
        data: [baseTenant],
        total: 1,
      } as never);

      // ACT
      const result = await service.getTenants({ page: 1, limit: 25 });

      // ASSERT
      expect(result.total).toBe(1);
      expect(result.data[0].slug).toBe('funeraria-demo');
    });

    it('throws NotFoundException when the tenant does not exist', async () => {
      // ARRANGE
      repo.findTenantById.mockResolvedValue(null);

      // ACT & ASSERT
      await expect(service.getTenant('ghost')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns the tenant detail with usage counters', async () => {
      // ARRANGE
      repo.findTenantById.mockResolvedValue(baseTenant as never);
      repo.countUsersForTenant.mockResolvedValue(5);
      repo.countEventsForTenant.mockResolvedValue(2);

      // ACT
      const result = await service.getTenant('tenant-1');

      // ASSERT
      expect(result.usage).toEqual({ users: 5, events: 2 });
    });
  });

  describe('updateTenant', () => {
    it('throws NotFoundException when the tenant does not exist', async () => {
      // ARRANGE
      repo.findTenantById.mockResolvedValue(null);

      // ACT & ASSERT
      await expect(
        service.updateTenant('ghost', actor, { name: 'Nuevo nombre' }),
      ).rejects.toThrow(NotFoundException);
      expect(repo.updateTenant).not.toHaveBeenCalled();
    });

    it('updates the tenant fields', async () => {
      // ARRANGE
      repo.findTenantById.mockResolvedValue(baseTenant as never);
      repo.updateTenant.mockResolvedValue({
        ...baseTenant,
        name: 'Nuevo nombre',
      } as never);

      // ACT
      const result = await service.updateTenant('tenant-1', actor, {
        name: 'Nuevo nombre',
      });

      // ASSERT
      expect(repo.updateTenant).toHaveBeenCalledWith(
        'tenant-1',
        { name: 'Nuevo nombre' },
        actor.sub,
      );
      expect(result.name).toBe('Nuevo nombre');
    });
  });

  describe('updateTenantModules', () => {
    it('throws NotFoundException when the tenant does not exist', async () => {
      // ARRANGE
      repo.findTenantById.mockResolvedValue(null);

      // ACT & ASSERT
      await expect(
        service.updateTenantModules('ghost', actor, {
          enabledModules: ['leads'],
        }),
      ).rejects.toThrow(NotFoundException);
      expect(repo.setTenantModules).not.toHaveBeenCalled();
    });

    it('sets the enabled modules and returns the updated tenant', async () => {
      // ARRANGE
      repo.findTenantById.mockResolvedValue(baseTenant as never);
      repo.setTenantModules.mockResolvedValue({
        ...baseTenant,
        featureFlags: [
          { feature: 'leads', enabled: true },
          { feature: 'venues', enabled: false },
        ],
      } as never);

      // ACT
      const result = await service.updateTenantModules('tenant-1', actor, {
        enabledModules: ['leads'],
      });

      // ASSERT
      expect(repo.setTenantModules).toHaveBeenCalledWith(
        'tenant-1',
        ['leads'],
        actor.sub,
      );
      expect(result.enabledModules).toEqual(['leads']);
    });
  });

  describe('getAuditLogs / exportAuditLogsCsv', () => {
    const auditLog = {
      id: 'log-1',
      actorId: 'super-1',
      role: UserRole.SUPER_ADMIN,
      action: 'TENANT_CREATED',
      entityType: 'Tenant',
      entityId: 'tenant-1',
      metadata: { slug: 'funeraria-demo' },
      ipAddress: '127.0.0.1',
      tenantId: 'tenant-1',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    it('returns a paginated list of audit log entries', async () => {
      // ARRANGE
      repo.findAuditLogs.mockResolvedValue({
        data: [auditLog],
        total: 1,
      } as never);

      // ACT
      const result = await service.getAuditLogs({ page: 1, limit: 25 });

      // ASSERT
      expect(result.total).toBe(1);
      expect(result.data[0].action).toBe('TENANT_CREATED');
    });

    it('builds a CSV export with a header row and escaped values', async () => {
      // ARRANGE
      repo.findAuditLogsForExport.mockResolvedValue([auditLog] as never);

      // ACT
      const csv = await service.exportAuditLogsCsv({});

      // ASSERT
      const lines = csv.split('\n');
      expect(lines[0]).toBe(
        'id,actorId,role,action,entityType,entityId,tenantId,ipAddress,createdAt',
      );
      expect(lines[1]).toContain('log-1');
      expect(lines[1]).toContain('TENANT_CREATED');
    });
  });

  describe('getUsers / createSuperAdmin', () => {
    it('lists super admins with an active flag derived from deletedAt', async () => {
      // ARRANGE
      repo.findSuperAdmins.mockResolvedValue([
        {
          id: 's1',
          email: 'a@zentic.pro',
          createdAt: new Date(),
          deletedAt: null,
          lockedUntil: null,
        },
        {
          id: 's2',
          email: 'b@zentic.pro',
          createdAt: new Date(),
          deletedAt: new Date(),
          lockedUntil: null,
        },
      ] as never);

      // ACT
      const result = await service.getUsers();

      // ASSERT
      expect(result).toEqual([
        expect.objectContaining({ id: 's1', active: true }),
        expect.objectContaining({ id: 's2', active: false }),
      ]);
    });

    it('throws ConflictException when the super admin email already exists', async () => {
      // ARRANGE
      repo.findSuperAdminByEmail.mockResolvedValue({ id: 'existing' } as never);

      // ACT & ASSERT
      await expect(
        service.createSuperAdmin(actor, { email: 'dup@zentic.pro' }),
      ).rejects.toThrow(ConflictException);
      expect(repo.createSuperAdmin).not.toHaveBeenCalled();
    });

    it('creates a new super admin and emails the temporary password', async () => {
      // ARRANGE
      repo.findSuperAdminByEmail.mockResolvedValue(null);
      repo.createSuperAdmin.mockResolvedValue({
        id: 'new-super',
        email: 'new@zentic.pro',
        createdAt: new Date(),
      } as never);

      // ACT
      const result = await service.createSuperAdmin(actor, {
        email: 'new@zentic.pro',
      });

      // ASSERT
      expect(emailService.sendNewUserCredentialsEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'new@zentic.pro' }),
      );
      expect(result.active).toBe(true);
    });
  });

  describe('createTenant', () => {
    it('throws ConflictException when the slug is already taken', async () => {
      // ARRANGE
      repo.findTenantBySlug.mockResolvedValue(baseTenant as never);

      // ACT & ASSERT
      await expect(
        service.createTenant(actor, {
          name: 'Otra',
          slug: 'funeraria-demo',
          adminEmail: 'admin@otra.com',
          plan: TenantPlan.BASIC,
        }),
      ).rejects.toThrow(ConflictException);
      expect(repo.createTenantWithAdmin).not.toHaveBeenCalled();
    });

    it('creates the tenant and admin, and emails the temporary password', async () => {
      // ARRANGE
      repo.findTenantBySlug.mockResolvedValue(null);
      repo.createTenantWithAdmin.mockResolvedValue({
        tenant: baseTenant,
        adminUserId: 'admin-user-1',
      } as never);

      // ACT
      const result = await service.createTenant(actor, {
        name: 'Funeraria Demo',
        slug: 'funeraria-demo',
        adminEmail: 'admin@funeraria-demo.com',
        plan: TenantPlan.PRO,
      });

      // ASSERT
      expect(repo.createTenantWithAdmin).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'funeraria-demo',
          adminEmail: 'admin@funeraria-demo.com',
          actorId: actor.sub,
        }),
      );
      expect(emailService.sendNewUserCredentialsEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'admin@funeraria-demo.com' }),
      );
      expect(result.adminUserId).toBe('admin-user-1');
    });

    it('passes enabledModules through unchanged when provided', async () => {
      // ARRANGE
      repo.findTenantBySlug.mockResolvedValue(null);
      repo.createTenantWithAdmin.mockResolvedValue({
        tenant: baseTenant,
        adminUserId: 'admin-user-1',
      } as never);

      // ACT
      await service.createTenant(actor, {
        name: 'Parque Cementerio',
        slug: 'parque-cementerio',
        adminEmail: 'admin@parque-cementerio.com',
        plan: TenantPlan.BASIC,
        enabledModules: [
          'obituaries',
          'streaming',
          'tribute_book',
          'downloads',
        ],
      });

      // ASSERT
      expect(repo.createTenantWithAdmin).toHaveBeenCalledWith(
        expect.objectContaining({
          enabledModules: [
            'obituaries',
            'streaming',
            'tribute_book',
            'downloads',
          ],
        }),
      );
    });

    it('passes enabledModules as undefined when omitted (repository defaults to all 8)', async () => {
      // ARRANGE
      repo.findTenantBySlug.mockResolvedValue(null);
      repo.createTenantWithAdmin.mockResolvedValue({
        tenant: baseTenant,
        adminUserId: 'admin-user-1',
      } as never);

      // ACT
      await service.createTenant(actor, {
        name: 'Funeraria Demo',
        slug: 'funeraria-demo',
        adminEmail: 'admin@funeraria-demo.com',
        plan: TenantPlan.PRO,
      });

      // ASSERT
      expect(repo.createTenantWithAdmin).toHaveBeenCalledWith(
        expect.objectContaining({ enabledModules: undefined }),
      );
    });
  });

  describe('deleteTenant', () => {
    it('blocks deletion when the tenant has active events (RN-SA-002)', async () => {
      // ARRANGE
      repo.findTenantById.mockResolvedValue(baseTenant as never);
      repo.countActiveEventsForTenant.mockResolvedValue(2);

      // ACT & ASSERT
      await expect(service.deleteTenant('tenant-1', actor)).rejects.toThrow(
        ConflictException,
      );
      expect(repo.softDeleteTenant).not.toHaveBeenCalled();
    });

    it('soft-deletes the tenant when there are no active events', async () => {
      // ARRANGE
      repo.findTenantById.mockResolvedValue(baseTenant as never);
      repo.countActiveEventsForTenant.mockResolvedValue(0);
      repo.softDeleteTenant.mockResolvedValue({
        ...baseTenant,
        status: TenantStatus.DELETED,
      } as never);

      // ACT
      const result = await service.deleteTenant('tenant-1', actor);

      // ASSERT
      expect(repo.softDeleteTenant).toHaveBeenCalledWith('tenant-1', actor.sub);
      expect(result.status).toBe(TenantStatus.DELETED);
    });

    it('throws NotFoundException when the tenant does not exist', async () => {
      // ARRANGE
      repo.findTenantById.mockResolvedValue(null);

      // ACT & ASSERT
      await expect(service.deleteTenant('ghost', actor)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('suspendTenant / reactivateTenant', () => {
    it('suspends the tenant and emails the tenant admin with the reason', async () => {
      // ARRANGE
      repo.findTenantById.mockResolvedValue(baseTenant as never);
      repo.suspendTenant.mockResolvedValue({
        ...baseTenant,
        status: TenantStatus.SUSPENDED,
        suspendedAt: new Date(),
        suspendReason: 'Falta de pago',
      } as never);
      repo.findTenantAdmin.mockResolvedValue({
        email: 'admin@funeraria-demo.com',
      } as never);

      // ACT
      await service.suspendTenant('tenant-1', actor, {
        reason: 'Falta de pago',
      });

      // ASSERT
      expect(repo.suspendTenant).toHaveBeenCalledWith(
        'tenant-1',
        'Falta de pago',
        actor.sub,
      );
      expect(emailService.sendTenantSuspendedEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'admin@funeraria-demo.com',
          reason: 'Falta de pago',
        }),
      );
    });

    it('reactivates the tenant and emails the tenant admin', async () => {
      // ARRANGE
      repo.findTenantById.mockResolvedValue(baseTenant as never);
      repo.reactivateTenant.mockResolvedValue(baseTenant as never);
      repo.findTenantAdmin.mockResolvedValue({
        email: 'admin@funeraria-demo.com',
      } as never);

      // ACT
      await service.reactivateTenant('tenant-1', actor);

      // ASSERT
      expect(repo.reactivateTenant).toHaveBeenCalledWith('tenant-1', actor.sub);
      expect(emailService.sendTenantReactivatedEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'admin@funeraria-demo.com' }),
      );
    });
  });

  describe('impersonate', () => {
    it('throws NotFoundException when the tenant does not exist', async () => {
      // ARRANGE
      repo.findTenantById.mockResolvedValue(null);

      // ACT & ASSERT
      await expect(
        service.impersonate('ghost', actor, { reason: 'Soporte' }),
      ).rejects.toThrow(NotFoundException);
      expect(repo.createImpersonationLog).not.toHaveBeenCalled();
    });

    it('creates an impersonation log and signs a 30-minute access token with no refresh token', async () => {
      // ARRANGE
      repo.findTenantById.mockResolvedValue(baseTenant as never);
      repo.createImpersonationLog.mockResolvedValue({
        id: 'log-1',
        superAdminId: actor.sub,
        tenantId: 'tenant-1',
        reason: 'Soporte',
        startedAt: new Date(),
        endedAt: null,
      } as never);

      // ACT
      const result = await service.impersonate('tenant-1', actor, {
        reason: 'Soporte',
      });

      // ASSERT
      expect(repo.createImpersonationLog).toHaveBeenCalledWith({
        superAdminId: actor.sub,
        tenantId: 'tenant-1',
        reason: 'Soporte',
      });
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          impersonatedTenantId: 'tenant-1',
          impersonationLogId: 'log-1',
        }),
        { expiresIn: '30m' },
      );
      expect(jwtService.sign).toHaveBeenCalledTimes(1);
      expect(result.accessToken).toBe('signed-token');
      expect(result.impersonationLogId).toBe('log-1');
    });
  });

  describe('endImpersonation', () => {
    it('throws ForbiddenException when ending another super admin session', async () => {
      // ARRANGE
      repo.findImpersonationLogById.mockResolvedValue({
        id: 'log-1',
        superAdminId: 'someone-else',
        tenantId: 'tenant-1',
        reason: 'Soporte',
        startedAt: new Date(),
        endedAt: null,
      } as never);

      // ACT & ASSERT
      await expect(service.endImpersonation('log-1', actor)).rejects.toThrow(
        ForbiddenException,
      );
      expect(repo.endImpersonationLog).not.toHaveBeenCalled();
    });
  });

  describe('updateSuperAdmin (RN-SA-006)', () => {
    it('blocks deactivating the last active super admin', async () => {
      // ARRANGE
      repo.findSuperAdminById.mockResolvedValue({
        id: 'super-1',
        email: 'super@zentic.pro',
      } as never);
      repo.countActiveSuperAdmins.mockResolvedValue(0);

      // ACT & ASSERT
      await expect(
        service.updateSuperAdmin('super-1', actor, { active: false }),
      ).rejects.toThrow(ConflictException);
      expect(repo.setSuperAdminActive).not.toHaveBeenCalled();
    });

    it('allows deactivating when another active super admin remains', async () => {
      // ARRANGE
      repo.findSuperAdminById.mockResolvedValue({
        id: 'super-1',
        email: 'super@zentic.pro',
      } as never);
      repo.countActiveSuperAdmins.mockResolvedValue(1);
      repo.setSuperAdminActive.mockResolvedValue({
        id: 'super-1',
        email: 'super@zentic.pro',
        deletedAt: new Date(),
      } as never);

      // ACT
      const result = await service.updateSuperAdmin('super-1', actor, {
        active: false,
      });

      // ASSERT
      expect(repo.setSuperAdminActive).toHaveBeenCalledWith(
        'super-1',
        false,
        actor.sub,
      );
      expect(result.active).toBe(false);
    });
  });
});
