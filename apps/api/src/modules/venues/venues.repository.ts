import { Injectable } from '@nestjs/common';
import { EventStatus, Room, Venue } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const ACTIVE_EVENT_STATUSES: EventStatus[] = [
  EventStatus.SCHEDULED,
  EventStatus.LIVE,
  EventStatus.PAUSED,
];

export type VenueWithRooms = Venue & { rooms: Room[] };

export interface CreateVenueData {
  name: string;
  address?: string;
}

export interface CreateRoomData {
  name: string;
  capacity?: number;
}

@Injectable()
export class VenuesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(tenantId: string): Promise<VenueWithRooms[]> {
    return this.prisma.venue.findMany({
      where: { tenantId, deletedAt: null },
      include: { rooms: { where: { deletedAt: null } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(tenantId: string, id: string): Promise<VenueWithRooms | null> {
    return this.prisma.venue.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { rooms: { where: { deletedAt: null } } },
    });
  }

  create(tenantId: string, data: CreateVenueData): Promise<Venue> {
    return this.prisma.venue.create({ data: { tenantId, ...data } });
  }

  async update(
    tenantId: string,
    id: string,
    data: Partial<CreateVenueData>,
  ): Promise<void> {
    await this.prisma.venue.updateMany({
      where: { id, tenantId, deletedAt: null },
      data,
    });
  }

  async softDelete(tenantId: string, id: string): Promise<void> {
    await this.prisma.venue.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  findRoomById(
    tenantId: string,
    venueId: string,
    roomId: string,
  ): Promise<Room | null> {
    return this.prisma.room.findFirst({
      where: { id: roomId, venueId, tenantId, deletedAt: null },
    });
  }

  createRoom(
    tenantId: string,
    venueId: string,
    data: CreateRoomData,
  ): Promise<Room> {
    return this.prisma.room.create({ data: { tenantId, venueId, ...data } });
  }

  async updateRoom(
    tenantId: string,
    roomId: string,
    data: Partial<CreateRoomData>,
  ): Promise<void> {
    await this.prisma.room.updateMany({
      where: { id: roomId, tenantId, deletedAt: null },
      data,
    });
  }

  async softDeleteRoom(tenantId: string, roomId: string): Promise<void> {
    await this.prisma.room.updateMany({
      where: { id: roomId, tenantId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  countActiveEventsForRoom(tenantId: string, roomId: string): Promise<number> {
    return this.prisma.event.count({
      where: {
        tenantId,
        roomId,
        deletedAt: null,
        status: { in: ACTIVE_EVENT_STATUSES },
      },
    });
  }

  countActiveEventsForVenue(
    tenantId: string,
    venueId: string,
  ): Promise<number> {
    return this.prisma.event.count({
      where: {
        tenantId,
        deletedAt: null,
        status: { in: ACTIVE_EVENT_STATUSES },
        room: { venueId },
      },
    });
  }
}
