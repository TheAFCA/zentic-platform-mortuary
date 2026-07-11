import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { JwtPayload, UserRole } from '@zentic/shared-types';
import { PermissionsService } from './permissions.service';
import { PermissionsRepository, TargetUser } from './permissions.repository';

describe('PermissionsService', () => {
  let service: PermissionsService;
  let permissionsRepo: jest.Mocked<PermissionsRepository>;

  const tenantAdminActor: JwtPayload = {
    sub: 'admin-1',
    email: 'admin@funeraria.com',
    role: UserRole.TENANT_ADMIN,
    tenantId: 'tenant-1',
    permissions: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        {
          provide: PermissionsRepository,
          useValue: {
            findUserById: jest.fn(),
            findGrantedPermissions: jest.fn(),
            replacePermissions: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PermissionsService>(PermissionsService);
    permissionsRepo = module.get(PermissionsRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCatalog', () => {
    it('returns the full catalog without touching the repository', () => {
      // ACT
      const catalog = service.getCatalog();

      // ASSERT
      expect(catalog.length).toBeGreaterThan(30);
      expect(catalog.some((meta) => meta.code === 'streaming:read')).toBe(true);
      expect(permissionsRepo.findUserById).not.toHaveBeenCalled();
    });
  });

  describe('getEffectivePermissions', () => {
    it('returns every catalog code for TENANT_ADMIN without hitting the repository', async () => {
      // ACT
      const result = await service.getEffectivePermissions(
        'admin-1',
        UserRole.TENANT_ADMIN,
      );

      // ASSERT
      expect(result).toContain('streaming:delete');
      expect(result).toContain('users:manage');
      expect(permissionsRepo.findGrantedPermissions).not.toHaveBeenCalled();
    });

    it('returns exactly the granted permissions for OPERATOR', async () => {
      // ARRANGE
      permissionsRepo.findGrantedPermissions.mockResolvedValue(['leads:read']);

      // ACT
      const result = await service.getEffectivePermissions(
        'operator-1',
        UserRole.OPERATOR,
      );

      // ASSERT
      expect(result).toEqual(['leads:read']);
      expect(permissionsRepo.findGrantedPermissions).toHaveBeenCalledWith(
        'operator-1',
      );
    });
  });

  describe('getUserPermissions', () => {
    it('throws ForbiddenException when there is no tenant context (e.g. SUPER_ADMIN without impersonation)', async () => {
      // ACT & ASSERT
      await expect(service.getUserPermissions('', 'op-1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(permissionsRepo.findUserById).not.toHaveBeenCalled();
    });
  });

  describe('setUserPermissions', () => {
    it('throws ForbiddenException when the actor has no tenant context', async () => {
      // ARRANGE
      const superAdminActor: JwtPayload = {
        sub: 'super-1',
        email: 'super@zentic.pro',
        role: UserRole.SUPER_ADMIN,
        tenantId: null,
        permissions: [],
      };

      // ACT & ASSERT
      await expect(
        service.setUserPermissions(superAdminActor, 'op-1', ['leads:read']),
      ).rejects.toThrow(ForbiddenException);
      expect(permissionsRepo.findUserById).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the target user does not exist in the tenant', async () => {
      // ARRANGE
      permissionsRepo.findUserById.mockResolvedValue(null);

      // ACT & ASSERT
      await expect(
        service.setUserPermissions(tenantAdminActor, 'ghost-user', [
          'leads:read',
        ]),
      ).rejects.toThrow(NotFoundException);
      expect(permissionsRepo.replacePermissions).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException (RN-RBAC-002) when the target is SUPER_ADMIN', async () => {
      // ARRANGE
      const target: TargetUser = {
        id: 'super-1',
        role: UserRole.SUPER_ADMIN,
        tenantId: null,
      };
      permissionsRepo.findUserById.mockResolvedValue(target);

      // ACT & ASSERT
      await expect(
        service.setUserPermissions(tenantAdminActor, 'super-1', ['leads:read']),
      ).rejects.toThrow(ForbiddenException);
      expect(permissionsRepo.replacePermissions).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the target is TENANT_ADMIN', async () => {
      // ARRANGE
      const target: TargetUser = {
        id: 'admin-2',
        role: UserRole.TENANT_ADMIN,
        tenantId: 'tenant-1',
      };
      permissionsRepo.findUserById.mockResolvedValue(target);

      // ACT & ASSERT
      await expect(
        service.setUserPermissions(tenantAdminActor, 'admin-2', ['leads:read']),
      ).rejects.toThrow(BadRequestException);
      expect(permissionsRepo.replacePermissions).not.toHaveBeenCalled();
    });

    it('throws BadRequestException listing unknown permission codes', async () => {
      // ARRANGE
      const target: TargetUser = {
        id: 'op-1',
        role: UserRole.OPERATOR,
        tenantId: 'tenant-1',
      };
      permissionsRepo.findUserById.mockResolvedValue(target);

      // ACT & ASSERT
      await expect(
        service.setUserPermissions(tenantAdminActor, 'op-1', [
          'not-a-real-permission',
        ]),
      ).rejects.toThrow(BadRequestException);
      expect(permissionsRepo.replacePermissions).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException (RN-RBAC-001) when the actor requests a permission it does not hold itself', async () => {
      // ARRANGE
      const operatorActor: JwtPayload = {
        sub: 'operator-actor',
        email: 'op@funeraria.com',
        role: UserRole.OPERATOR,
        tenantId: 'tenant-1',
        permissions: [],
      };
      const target: TargetUser = {
        id: 'op-1',
        role: UserRole.OPERATOR,
        tenantId: 'tenant-1',
      };
      permissionsRepo.findUserById.mockResolvedValue(target);
      // El actor OPERATOR solo tiene 'leads:read' concedido a sí mismo.
      permissionsRepo.findGrantedPermissions.mockImplementation((userId) =>
        Promise.resolve(userId === operatorActor.sub ? ['leads:read'] : []),
      );

      // ACT & ASSERT
      await expect(
        service.setUserPermissions(operatorActor, 'op-1', ['settings:manage']),
      ).rejects.toThrow(ForbiddenException);
      expect(permissionsRepo.replacePermissions).not.toHaveBeenCalled();
    });

    it('throws BadRequestException (RN-RBAC-003) when the target is VIEWER and a write permission is requested', async () => {
      // ARRANGE
      const target: TargetUser = {
        id: 'viewer-1',
        role: UserRole.VIEWER,
        tenantId: 'tenant-1',
      };
      permissionsRepo.findUserById.mockResolvedValue(target);
      permissionsRepo.findGrantedPermissions.mockResolvedValue([]);

      // ACT & ASSERT
      await expect(
        service.setUserPermissions(tenantAdminActor, 'viewer-1', [
          'obituary:create',
        ]),
      ).rejects.toThrow(BadRequestException);
      expect(permissionsRepo.replacePermissions).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when a permission is not assignable to OPERATOR at all', async () => {
      // ARRANGE
      const target: TargetUser = {
        id: 'op-1',
        role: UserRole.OPERATOR,
        tenantId: 'tenant-1',
      };
      permissionsRepo.findUserById.mockResolvedValue(target);
      permissionsRepo.findGrantedPermissions.mockResolvedValue([]);

      // ACT & ASSERT
      await expect(
        service.setUserPermissions(tenantAdminActor, 'op-1', ['users:manage']),
      ).rejects.toThrow(BadRequestException);
      expect(permissionsRepo.replacePermissions).not.toHaveBeenCalled();
    });

    it('diffs current vs requested and replaces via the repository (happy path)', async () => {
      // ARRANGE
      const target: TargetUser = {
        id: 'op-1',
        role: UserRole.OPERATOR,
        tenantId: 'tenant-1',
      };
      permissionsRepo.findUserById.mockResolvedValue(target);
      permissionsRepo.findGrantedPermissions.mockResolvedValue(['leads:read']);

      // ACT
      const result = await service.setUserPermissions(
        tenantAdminActor,
        'op-1',
        ['leads:read', 'leads:export'],
      );

      // ASSERT
      expect(permissionsRepo.replacePermissions).toHaveBeenCalledWith(
        tenantAdminActor.sub,
        'tenant-1',
        'op-1',
        ['leads:export'],
        [],
      );
      expect(result.permissions).toEqual(['leads:read', 'leads:export']);
    });

    it('revokes permissions that are no longer requested', async () => {
      // ARRANGE
      const target: TargetUser = {
        id: 'op-1',
        role: UserRole.OPERATOR,
        tenantId: 'tenant-1',
      };
      permissionsRepo.findUserById.mockResolvedValue(target);
      permissionsRepo.findGrantedPermissions.mockResolvedValue([
        'leads:read',
        'leads:export',
      ]);

      // ACT
      await service.setUserPermissions(tenantAdminActor, 'op-1', [
        'leads:read',
      ]);

      // ASSERT
      expect(permissionsRepo.replacePermissions).toHaveBeenCalledWith(
        tenantAdminActor.sub,
        'tenant-1',
        'op-1',
        [],
        ['leads:export'],
      );
    });
  });

  describe('revokeNonAssignableForViewer', () => {
    it('revokes only the currently-granted permissions that are not viewer-assignable', async () => {
      // ARRANGE
      permissionsRepo.findGrantedPermissions.mockResolvedValue([
        'leads:read',
        'obituary:create',
      ]);

      // ACT
      await service.revokeNonAssignableForViewer('tenant-1', 'op-1', 'admin-1');

      // ASSERT
      expect(permissionsRepo.replacePermissions).toHaveBeenCalledWith(
        'admin-1',
        'tenant-1',
        'op-1',
        [],
        ['obituary:create'],
      );
    });

    it('does not call the repository when nothing needs revoking', async () => {
      // ARRANGE
      permissionsRepo.findGrantedPermissions.mockResolvedValue(['leads:read']);

      // ACT
      await service.revokeNonAssignableForViewer('tenant-1', 'op-1', 'admin-1');

      // ASSERT
      expect(permissionsRepo.replacePermissions).not.toHaveBeenCalled();
    });
  });
});
