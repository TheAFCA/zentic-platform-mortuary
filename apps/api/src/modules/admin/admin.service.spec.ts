import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { JwtPayload, UserRole } from '@zentic/shared-types';
import { AdminService } from './admin.service';
import { AdminRepository, AdminUserRecord } from './admin.repository';
import { PermissionsService } from '../permissions/permissions.service';
import { EmailService } from '../email/email.service';
import { FilesService } from '../files/files.service';

describe('AdminService', () => {
  let service: AdminService;
  let adminRepo: jest.Mocked<AdminRepository>;
  let permissionsService: jest.Mocked<PermissionsService>;
  let emailService: jest.Mocked<EmailService>;
  let filesService: jest.Mocked<FilesService>;

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
            findAccountSettings: jest.fn(),
            countActiveEventsToday: jest.fn(),
            countObituariesPublished: jest.fn(),
            countPendingMessages: jest.fn(),
            countLeadsInRange: jest.fn(),
            sumLiveViewers: jest.fn(),
            countActiveClients: jest.fn(),
            upsertAccountSettings: jest.fn(),
            findBrandConfig: jest.fn(),
            upsertBrandConfig: jest.fn(),
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
          provide: FilesService,
          useValue: {
            upload: jest.fn(),
            delete: jest.fn(),
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
    filesService = module.get(FilesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDashboard', () => {
    it('throws ForbiddenException when there is no tenant context', async () => {
      // ACT & ASSERT
      await expect(service.getDashboard('')).rejects.toThrow(
        ForbiddenException,
      );
      expect(adminRepo.findAccountSettings).not.toHaveBeenCalled();
    });

    it('aggregates metrics and computes the leads delta percentage', async () => {
      // ARRANGE
      adminRepo.findAccountSettings.mockResolvedValue(null);
      adminRepo.countActiveEventsToday.mockResolvedValue(2);
      adminRepo.countObituariesPublished.mockResolvedValue(5);
      adminRepo.countPendingMessages.mockResolvedValue(3);
      adminRepo.countLeadsInRange
        .mockResolvedValueOnce(10) // este mes
        .mockResolvedValueOnce(5); // mes anterior
      adminRepo.sumLiveViewers.mockResolvedValue(42);
      adminRepo.countActiveClients.mockResolvedValue(7);

      // ACT
      const result = await service.getDashboard('tenant-1');

      // ASSERT
      expect(result).toEqual({
        activeEventsToday: 2,
        obituariesPublishedThisMonth: 5,
        pendingMessages: 3,
        leadsThisMonth: 10,
        leadsLastMonth: 5,
        leadsDeltaPercent: 100,
        liveViewers: 42,
        totalClients: 7,
      });
    });

    it('returns a null leads delta when there were no leads last month (avoids divide-by-zero)', async () => {
      // ARRANGE
      adminRepo.findAccountSettings.mockResolvedValue(null);
      adminRepo.countActiveEventsToday.mockResolvedValue(0);
      adminRepo.countObituariesPublished.mockResolvedValue(0);
      adminRepo.countPendingMessages.mockResolvedValue(0);
      adminRepo.countLeadsInRange
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(0);
      adminRepo.sumLiveViewers.mockResolvedValue(0);
      adminRepo.countActiveClients.mockResolvedValue(0);

      // ACT
      const result = await service.getDashboard('tenant-1');

      // ASSERT
      expect(result.leadsDeltaPercent).toBeNull();
    });
  });

  describe('getSettings', () => {
    it('throws ForbiddenException when there is no tenant context', async () => {
      await expect(service.getSettings('')).rejects.toThrow(ForbiddenException);
    });

    it('returns sane defaults when the tenant has no settings row yet', async () => {
      // ARRANGE
      adminRepo.findAccountSettings.mockResolvedValue(null);

      // ACT
      const result = await service.getSettings('tenant-1');

      // ASSERT
      expect(result).toEqual({
        timezone: 'America/Bogota',
        locale: 'es',
        notifyNewLead: true,
        notifyPendingMessages: true,
        notifyWeeklySummary: false,
        requireAccessCodeDefault: false,
      });
    });

    it('returns the persisted settings when they exist', async () => {
      // ARRANGE
      adminRepo.findAccountSettings.mockResolvedValue({
        id: 'settings-1',
        tenantId: 'tenant-1',
        timezone: 'America/Mexico_City',
        locale: 'en',
        notifyNewLead: false,
        notifyPendingMessages: false,
        notifyWeeklySummary: true,
        requireAccessCodeDefault: true,
        updatedAt: new Date(),
      });

      // ACT
      const result = await service.getSettings('tenant-1');

      // ASSERT
      expect(result.timezone).toBe('America/Mexico_City');
      expect(result.locale).toBe('en');
    });
  });

  describe('updateSettings', () => {
    it('throws ForbiddenException when there is no tenant context', async () => {
      await expect(
        service.updateSettings('', { timezone: 'America/Bogota' }),
      ).rejects.toThrow(ForbiddenException);
      expect(adminRepo.upsertAccountSettings).not.toHaveBeenCalled();
    });

    it('upserts the account settings for the tenant', async () => {
      // ARRANGE
      adminRepo.upsertAccountSettings.mockResolvedValue({} as never);

      // ACT
      await service.updateSettings('tenant-1', { locale: 'en' });

      // ASSERT
      expect(adminRepo.upsertAccountSettings).toHaveBeenCalledWith('tenant-1', {
        locale: 'en',
      });
    });
  });

  describe('updateBrand', () => {
    it('throws ForbiddenException when there is no tenant context', async () => {
      await expect(
        service.updateBrand('', { primaryColor: '#111111' }),
      ).rejects.toThrow(ForbiddenException);
      expect(adminRepo.upsertBrandConfig).not.toHaveBeenCalled();
    });

    it('upserts the brand config for the tenant', async () => {
      // ARRANGE
      adminRepo.upsertBrandConfig.mockResolvedValue({} as never);

      // ACT
      await service.updateBrand('tenant-1', { primaryColor: '#111111' });

      // ASSERT
      expect(adminRepo.upsertBrandConfig).toHaveBeenCalledWith('tenant-1', {
        primaryColor: '#111111',
      });
    });
  });

  describe('uploadBrandLogo', () => {
    const file = {
      buffer: Buffer.from('x'),
      mimetype: 'image/png',
      originalname: 'logo.png',
    };

    it('throws ForbiddenException when there is no tenant context', async () => {
      await expect(service.uploadBrandLogo('', file)).rejects.toThrow(
        ForbiddenException,
      );
      expect(filesService.upload).not.toHaveBeenCalled();
    });

    it('uploads the file, persists the URL and deletes the previous logo', async () => {
      // ARRANGE
      adminRepo.findBrandConfig.mockResolvedValue({
        logoUrl: 'http://localhost:3000/uploads/brand/tenant-1/old.png',
      } as never);
      filesService.upload.mockResolvedValue(
        'http://localhost:3000/uploads/brand/tenant-1/new.png',
      );
      adminRepo.upsertBrandConfig.mockResolvedValue({} as never);

      // ACT
      await service.uploadBrandLogo('tenant-1', file);

      // ASSERT
      expect(filesService.upload).toHaveBeenCalledWith(file, 'brand/tenant-1', {
        maxSizeBytes: 2 * 1024 * 1024,
      });
      expect(adminRepo.upsertBrandConfig).toHaveBeenCalledWith('tenant-1', {
        logoUrl: 'http://localhost:3000/uploads/brand/tenant-1/new.png',
      });
      expect(filesService.delete).toHaveBeenCalledWith(
        'http://localhost:3000/uploads/brand/tenant-1/old.png',
      );
    });

    it('does not attempt to delete anything when there was no previous logo', async () => {
      // ARRANGE
      adminRepo.findBrandConfig.mockResolvedValue(null);
      filesService.upload.mockResolvedValue(
        'http://localhost:3000/uploads/brand/tenant-1/new.png',
      );
      adminRepo.upsertBrandConfig.mockResolvedValue({} as never);

      // ACT
      await service.uploadBrandLogo('tenant-1', file);

      // ASSERT
      expect(filesService.delete).not.toHaveBeenCalled();
    });
  });

  describe('uploadBrandFavicon', () => {
    it('uploads with the favicon size limit', async () => {
      // ARRANGE
      const file = {
        buffer: Buffer.from('x'),
        mimetype: 'image/png',
        originalname: 'favicon.png',
      };
      adminRepo.findBrandConfig.mockResolvedValue(null);
      filesService.upload.mockResolvedValue(
        'http://localhost:3000/uploads/brand/tenant-1/favicon.png',
      );
      adminRepo.upsertBrandConfig.mockResolvedValue({} as never);

      // ACT
      await service.uploadBrandFavicon('tenant-1', file);

      // ASSERT
      expect(filesService.upload).toHaveBeenCalledWith(file, 'brand/tenant-1', {
        maxSizeBytes: 512 * 1024,
      });
    });
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
        {
          id: 'u1',
          email: 'a@x.com',
          role: 'OPERATOR',
          createdAt: new Date(),
          lockedUntil: null,
        },
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
      await expect(
        service.createUser('', actor, { email: 'x@x.com', role: 'OPERATOR' }),
      ).rejects.toThrow(ForbiddenException);
      expect(adminRepo.findUserByEmail).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the email already exists in the tenant', async () => {
      // ARRANGE
      adminRepo.findUserByEmail.mockResolvedValue({ id: 'existing' } as never);

      // ACT & ASSERT
      await expect(
        service.createUser('tenant-1', actor, {
          email: 'dup@x.com',
          role: 'OPERATOR',
        }),
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
      expect(permissionsService.setUserPermissions).toHaveBeenCalledWith(
        actor,
        'new-user',
        ['leads:read'],
      );
      expect(emailService.sendNewUserCredentialsEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'new@x.com',
          loginUrl: 'http://localhost:4200/auth/login',
        }),
      );
      expect(result.permissions).toEqual(['leads:read']);
      expect(
        (result as { temporaryPassword?: string }).temporaryPassword,
      ).toBeUndefined();
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
      const result = await service.createUser('tenant-1', actor, {
        email: 'new@x.com',
        role: 'VIEWER',
      });

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
      await expect(
        service.updateUser('tenant-1', actor, 'ghost', { role: 'OPERATOR' }),
      ).rejects.toThrow(NotFoundException);
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
      expect(adminRepo.updateUserRole).toHaveBeenCalledWith(
        'tenant-1',
        'u1',
        'VIEWER',
      );
      expect(
        permissionsService.revokeNonAssignableForViewer,
      ).toHaveBeenCalledWith('tenant-1', 'u1', actor.sub);
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
      await service.updateUser('tenant-1', actor, 'u1', {
        role: 'VIEWER',
        permissions: ['leads:read'],
      });

      // ASSERT
      expect(
        permissionsService.revokeNonAssignableForViewer,
      ).not.toHaveBeenCalled();
      expect(permissionsService.setUserPermissions).toHaveBeenCalledWith(
        actor,
        'u1',
        ['leads:read'],
      );
    });
  });
});
