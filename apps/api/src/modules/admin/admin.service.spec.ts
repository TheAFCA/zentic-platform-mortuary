import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { JwtPayload, UserRole } from '@zentic/shared-types';
import { AdminService } from './admin.service';
import { AdminRepository, AdminUserRecord } from './admin.repository';
import { PermissionsService } from '../permissions/permissions.service';
import { EmailService } from '../email/email.service';

describe('AdminService', () => {
  let service: AdminService;
  let adminRepo: jest.Mocked<AdminRepository>;
  let permissionsService: jest.Mocked<PermissionsService>;
  let emailService: jest.Mocked<EmailService>;

  const actor: JwtPayload = {
    sub: 'admin-1',
    email: 'admin@funeraria.com',
    role: UserRole.TENANT_ADMIN,
    tenantId: 'tenant-1',
    permissions: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: AdminRepository,
          useValue: {
            findManyUsers: jest.fn(),
            findUserById: jest.fn(),
            findUserByEmail: jest.fn(),
            createUser: jest.fn(),
            updateUserRole: jest.fn(),
          },
        },
        {
          provide: PermissionsService,
          useValue: {
            setUserPermissions: jest.fn(),
            revokeNonAssignableForViewer: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendNewUserCredentialsEmail: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('http://localhost:4200') },
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    adminRepo = module.get(AdminRepository);
    permissionsService = module.get(PermissionsService);
    emailService = module.get(EmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUsers', () => {
    it('throws ForbiddenException when there is no tenant context (e.g. SUPER_ADMIN without impersonation)', async () => {
      // ACT & ASSERT
      expect(() => service.getUsers('')).toThrow(ForbiddenException);
      expect(adminRepo.findManyUsers).not.toHaveBeenCalled();
    });

    it('returns the users list from the repository', async () => {
      // ARRANGE
      const users: AdminUserRecord[] = [
        { id: 'u1', email: 'a@x.com', role: 'OPERATOR', createdAt: new Date(), lockedUntil: null },
      ];
      adminRepo.findManyUsers.mockResolvedValue(users);

      // ACT
      const result = await service.getUsers('tenant-1');

      // ASSERT
      expect(result).toEqual(users);
      expect(adminRepo.findManyUsers).toHaveBeenCalledWith('tenant-1');
    });
  });

  describe('createUser', () => {
    it('throws ForbiddenException when there is no tenant context', async () => {
      // ACT & ASSERT
      await expect(service.createUser('', actor, { email: 'x@x.com', role: 'OPERATOR' })).rejects.toThrow(
        ForbiddenException,
      );
      expect(adminRepo.findUserByEmail).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the email already exists in the tenant', async () => {
      // ARRANGE
      adminRepo.findUserByEmail.mockResolvedValue({ id: 'existing' } as never);

      // ACT & ASSERT
      await expect(
        service.createUser('tenant-1', actor, { email: 'dup@x.com', role: 'OPERATOR' }),
      ).rejects.toThrow(ConflictException);
      expect(adminRepo.createUser).not.toHaveBeenCalled();
    });

    it('creates the user, assigns requested permissions and emails the temporary password', async () => {
      // ARRANGE
      adminRepo.findUserByEmail.mockResolvedValue(null);
      const created: AdminUserRecord = {
        id: 'new-user',
        email: 'new@x.com',
        role: 'OPERATOR',
        createdAt: new Date(),
        lockedUntil: null,
      };
      adminRepo.createUser.mockResolvedValue(created);
      permissionsService.setUserPermissions.mockResolvedValue({
        userId: 'new-user',
        role: UserRole.OPERATOR,
        permissions: ['leads:read'],
      });

      // ACT
      const result = await service.createUser('tenant-1', actor, {
        email: 'new@x.com',
        role: 'OPERATOR',
        permissions: ['leads:read'],
      });

      // ASSERT
      const [, createArgs] = adminRepo.createUser.mock.calls[0];
      expect(createArgs.email).toBe('new@x.com');
      expect(createArgs.role).toBe('OPERATOR');
      expect(createArgs.passwordHash).toBeTruthy();
      expect(permissionsService.setUserPermissions).toHaveBeenCalledWith(actor, 'new-user', ['leads:read']);
      expect(emailService.sendNewUserCredentialsEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'new@x.com', loginUrl: 'http://localhost:4200/auth/login' }),
      );
      expect(result.permissions).toEqual(['leads:read']);
      expect((result as { temporaryPassword?: string }).temporaryPassword).toBeUndefined();
    });

    it('does not call setUserPermissions when no permissions are requested', async () => {
      // ARRANGE
      adminRepo.findUserByEmail.mockResolvedValue(null);
      adminRepo.createUser.mockResolvedValue({
        id: 'new-user',
        email: 'new@x.com',
        role: 'VIEWER',
        createdAt: new Date(),
        lockedUntil: null,
      });

      // ACT
      const result = await service.createUser('tenant-1', actor, { email: 'new@x.com', role: 'VIEWER' });

      // ASSERT
      expect(permissionsService.setUserPermissions).not.toHaveBeenCalled();
      expect(result.permissions).toEqual([]);
    });
  });

  describe('updateUser', () => {
    it('throws NotFoundException when the target user is not in the tenant', async () => {
      // ARRANGE
      adminRepo.findUserById.mockResolvedValue(null);

      // ACT & ASSERT
      await expect(service.updateUser('tenant-1', actor, 'ghost', { role: 'OPERATOR' })).rejects.toThrow(
        NotFoundException,
      );
      expect(adminRepo.updateUserRole).not.toHaveBeenCalled();
    });

    it('revokes non-viewer-assignable permissions when downgrading to VIEWER without an explicit permission list', async () => {
      // ARRANGE
      adminRepo.findUserById.mockResolvedValue({
        id: 'u1',
        email: 'a@x.com',
        role: 'OPERATOR',
        createdAt: new Date(),
        lockedUntil: null,
      });

      // ACT
      await service.updateUser('tenant-1', actor, 'u1', { role: 'VIEWER' });

      // ASSERT
      expect(adminRepo.updateUserRole).toHaveBeenCalledWith('tenant-1', 'u1', 'VIEWER');
      expect(permissionsService.revokeNonAssignableForViewer).toHaveBeenCalledWith('tenant-1', 'u1', actor.sub);
      expect(permissionsService.setUserPermissions).not.toHaveBeenCalled();
    });

    it('does not call revokeNonAssignableForViewer when an explicit permission list is provided', async () => {
      // ARRANGE
      adminRepo.findUserById.mockResolvedValue({
        id: 'u1',
        email: 'a@x.com',
        role: 'OPERATOR',
        createdAt: new Date(),
        lockedUntil: null,
      });
      permissionsService.setUserPermissions.mockResolvedValue({
        userId: 'u1',
        role: UserRole.VIEWER,
        permissions: ['leads:read'],
      });

      // ACT
      await service.updateUser('tenant-1', actor, 'u1', { role: 'VIEWER', permissions: ['leads:read'] });

      // ASSERT
      expect(permissionsService.revokeNonAssignableForViewer).not.toHaveBeenCalled();
      expect(permissionsService.setUserPermissions).toHaveBeenCalledWith(actor, 'u1', ['leads:read']);
    });
  });
});
