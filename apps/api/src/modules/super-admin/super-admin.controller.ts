import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SuperAdminService } from './super-admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, JwtPayload } from '@zentic/shared-types';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { SuspendTenantDto } from './dto/suspend-tenant.dto';
import { ImpersonateTenantDto } from './dto/impersonate-tenant.dto';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { ListTenantsQueryDto } from './dto/list-tenants-query.dto';
import { CreateSuperAdminDto } from './dto/create-super-admin.dto';
import { UpdateSuperAdminDto } from './dto/update-super-admin.dto';

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
  getTenants(@Query() query: ListTenantsQueryDto) {
    return this.superAdminService.getTenants(query);
  }

  @Post('tenants')
  createTenant(@CurrentUser() actor: JwtPayload, @Body() dto: CreateTenantDto) {
    return this.superAdminService.createTenant(actor, dto);
  }

  @Get('tenants/:id')
  getTenant(@Param('id') id: string) {
    return this.superAdminService.getTenant(id);
  }

  @Patch('tenants/:id')
  updateTenant(
    @Param('id') id: string,
    @CurrentUser() actor: JwtPayload,
    @Body() dto: UpdateTenantDto,
  ) {
    return this.superAdminService.updateTenant(id, actor, dto);
  }

  @Post('tenants/:id/suspend')
  suspendTenant(
    @Param('id') id: string,
    @CurrentUser() actor: JwtPayload,
    @Body() dto: SuspendTenantDto,
  ) {
    return this.superAdminService.suspendTenant(id, actor, dto);
  }

  @Post('tenants/:id/reactivate')
  reactivateTenant(@Param('id') id: string, @CurrentUser() actor: JwtPayload) {
    return this.superAdminService.reactivateTenant(id, actor);
  }

  @Delete('tenants/:id')
  deleteTenant(@Param('id') id: string, @CurrentUser() actor: JwtPayload) {
    return this.superAdminService.deleteTenant(id, actor);
  }

  @Post('tenants/:id/impersonate')
  impersonate(
    @Param('id') id: string,
    @CurrentUser() actor: JwtPayload,
    @Body() dto: ImpersonateTenantDto,
  ) {
    return this.superAdminService.impersonate(id, actor, dto);
  }

  @Post('impersonation/:logId/end')
  endImpersonation(
    @Param('logId') logId: string,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.superAdminService.endImpersonation(logId, actor);
  }

  @Get('audit-logs')
  getAuditLogs(@Query() query: AuditLogQueryDto) {
    return this.superAdminService.getAuditLogs(query);
  }

  @Get('audit-logs/export')
  async exportAuditLogs(
    @Query() query: AuditLogQueryDto,
    @Res() res: Response,
  ) {
    const csv = await this.superAdminService.exportAuditLogsCsv(query);
    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', 'attachment; filename="audit-logs.csv"');
    res.send(csv);
  }

  @Get('users')
  getUsers() {
    return this.superAdminService.getUsers();
  }

  @Post('users')
  createSuperAdmin(
    @CurrentUser() actor: JwtPayload,
    @Body() dto: CreateSuperAdminDto,
  ) {
    return this.superAdminService.createSuperAdmin(actor, dto);
  }

  @Patch('users/:id')
  updateSuperAdmin(
    @Param('id') id: string,
    @CurrentUser() actor: JwtPayload,
    @Body() dto: UpdateSuperAdminDto,
  ) {
    return this.superAdminService.updateSuperAdmin(id, actor, dto);
  }
}
