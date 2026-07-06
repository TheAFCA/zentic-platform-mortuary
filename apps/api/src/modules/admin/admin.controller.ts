import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @RequirePermission('analytics:read')
  getDashboard(@TenantId() tenantId: string) {
    return this.adminService.getDashboard(tenantId);
  }

  @Get('users')
  @RequirePermission('users:read')
  getUsers(@TenantId() tenantId: string) {
    return this.adminService.getUsers(tenantId);
  }

  @Post('users')
  @RequirePermission('users:manage')
  createUser(@TenantId() tenantId: string, @Body() body: unknown) {
    return this.adminService.createUser(tenantId, body);
  }

  @Patch('users/:id')
  @RequirePermission('users:manage')
  updateUser(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.adminService.updateUser(tenantId, id, body);
  }

  @Get('settings')
  @RequirePermission('settings:read')
  getSettings(@TenantId() tenantId: string) {
    return this.adminService.getSettings(tenantId);
  }

  @Patch('settings')
  @RequirePermission('settings:manage')
  updateSettings(@TenantId() tenantId: string, @Body() body: unknown) {
    return this.adminService.updateSettings(tenantId, body);
  }

  @Patch('settings/brand')
  @RequirePermission('settings:manage')
  updateBrand(@TenantId() tenantId: string, @Body() body: unknown) {
    return this.adminService.updateBrand(tenantId, body);
  }
}
