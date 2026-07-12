import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Client } from '@prisma/client';
import { ClientsService } from './clients.service';
import { ClientsRepository } from './clients.repository';

describe('ClientsService', () => {
  let service: ClientsService;
  let clientsRepo: jest.Mocked<ClientsRepository>;

  const record = (overrides: Partial<Client> = {}): Client => ({
    id: 'client-1',
    tenantId: 'tenant-1',
    name: 'Familia García',
    email: 'garcia@example.com',
    phone: '555-1234',
    relationship: 'Hijo',
    notes: null,
    status: 'ACTIVE',
    serviceDate: null,
    convertedFrom: null,
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    updatedAt: new Date('2026-07-01T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientsService,
        {
          provide: ClientsRepository,
          useValue: {
            findMany: jest.fn(),
            findById: jest.fn(),
            findByConvertedFrom: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            findEventHistory: jest.fn(),
            findManyForExport: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(ClientsService);
    clientsRepo = module.get(ClientsRepository);
  });

  describe('list', () => {
    it('throws ForbiddenException when there is no tenant context', async () => {
      await expect(service.list('', {})).rejects.toThrow(ForbiddenException);
      expect(clientsRepo.findMany).not.toHaveBeenCalled();
    });

    it('returns a paginated response', async () => {
      // ARRANGE
      clientsRepo.findMany.mockResolvedValue({ data: [record()], total: 1 });

      // ACT
      const result = await service.list('tenant-1', { page: 1, limit: 25 });

      // ASSERT
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.data[0].name).toBe('Familia García');
    });
  });

  describe('findById', () => {
    it('throws NotFoundException when the client does not exist in the tenant', async () => {
      // ARRANGE
      clientsRepo.findById.mockResolvedValue(null);

      // ACT & ASSERT
      await expect(service.findById('tenant-1', 'ghost')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns the client with its event history', async () => {
      // ARRANGE
      clientsRepo.findById.mockResolvedValue(record());
      clientsRepo.findEventHistory.mockResolvedValue([]);

      // ACT
      const result = await service.findById('tenant-1', 'client-1');

      // ASSERT
      expect(result.id).toBe('client-1');
      expect(result.events).toEqual([]);
    });
  });

  describe('create', () => {
    it('creates the client when convertedFrom is not provided', async () => {
      // ARRANGE
      clientsRepo.create.mockResolvedValue(record());

      // ACT
      const result = await service.create('tenant-1', {
        name: 'Familia García',
      });

      // ASSERT
      expect(clientsRepo.findByConvertedFrom).not.toHaveBeenCalled();
      expect(result.name).toBe('Familia García');
    });

    it('throws ConflictException when the lead was already converted', async () => {
      // ARRANGE
      clientsRepo.findByConvertedFrom.mockResolvedValue(record());

      // ACT & ASSERT
      await expect(
        service.create('tenant-1', { name: 'Otro', convertedFrom: 'lead-1' }),
      ).rejects.toThrow(ConflictException);
      expect(clientsRepo.create).not.toHaveBeenCalled();
    });

    it('creates the client when the lead has not been converted yet', async () => {
      // ARRANGE
      clientsRepo.findByConvertedFrom.mockResolvedValue(null);
      clientsRepo.create.mockResolvedValue(record({ convertedFrom: 'lead-1' }));

      // ACT
      const result = await service.create('tenant-1', {
        name: 'Familia García',
        convertedFrom: 'lead-1',
      });

      // ASSERT
      expect(result.convertedFrom).toBe('lead-1');
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the client does not exist', async () => {
      // ARRANGE
      clientsRepo.findById.mockResolvedValue(null);

      // ACT & ASSERT
      await expect(
        service.update('tenant-1', 'ghost', { name: 'x' }),
      ).rejects.toThrow(NotFoundException);
      expect(clientsRepo.update).not.toHaveBeenCalled();
    });

    it('updates and returns the refreshed client', async () => {
      // ARRANGE
      clientsRepo.findById
        .mockResolvedValueOnce(record())
        .mockResolvedValueOnce(record({ name: 'Nuevo nombre' }));

      // ACT
      const result = await service.update('tenant-1', 'client-1', {
        name: 'Nuevo nombre',
      });

      // ASSERT
      expect(clientsRepo.update).toHaveBeenCalledWith(
        'tenant-1',
        'client-1',
        expect.objectContaining({ name: 'Nuevo nombre' }),
      );
      expect(result.name).toBe('Nuevo nombre');
    });
  });

  describe('exportCsv', () => {
    it('builds a CSV with a header row and escapes commas/quotes/newlines', async () => {
      // ARRANGE
      clientsRepo.findManyForExport.mockResolvedValue([
        record({ name: 'García, "El Grande"', notes: 'línea1\nlínea2' }),
      ]);

      // ACT
      const { csv, truncated } = await service.exportCsv('tenant-1', {});

      // ASSERT
      expect(truncated).toBe(false);
      expect(csv).toContain('Nombre');
      expect(csv).toContain('"García, ""El Grande"""');
      expect(csv).toContain('"línea1\nlínea2"');
    });

    it('flags truncated when there are more than 5000 matching rows', async () => {
      // ARRANGE
      const rows = Array.from({ length: 5001 }, (_, i) =>
        record({ id: `client-${i}` }),
      );
      clientsRepo.findManyForExport.mockResolvedValue(rows);

      // ACT
      const { csv, truncated } = await service.exportCsv('tenant-1', {});

      // ASSERT
      expect(truncated).toBe(true);
      expect(csv.split('\n')).toHaveLength(5001); // header + 5000 rows
    });
  });
});
