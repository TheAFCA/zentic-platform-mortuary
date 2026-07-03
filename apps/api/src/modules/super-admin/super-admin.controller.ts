import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SuperAdminService } from './super-admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { UserRole } from '@zentic/shared-types';

@ApiTags('super-admin')
@ApiBearerAuth()
@Controller('super-admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Get('dashboard')
  getDashboard() {
    return this.superAdminService.getDashboard();
  }

  @Get('tenants')
  getTenants() {
    return this.superAdminService.getTenants();
  }

  @Post('tenants')
  createTenant(@Body() body: unknown) {
    return this.superAdminService.createTenant(body);
  }

  @Get('tenants/:id')
  getTenant(@Param('id') id: string) {
    return this.superAdminService.getTenant(id);
  }

  @Patch('tenants/:id')
  updateTenant(@Param('id') id: string, @Body() body: unknown) {
    return this.superAdminService.updateTenant(id, body);
  }

  @Post('tenants/:id/suspend')
  suspendTenant(@Param('id') id: string, @Body() body: unknown) {
    return this.superAdminService.suspendTenant(id, body);
  }

  @Post('tenants/:id/reactivate')
  reactivateTenant(@Param('id') id: string) {
    return this.superAdminService.reactivateTenant(id);
  }

  @Delete('tenants/:id')
  deleteTenant(@Param('id') id: string) {
    return this.superAdminService.deleteTenant(id);
  }

  @Post('tenants/:id/impersonate')
  impersonate(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.superAdminService.impersonate(id, body.reason);
  }

  @Get('audit-logs')
  getAuditLogs() {
    return this.superAdminService.getAuditLogs();
  }

  @Get('users')
  getUsers() {
    return this.superAdminService.getUsers();
  }
}
