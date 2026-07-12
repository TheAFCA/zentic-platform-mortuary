import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Room } from '@prisma/client';
import { Venue } from '@zentic/shared-types';
import { assertTenantContext } from '../../common/security/assert-tenant-context';
import { VenuesRepository, VenueWithRooms } from './venues.repository';
import { CreateVenueDto } from './dto/create-venue.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

const ACTIVE_EVENTS_MESSAGE =
  'No se puede eliminar: tiene eventos activos asociados';

@Injectable()
export class VenuesService {
  constructor(private readonly venuesRepo: VenuesRepository) {}

  async list(tenantId: string): Promise<Venue[]> {
    assertTenantContext(tenantId);
    const venues = await this.venuesRepo.findMany(tenantId);
    return venues.map((venue) => this.toVenue(venue));
  }

  async create(tenantId: string, dto: CreateVenueDto): Promise<Venue> {
    assertTenantContext(tenantId);
    const created = await this.venuesRepo.create(tenantId, dto);
    return this.toVenue({ ...created, rooms: [] });
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateVenueDto,
  ): Promise<Venue> {
    assertTenantContext(tenantId);
    const existing = await this.venuesRepo.findById(tenantId, id);
    if (!existing) throw new NotFoundException('Sede no encontrada');

    await this.venuesRepo.update(tenantId, id, dto);
    const updated = await this.venuesRepo.findById(tenantId, id);
    return this.toVenue(updated!);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    assertTenantContext(tenantId);
    const existing = await this.venuesRepo.findById(tenantId, id);
    if (!existing) throw new NotFoundException('Sede no encontrada');

    const activeEvents = await this.venuesRepo.countActiveEventsForVenue(
      tenantId,
      id,
    );
    if (activeEvents > 0) {
      throw new ForbiddenException(ACTIVE_EVENTS_MESSAGE);
    }

    await this.venuesRepo.softDelete(tenantId, id);
  }

  async addRoom(
    tenantId: string,
    venueId: string,
    dto: CreateRoomDto,
  ): Promise<Room> {
    assertTenantContext(tenantId);
    const venue = await this.venuesRepo.findById(tenantId, venueId);
    if (!venue) throw new NotFoundException('Sede no encontrada');

    return this.venuesRepo.createRoom(tenantId, venueId, dto);
  }

  async updateRoom(
    tenantId: string,
    venueId: string,
    roomId: string,
    dto: UpdateRoomDto,
  ): Promise<Room> {
    assertTenantContext(tenantId);
    const room = await this.venuesRepo.findRoomById(tenantId, venueId, roomId);
    if (!room) throw new NotFoundException('Sala no encontrada');

    await this.venuesRepo.updateRoom(tenantId, roomId, dto);
    const updated = await this.venuesRepo.findRoomById(
      tenantId,
      venueId,
      roomId,
    );
    return updated!;
  }

  async removeRoom(
    tenantId: string,
    venueId: string,
    roomId: string,
  ): Promise<void> {
    assertTenantContext(tenantId);
    const room = await this.venuesRepo.findRoomById(tenantId, venueId, roomId);
    if (!room) throw new NotFoundException('Sala no encontrada');

    const activeEvents = await this.venuesRepo.countActiveEventsForRoom(
      tenantId,
      roomId,
    );
    if (activeEvents > 0) {
      throw new ForbiddenException(ACTIVE_EVENTS_MESSAGE);
    }

    await this.venuesRepo.softDeleteRoom(tenantId, roomId);
  }

  private toVenue(venue: VenueWithRooms): Venue {
    return {
      id: venue.id,
      tenantId: venue.tenantId,
      name: venue.name,
      address: venue.address,
      createdAt: venue.createdAt.toISOString(),
      updatedAt: venue.updatedAt.toISOString(),
      rooms: venue.rooms.map((room) => ({
        id: room.id,
        venueId: room.venueId,
        name: room.name,
        capacity: room.capacity,
        createdAt: room.createdAt.toISOString(),
      })),
    };
  }
}
