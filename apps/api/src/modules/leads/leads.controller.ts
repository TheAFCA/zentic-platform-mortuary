import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { LeadsService } from './leads.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('leads')
@ApiBearerAuth()
@Controller('leads')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  @RequirePermission('leads:read')
  findAll(@TenantId() tenantId: string) {
    return this.leadsService.findAll(tenantId);
  }

  @Get('metrics')
  @RequirePermission('leads:read')
  getMetrics(@TenantId() tenantId: string) {
    return this.leadsService.getMetrics(tenantId);
  }

  @Get('export')
  @RequirePermission('leads:export')
  export(@TenantId() tenantId: string) {
    return this.leadsService.exportCsv(tenantId);
  }

  @Get(':id')
  @RequirePermission('leads:read')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.leadsService.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermission('leads:manage')
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() body: unknown) {
    return this.leadsService.update(tenantId, id, body);
  }

  @Post(':id/notes')
  @RequirePermission('leads:manage')
  addNote(@TenantId() tenantId: string, @Param('id') id: string, @Body() body: unknown) {
    return this.leadsService.addNote(tenantId, id, body);
  }

  @Post(':id/convert')
  @RequirePermission('clients:manage')
  convert(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.leadsService.convert(tenantId, id);
  }

  @Delete(':id')
  @RequirePermission('leads:manage')
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.leadsService.remove(tenantId, id);
  }
}
