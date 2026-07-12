import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtPayload } from '@zentic/shared-types';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';

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
  createUser(
    @TenantId() tenantId: string,
    @CurrentUser() actor: JwtPayload,
    @Body() dto: CreateUserDto,
  ) {
    return this.adminService.createUser(tenantId, actor, dto);
  }

  @Patch('users/:id')
  @RequirePermission('users:manage')
  updateUser(
    @TenantId() tenantId: string,
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.adminService.updateUser(tenantId, actor, id, dto);
  }

  @Get('settings')
  @RequirePermission('settings:read')
  getSettings(@TenantId() tenantId: string) {
    return this.adminService.getSettings(tenantId);
  }

  @Patch('settings')
  @RequirePermission('settings:manage')
  updateSettings(@TenantId() tenantId: string, @Body() dto: UpdateSettingsDto) {
    return this.adminService.updateSettings(tenantId, dto);
  }

  @Get('settings/brand')
  @RequirePermission('settings:read')
  getBrand(@TenantId() tenantId: string) {
    return this.adminService.getBrand(tenantId);
  }

  @Patch('settings/brand')
  @RequirePermission('settings:manage')
  updateBrand(@TenantId() tenantId: string, @Body() dto: UpdateBrandDto) {
    return this.adminService.updateBrand(tenantId, dto);
  }

  @Post('settings/brand/logo')
  @RequirePermission('settings:manage')
  @UseInterceptors(FileInterceptor('file'))
  uploadBrandLogo(
    @TenantId() tenantId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Falta el archivo');
    return this.adminService.uploadBrandLogo(tenantId, file);
  }

  @Post('settings/brand/favicon')
  @RequirePermission('settings:manage')
  @UseInterceptors(FileInterceptor('file'))
  uploadBrandFavicon(
    @TenantId() tenantId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Falta el archivo');
    return this.adminService.uploadBrandFavicon(tenantId, file);
  }
}
