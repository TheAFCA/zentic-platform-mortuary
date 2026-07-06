import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { StreamingService } from './streaming.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('streaming')
@ApiBearerAuth()
@Controller('events')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
export class StreamingController {
  constructor(private readonly streamingService: StreamingService) {}

  @Get()
  @RequirePermission('streaming:read')
  findAll(@TenantId() tenantId: string) {
    return this.streamingService.findAll(tenantId);
  }

  @Get(':id')
  @RequirePermission('streaming:read')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.streamingService.findOne(tenantId, id);
  }

  @Public()
  @Get(':slug/public')
  findPublic(@Param('slug') slug: string) {
    return this.streamingService.findPublic(slug);
  }

  @Post()
  @RequirePermission('streaming:create')
  create(@TenantId() tenantId: string, @Body() body: unknown) {
    return this.streamingService.create(tenantId, body);
  }

  @Patch(':id')
  @RequirePermission('streaming:update')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.streamingService.update(tenantId, id, body);
  }

  @Delete(':id')
  @RequirePermission('streaming:delete')
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.streamingService.remove(tenantId, id);
  }

  @Post(':id/start')
  @RequirePermission('streaming:manage')
  startStream(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.streamingService.startStream(tenantId, id);
  }

  @Post(':id/stop')
  @RequirePermission('streaming:manage')
  stopStream(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.streamingService.stopStream(tenantId, id);
  }
}
