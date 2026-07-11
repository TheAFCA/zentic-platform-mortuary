import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Ip,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { StreamingService } from './streaming.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { Public } from '../../common/decorators/public.decorator';
import {
  CreateEventDto,
  UpdateEventDto,
  SendMessageDto,
  SendReactionDto,
  AccessCodeDto,
} from './dto';

@ApiTags('streaming')
@ApiBearerAuth()
@Controller('events')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
export class StreamingController {
  constructor(private readonly streamingService: StreamingService) {}

  // ── CRUD ────────────────────────────────────────────────────────────

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

  @Post()
  @RequirePermission('streaming:create')
  create(@TenantId() tenantId: string, @Body() dto: CreateEventDto) {
    return this.streamingService.create(tenantId, dto);
  }

  @Patch(':id')
  @RequirePermission('streaming:update')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.streamingService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermission('streaming:delete')
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.streamingService.remove(tenantId, id);
  }

  // ── Stream lifecycle ────────────────────────────────────────────────

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

  // ── Public endpoints ────────────────────────────────────────────────

  @Get(':slug/public')
  @Public()
  findPublic(@Param('slug') slug: string) {
    return this.streamingService.findPublic(slug);
  }

  @Post(':slug/messages')
  @Public()
  sendMessage(@Param('slug') slug: string, @Body() dto: SendMessageDto) {
    return this.streamingService.sendMessage(slug, dto);
  }

  @Post(':slug/reactions')
  @Public()
  sendReaction(
    @Param('slug') slug: string,
    @Body() dto: SendReactionDto,
    @Ip() ip: string,
  ) {
    return this.streamingService.sendReaction(slug, dto, ip);
  }

  @Post(':slug/access')
  @Public()
  validateAccessCode(@Param('slug') slug: string, @Body() dto: AccessCodeDto) {
    return this.streamingService.validateAccessCode(slug, dto);
  }

  // ── Messages (authenticated) ────────────────────────────────────────

  @Get(':id/messages')
  @RequirePermission('streaming:read')
  getMessages(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.streamingService.getMessages(tenantId, id);
  }

  @Get(':id/messages/pending')
  @RequirePermission('streaming:moderate')
  getPendingMessages(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.streamingService.getPendingMessages(tenantId, id);
  }

  @Patch(':id/messages/:messageId/approve')
  @RequirePermission('streaming:moderate')
  approveMessage(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('messageId') messageId: string,
  ) {
    return this.streamingService.approveMessage(tenantId, id, messageId);
  }

  @Patch(':id/messages/:messageId/reject')
  @RequirePermission('streaming:moderate')
  rejectMessage(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('messageId') messageId: string,
    @Body('reason') reason?: string,
  ) {
    return this.streamingService.rejectMessage(tenantId, id, messageId, reason);
  }

  @Delete(':id/messages/:messageId')
  @RequirePermission('streaming:moderate')
  deleteMessage(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('messageId') messageId: string,
  ) {
    return this.streamingService.deleteMessage(tenantId, id, messageId);
  }
}
