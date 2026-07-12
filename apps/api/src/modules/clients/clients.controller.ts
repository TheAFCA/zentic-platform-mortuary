import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ListClientsQueryDto } from './dto/list-clients-query.dto';

@ApiTags('admin/clients')
@ApiBearerAuth()
@Controller('admin/clients')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  @RequirePermission('clients:read')
  list(@TenantId() tenantId: string, @Query() query: ListClientsQueryDto) {
    return this.clientsService.list(tenantId, query);
  }

  @Get('export')
  @RequirePermission('downloads:access')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="clientes.csv"')
  async exportCsv(
    @TenantId() tenantId: string,
    @Query() query: ListClientsQueryDto,
  ) {
    const { csv } = await this.clientsService.exportCsv(tenantId, query);
    return csv;
  }

  @Get(':id')
  @RequirePermission('clients:read')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.clientsService.findById(tenantId, id);
  }

  @Post()
  @RequirePermission('clients:manage')
  create(@TenantId() tenantId: string, @Body() dto: CreateClientDto) {
    return this.clientsService.create(tenantId, dto);
  }

  @Patch(':id')
  @RequirePermission('clients:manage')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
  ) {
    return this.clientsService.update(tenantId, id, dto);
  }
}
