import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Client as ClientRecord } from '@prisma/client';
import { Client, PaginatedResponse } from '@zentic/shared-types';
import { assertTenantContext } from '../../common/security/assert-tenant-context';
import { ClientsRepository } from './clients.repository';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ListClientsQueryDto } from './dto/list-clients-query.dto';

const EXPORT_MAX_ROWS = 5000;

@Injectable()
export class ClientsService {
  constructor(private readonly clientsRepo: ClientsRepository) {}

  async list(
    tenantId: string,
    query: ListClientsQueryDto,
  ): Promise<PaginatedResponse<Client>> {
    assertTenantContext(tenantId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;

    const { data, total } = await this.clientsRepo.findMany(tenantId, {
      search: query.search,
      status: query.status,
      page,
      limit,
    });

    return {
      data: data.map((client) => this.toClient(client)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findById(tenantId: string, id: string) {
    assertTenantContext(tenantId);
    const client = await this.clientsRepo.findById(tenantId, id);
    if (!client) throw new NotFoundException('Cliente no encontrado');

    const events = await this.clientsRepo.findEventHistory(tenantId, id);
    return { ...this.toClient(client), events };
  }

  async create(tenantId: string, dto: CreateClientDto): Promise<Client> {
    assertTenantContext(tenantId);

    if (dto.convertedFrom) {
      // RN-ADMIN-005: un lead sólo puede convertirse en cliente una vez.
      const existing = await this.clientsRepo.findByConvertedFrom(
        tenantId,
        dto.convertedFrom,
      );
      if (existing) {
        throw new ConflictException('Este lead ya fue convertido en cliente');
      }
    }

    const created = await this.clientsRepo.create(tenantId, {
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      relationship: dto.relationship,
      notes: dto.notes,
      status: dto.status,
      serviceDate: dto.serviceDate ? new Date(dto.serviceDate) : undefined,
      convertedFrom: dto.convertedFrom,
    });

    return this.toClient(created);
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateClientDto,
  ): Promise<Client> {
    assertTenantContext(tenantId);
    const existing = await this.clientsRepo.findById(tenantId, id);
    if (!existing) throw new NotFoundException('Cliente no encontrado');

    await this.clientsRepo.update(tenantId, id, {
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      relationship: dto.relationship,
      notes: dto.notes,
      status: dto.status,
      serviceDate: dto.serviceDate ? new Date(dto.serviceDate) : undefined,
    });

    const updated = await this.clientsRepo.findById(tenantId, id);
    return this.toClient(updated!);
  }

  async exportCsv(
    tenantId: string,
    query: Pick<ListClientsQueryDto, 'search' | 'status'>,
  ): Promise<{ csv: string; truncated: boolean }> {
    assertTenantContext(tenantId);
    const rows = await this.clientsRepo.findManyForExport(
      tenantId,
      query,
      EXPORT_MAX_ROWS + 1,
    );
    const truncated = rows.length > EXPORT_MAX_ROWS;
    const data = truncated ? rows.slice(0, EXPORT_MAX_ROWS) : rows;

    const header = [
      'Nombre',
      'Email',
      'Teléfono',
      'Relación',
      'Estado',
      'Fecha de servicio',
      'Notas',
      'Creado',
    ];
    const lines = data.map((client) =>
      [
        client.name,
        client.email ?? '',
        client.phone ?? '',
        client.relationship ?? '',
        client.status,
        client.serviceDate?.toISOString() ?? '',
        client.notes ?? '',
        client.createdAt.toISOString(),
      ]
        .map(escapeCsvField)
        .join(','),
    );

    const csv = [header.map(escapeCsvField).join(','), ...lines].join('\n');
    return { csv, truncated };
  }

  private toClient(client: ClientRecord): Client {
    return {
      id: client.id,
      tenantId: client.tenantId,
      name: client.name,
      email: client.email,
      phone: client.phone,
      relationship: client.relationship,
      notes: client.notes,
      status: client.status as Client['status'],
      serviceDate: client.serviceDate?.toISOString() ?? null,
      convertedFrom: client.convertedFrom,
      createdAt: client.createdAt.toISOString(),
      updatedAt: client.updatedAt.toISOString(),
    };
  }
}

function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
