import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtPayload, PermissionMeta } from '@zentic/shared-types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { PermissionsService } from './permissions.service';
import { SetUserPermissionsDto } from './dto/set-user-permissions.dto';

@ApiTags('permissions')
@ApiBearerAuth()
@Controller('permissions')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get('catalog')
  @RequirePermission('users:read')
  getCatalog() {
    return this.groupByModule(this.permissionsService.getCatalog());
  }

  @Get('presets')
  @RequirePermission('users:read')
  getPresets() {
    return this.permissionsService.getPresets();
  }

  @Get('users/:userId')
  @RequirePermission('users:read')
  getUserPermissions(@TenantId() tenantId: string, @Param('userId') userId: string) {
    return this.permissionsService.getUserPermissions(tenantId, userId);
  }

  @Patch('users/:userId')
  @RequirePermission('users:manage')
  setUserPermissions(
    @CurrentUser() actor: JwtPayload,
    @Param('userId') userId: string,
    @Body() dto: SetUserPermissionsDto,
  ) {
    return this.permissionsService.setUserPermissions(actor, userId, dto.permissions);
  }

  private groupByModule(catalog: PermissionMeta[]): Record<string, PermissionMeta[]> {
    return catalog.reduce<Record<string, PermissionMeta[]>>((groups, meta) => {
      (groups[meta.module] ??= []).push(meta);
      return groups;
    }, {});
  }
}
