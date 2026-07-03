import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ObituaryService } from './obituary.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('obituaries')
@ApiBearerAuth()
@Controller('obituaries')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
export class ObituaryController {
  constructor(private readonly obituaryService: ObituaryService) {}

  @Get()
  @RequirePermission('obituary:read')
  findAll(@TenantId() tenantId: string) {
    return this.obituaryService.findAll(tenantId);
  }

  @Get(':id')
  @RequirePermission('obituary:read')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.obituaryService.findOne(tenantId, id);
  }

  @Public()
  @Get(':slug/public')
  findPublic(@Param('slug') slug: string) {
    return this.obituaryService.findPublic(slug);
  }

  @Post()
  @RequirePermission('obituary:create')
  create(@TenantId() tenantId: string, @Body() body: unknown) {
    return this.obituaryService.create(tenantId, body);
  }

  @Patch(':id')
  @RequirePermission('obituary:update')
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() body: unknown) {
    return this.obituaryService.update(tenantId, id, body);
  }

  @Post(':id/publish')
  @RequirePermission('obituary:publish')
  publish(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.obituaryService.publish(tenantId, id);
  }

  @Post(':id/unpublish')
  @RequirePermission('obituary:publish')
  unpublish(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.obituaryService.unpublish(tenantId, id);
  }

  @Delete(':id')
  @RequirePermission('obituary:delete')
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.obituaryService.remove(tenantId, id);
  }
}
