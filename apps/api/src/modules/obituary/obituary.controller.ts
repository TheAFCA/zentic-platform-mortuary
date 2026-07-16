import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ObituaryService } from './obituary.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CreateObituaryDto } from './dto/create-obituary.dto';
import { UpdateObituaryDto } from './dto/update-obituary.dto';
import { ListObituariesQueryDto } from './dto/list-obituaries-query.dto';
import { CreateObituaryMessageDto } from './dto/create-obituary-message.dto';

@ApiTags('obituaries')
@ApiBearerAuth()
@Controller('obituaries')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
export class ObituaryController {
  constructor(private readonly obituaryService: ObituaryService) {}

  @Get()
  @RequirePermission('obituary:read')
  findAll(
    @TenantId() tenantId: string,
    @Query() query: ListObituariesQueryDto,
  ) {
    return this.obituaryService.findAll(tenantId, query);
  }

  // Alimenta el picker de "Evento vinculado" del formulario de creación/edición.
  @Get('meta/events')
  @RequirePermission('obituary:create')
  listEvents(@TenantId() tenantId: string) {
    return this.obituaryService.listAvailableEvents(tenantId);
  }

  @Get(':id')
  @RequirePermission('obituary:read')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.obituaryService.findOne(tenantId, id);
  }

  @Public()
  @Get(':slug/public')
  findPublic(
    @TenantId() tenantId: string,
    @Param('slug') slug: string,
    @Query('accessCode') accessCode?: string,
  ) {
    return this.obituaryService.findPublic(tenantId, slug, accessCode);
  }

  @Post()
  @RequirePermission('obituary:create')
  create(@TenantId() tenantId: string, @Body() dto: CreateObituaryDto) {
    return this.obituaryService.create(tenantId, dto);
  }

  @Patch(':id')
  @RequirePermission('obituary:update')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateObituaryDto,
  ) {
    return this.obituaryService.update(tenantId, id, dto);
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

  @Post(':id/photo')
  @RequirePermission('obituary:update')
  @UseInterceptors(FileInterceptor('file'))
  uploadPhoto(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Falta el archivo');
    return this.obituaryService.uploadPhoto(tenantId, id, file);
  }

  @Public()
  @Post(':slug/messages')
  submitMessage(
    @TenantId() tenantId: string,
    @Param('slug') slug: string,
    @Body() dto: CreateObituaryMessageDto,
  ) {
    return this.obituaryService.submitMessage(tenantId, slug, dto);
  }
}
