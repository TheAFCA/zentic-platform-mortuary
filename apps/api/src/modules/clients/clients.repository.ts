import { Injectable } from '@nestjs/common';
import { Client, ClientStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface ClientListFilters {
  search?: string;
  status?: ClientStatus;
  page: number;
  limit: number;
}

export interface CreateClientData {
  name: string;
  email?: string;
  phone?: string;
  relationship?: string;
  notes?: string;
  status?: ClientStatus;
  serviceDate?: Date;
  convertedFrom?: string;
}

export type UpdateClientData = Partial<Omit<CreateClientData, 'convertedFrom'>>;

@Injectable()
export class ClientsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    tenantId: string,
    filters: ClientListFilters,
  ): Promise<{ data: Client[]; total: number }> {
    const where = this.buildWhere(tenantId, filters);
    const [data, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      this.prisma.client.count({ where }),
    ]);
    return { data, total };
  }

  findById(tenantId: string, id: string): Promise<Client | null> {
    return this.prisma.client.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
  }

  findByConvertedFrom(
    tenantId: string,
    convertedFrom: string,
  ): Promise<Client | null> {
    return this.prisma.client.findFirst({
      where: { tenantId, convertedFrom, deletedAt: null },
    });
  }

  create(tenantId: string, data: CreateClientData): Promise<Client> {
    return this.prisma.client.create({ data: { tenantId, ...data } });
  }

  async update(
    tenantId: string,
    id: string,
    data: UpdateClientData,
  ): Promise<void> {
    await this.prisma.client.updateMany({
      where: { id, tenantId, deletedAt: null },
      data,
    });
  }

  findEventHistory(tenantId: string, clientId: string) {
    return this.prisma.event.findMany({
      where: { tenantId, clientId, deletedAt: null },
      orderBy: { scheduledAt: 'desc' },
      select: {
        id: true,
        slug: true,
        status: true,
        scheduledAt: true,
        startedAt: true,
        finishedAt: true,
      },
    });
  }

  findManyForExport(
    tenantId: string,
    filters: Omit<ClientListFilters, 'page' | 'limit'>,
    take: number,
  ): Promise<Client[]> {
    const where = this.buildWhere(tenantId, filters);
    return this.prisma.client.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  private buildWhere(
    tenantId: string,
    filters: Partial<Pick<ClientListFilters, 'search' | 'status'>>,
  ): Prisma.ClientWhereInput {
    return {
      tenantId,
      deletedAt: null,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: 'insensitive' } },
              { email: { contains: filters.search, mode: 'insensitive' } },
              { phone: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }
}
