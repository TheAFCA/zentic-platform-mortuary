import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Room, Venue as VenueRecord } from '@prisma/client';
import { VenuesService } from './venues.service';
import { VenuesRepository, VenueWithRooms } from './venues.repository';

describe('VenuesService', () => {
  let service: VenuesService;
  let venuesRepo: jest.Mocked<VenuesRepository>;

  const venueRecord = (overrides: Partial<VenueRecord> = {}): VenueRecord => ({
    id: 'venue-1',
    tenantId: 'tenant-1',
    name: 'Sede Central',
    address: 'Calle 1',
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    updatedAt: new Date('2026-07-01T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  });

  const roomRecord = (overrides: Partial<Room> = {}): Room => ({
    id: 'room-1',
    tenantId: 'tenant-1',
    venueId: 'venue-1',
    name: 'Sala A',
    capacity: 50,
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  });

  const venueWithRooms = (rooms: Room[] = []): VenueWithRooms => ({
    ...venueRecord(),
    rooms,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VenuesService,
        {
          provide: VenuesRepository,
          useValue: {
            findMany: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
            findRoomById: jest.fn(),
            createRoom: jest.fn(),
            updateRoom: jest.fn(),
            softDeleteRoom: jest.fn(),
            countActiveEventsForRoom: jest.fn(),
            countActiveEventsForVenue: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(VenuesService);
    venuesRepo = module.get(VenuesRepository);
  });

  describe('list', () => {
    it('throws ForbiddenException when there is no tenant context', async () => {
      await expect(service.list('')).rejects.toThrow(ForbiddenException);
    });

    it('maps venues with their rooms', async () => {
      // ARRANGE
      venuesRepo.findMany.mockResolvedValue([venueWithRooms([roomRecord()])]);

      // ACT
      const result = await service.list('tenant-1');

      // ASSERT
      expect(result).toHaveLength(1);
      expect(result[0].rooms).toHaveLength(1);
      expect(result[0].rooms[0].name).toBe('Sala A');
    });
  });

  describe('create', () => {
    it('throws ForbiddenException when there is no tenant context', async () => {
      await expect(service.create('', { name: 'x' })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('creates the venue and returns it with an empty room list', async () => {
      // ARRANGE
      venuesRepo.create.mockResolvedValue(venueRecord());

      // ACT
      const result = await service.create('tenant-1', {
        name: 'Sede Central',
        address: 'Calle 1',
      });

      // ASSERT
      expect(result.name).toBe('Sede Central');
      expect(result.rooms).toEqual([]);
    });
  });

  describe('update (venue)', () => {
    it('throws NotFoundException when the venue does not exist', async () => {
      // ARRANGE
      venuesRepo.findById.mockResolvedValue(null);

      // ACT & ASSERT
      await expect(
        service.update('tenant-1', 'ghost', { name: 'x' }),
      ).rejects.toThrow(NotFoundException);
      expect(venuesRepo.update).not.toHaveBeenCalled();
    });

    it('updates and returns the refreshed venue', async () => {
      // ARRANGE
      venuesRepo.findById
        .mockResolvedValueOnce(venueWithRooms([]))
        .mockResolvedValueOnce({
          ...venueWithRooms([]),
          name: 'Nueva sede',
        });

      // ACT
      const result = await service.update('tenant-1', 'venue-1', {
        name: 'Nueva sede',
      });

      // ASSERT
      expect(venuesRepo.update).toHaveBeenCalledWith('tenant-1', 'venue-1', {
        name: 'Nueva sede',
      });
      expect(result.name).toBe('Nueva sede');
    });
  });

  describe('updateRoom', () => {
    it('throws NotFoundException when the room does not exist', async () => {
      // ARRANGE
      venuesRepo.findRoomById.mockResolvedValue(null);

      // ACT & ASSERT
      await expect(
        service.updateRoom('tenant-1', 'venue-1', 'ghost', { name: 'x' }),
      ).rejects.toThrow(NotFoundException);
      expect(venuesRepo.updateRoom).not.toHaveBeenCalled();
    });

    it('updates and returns the refreshed room', async () => {
      // ARRANGE
      venuesRepo.findRoomById
        .mockResolvedValueOnce(roomRecord())
        .mockResolvedValueOnce(roomRecord({ name: 'Sala renovada' }));

      // ACT
      const result = await service.updateRoom('tenant-1', 'venue-1', 'room-1', {
        name: 'Sala renovada',
      });

      // ASSERT
      expect(venuesRepo.updateRoom).toHaveBeenCalledWith('tenant-1', 'room-1', {
        name: 'Sala renovada',
      });
      expect(result.name).toBe('Sala renovada');
    });
  });

  describe('remove (venue)', () => {
    it('throws NotFoundException when the venue does not exist', async () => {
      // ARRANGE
      venuesRepo.findById.mockResolvedValue(null);

      // ACT & ASSERT
      await expect(service.remove('tenant-1', 'ghost')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when any room has active events', async () => {
      // ARRANGE
      venuesRepo.findById.mockResolvedValue(venueWithRooms([roomRecord()]));
      venuesRepo.countActiveEventsForVenue.mockResolvedValue(2);

      // ACT & ASSERT
      await expect(service.remove('tenant-1', 'venue-1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(venuesRepo.softDelete).not.toHaveBeenCalled();
    });

    it('soft-deletes the venue when there are no active events', async () => {
      // ARRANGE
      venuesRepo.findById.mockResolvedValue(venueWithRooms([]));
      venuesRepo.countActiveEventsForVenue.mockResolvedValue(0);

      // ACT
      await service.remove('tenant-1', 'venue-1');

      // ASSERT
      expect(venuesRepo.softDelete).toHaveBeenCalledWith('tenant-1', 'venue-1');
    });
  });

  describe('removeRoom', () => {
    it('throws NotFoundException when the room does not exist', async () => {
      // ARRANGE
      venuesRepo.findRoomById.mockResolvedValue(null);

      // ACT & ASSERT
      await expect(
        service.removeRoom('tenant-1', 'venue-1', 'ghost'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when the room has active events', async () => {
      // ARRANGE
      venuesRepo.findRoomById.mockResolvedValue(roomRecord());
      venuesRepo.countActiveEventsForRoom.mockResolvedValue(1);

      // ACT & ASSERT
      await expect(
        service.removeRoom('tenant-1', 'venue-1', 'room-1'),
      ).rejects.toThrow(ForbiddenException);
      expect(venuesRepo.softDeleteRoom).not.toHaveBeenCalled();
    });

    it('soft-deletes the room when there are no active events', async () => {
      // ARRANGE
      venuesRepo.findRoomById.mockResolvedValue(roomRecord());
      venuesRepo.countActiveEventsForRoom.mockResolvedValue(0);

      // ACT
      await service.removeRoom('tenant-1', 'venue-1', 'room-1');

      // ASSERT
      expect(venuesRepo.softDeleteRoom).toHaveBeenCalledWith(
        'tenant-1',
        'room-1',
      );
    });
  });

  describe('addRoom', () => {
    it('throws NotFoundException when the venue does not exist', async () => {
      // ARRANGE
      venuesRepo.findById.mockResolvedValue(null);

      // ACT & ASSERT
      await expect(
        service.addRoom('tenant-1', 'ghost', { name: 'Sala B' }),
      ).rejects.toThrow(NotFoundException);
      expect(venuesRepo.createRoom).not.toHaveBeenCalled();
    });

    it('creates the room when the venue exists', async () => {
      // ARRANGE
      venuesRepo.findById.mockResolvedValue(venueWithRooms([]));
      venuesRepo.createRoom.mockResolvedValue(roomRecord());

      // ACT
      const result = await service.addRoom('tenant-1', 'venue-1', {
        name: 'Sala A',
      });

      // ASSERT
      expect(result.name).toBe('Sala A');
    });
  });
});
