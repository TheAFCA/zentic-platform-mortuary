import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtPayload } from '@zentic/shared-types';
import { InvitationsService } from './invitations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { UpdateInvitationDto } from './dto/update-invitation.dto';
import { ListInvitationsQueryDto } from './dto/list-invitations-query.dto';

@ApiTags('invitations')
@ApiBearerAuth()
@Controller('invitations')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Get()
  @RequirePermission('invitations:read')
  findAll(
    @TenantId() tenantId: string,
    @Query() query: ListInvitationsQueryDto,
  ) {
    return this.invitationsService.findAll(tenantId, query);
  }

  @Get(':id')
  @RequirePermission('invitations:read')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.invitationsService.findOne(tenantId, id);
  }

  @Post()
  @RequirePermission('invitations:manage')
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateInvitationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.invitationsService.create(tenantId, dto, user.sub);
  }

  @Patch(':id')
  @RequirePermission('invitations:manage')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateInvitationDto,
  ) {
    return this.invitationsService.update(tenantId, id, dto);
  }

  @Post(':id/publish')
  @RequirePermission('invitations:manage')
  publish(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.invitationsService.publish(tenantId, id);
  }

  @Post(':id/image')
  @RequirePermission('invitations:manage')
  async generateImage(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.invitationsService.generateImage(
      tenantId,
      id,
    );
    res.header('Content-Type', 'image/png');
    res.header('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Public()
  @Get(':publicUrl/public')
  findPublic(
    @TenantId() tenantId: string,
    @Param('publicUrl') publicUrl: string,
  ) {
    return this.invitationsService.findPublic(tenantId, publicUrl);
  }
}
