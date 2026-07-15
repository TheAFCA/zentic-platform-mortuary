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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '@zentic/shared-types';
import {
  CreateEventDto,
  UpdateEventDto,
  SendMessageDto,
  SendReactionDto,
  AccessCodeDto,
} from './dto';

/**
 * Controlador REST del módulo de Streaming.
 *
 * Gestiona el ciclo de vida completo de eventos de transmisión en vivo:
 * CRUD de eventos, control de stream (iniciar/detener), mensajes de homenaje
 * con moderación, reacciones en tiempo real y validación de acceso.
 *
 * @remarks
 * Las rutas autenticadas usan los guards JwtAuthGuard + TenantGuard + PermissionGuard
 * a nivel de clase, mientras que los endpoints públicos (slug) usan @Public()
 * para saltar la autenticación. La documentación Swagger se genera automáticamente
 * mediante los decoradores @ApiTags y @ApiBearerAuth.
 */
@ApiTags('streaming')
@ApiBearerAuth()
@Controller('events')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
export class StreamingController {
  constructor(private readonly streamingService: StreamingService) {}

  // ── CRUD ────────────────────────────────────────────────────────────

  /**
   * Lista todos los eventos del tenant autenticado.
   * Requiere permiso `streaming:read`.
   */
  @Get()
  @RequirePermission('streaming:read')
  findAll(@TenantId() tenantId: string) {
    return this.streamingService.findAll(tenantId);
  }

  /**
   * Obtiene el detalle completo de un evento por su ID.
   * Requiere permiso `streaming:read`.
   *
   * @param id - ID del evento
   */
  @Get(':id')
  @RequirePermission('streaming:read')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.streamingService.findOne(tenantId, id);
  }

  /**
   * Crea un nuevo evento de streaming.
   * Requiere permiso `streaming:create`.
   */
  @Post()
  @RequirePermission('streaming:create')
  create(@TenantId() tenantId: string, @Body() dto: CreateEventDto) {
    return this.streamingService.create(tenantId, dto);
  }

  /**
   * Actualiza un evento existente (excepto si está en LIVE o FINISHED).
   * Requiere permiso `streaming:update`.
   *
   * @param id - ID del evento
   */
  @Patch(':id')
  @RequirePermission('streaming:update')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.streamingService.update(tenantId, id, dto);
  }

  /**
   * Cancela un evento (soft-delete).
   * Requiere permiso `streaming:delete`.
   *
   * @param id - ID del evento
   */
  @Delete(':id')
  @RequirePermission('streaming:delete')
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.streamingService.remove(tenantId, id);
  }

  // ── Stream lifecycle ────────────────────────────────────────────────

  /**
   * Inicia la transmisión en vivo de un evento programado.
   * Cambia el estado a LIVE y notifica a los viewers via Socket.IO.
   * Requiere permiso `streaming:manage`.
   *
   * @param id - ID del evento
   */
  @Post(':id/start')
  @RequirePermission('streaming:manage')
  startStream(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.streamingService.startStream(tenantId, id);
  }

  /**
   * Finaliza la transmisión en vivo y guarda la grabación.
   * Cambia el estado a FINISHED y notifica a los viewers.
   * Requiere permiso `streaming:manage`.
   *
   * @param id - ID del evento
   */
  @Post(':id/stop')
  @RequirePermission('streaming:manage')
  stopStream(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.streamingService.stopStream(tenantId, id);
  }

  // ── Public endpoints ────────────────────────────────────────────────

  /**
   * Obtiene los datos públicos de un evento para la página del viewer.
   * No requiere autenticación.
   *
   * @param slug - Slug único del evento en la URL
   */
  @Get(':slug/public')
  @Public()
  findPublic(@Param('slug') slug: string) {
    return this.streamingService.findPublic(slug);
  }

  /**
   * Envía un mensaje de homenaje a un evento desde la página pública.
   * No requiere autenticación.
   *
   * @param slug - Slug del evento
   */
  @Post(':slug/messages')
  @Public()
  sendMessage(@Param('slug') slug: string, @Body() dto: SendMessageDto) {
    return this.streamingService.sendMessage(slug, dto);
  }

  /**
   * Envía una reacción rápida durante un evento en vivo.
   * No requiere autenticación. Implementa rate limiting por IP.
   *
   * @param slug - Slug del evento
   */
  @Post(':slug/reactions')
  @Public()
  sendReaction(
    @Param('slug') slug: string,
    @Body() dto: SendReactionDto,
    @Ip() ip: string,
  ) {
    return this.streamingService.sendReaction(slug, dto, ip);
  }

  /**
   * Valida el código de acceso de un evento privado.
   * No requiere autenticación. Opcionalmente registra al visitante como lead.
   *
   * @param slug - Slug del evento
   */
  @Post(':slug/access')
  @Public()
  validateAccessCode(@Param('slug') slug: string, @Body() dto: AccessCodeDto) {
    return this.streamingService.validateAccessCode(slug, dto);
  }

  // ── Messages (authenticated) ────────────────────────────────────────

  /**
   * Obtiene los mensajes aprobados de un evento.
   * Requiere permiso `streaming:read`.
   *
   * @param id - ID del evento
   */
  @Get(':id/messages')
  @RequirePermission('streaming:read')
  getMessages(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.streamingService.getMessages(tenantId, id);
  }

  /**
   * Obtiene los mensajes pendientes de moderación.
   * Requiere permiso `streaming:moderate`.
   *
   * @param id - ID del evento
   */
  @Get(':id/messages/pending')
  @RequirePermission('streaming:moderate')
  getPendingMessages(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.streamingService.getPendingMessages(tenantId, id);
  }

  /**
   * Aprueba un mensaje pendiente y lo transmite a los viewers.
   * Requiere permiso `streaming:moderate`.
   *
   * @param id - ID del evento
   * @param messageId - ID del mensaje
   */
  @Patch(':id/messages/:messageId/approve')
  @RequirePermission('streaming:moderate')
  approveMessage(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('messageId') messageId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.streamingService.approveMessage(
      tenantId,
      id,
      messageId,
      user.sub,
    );
  }

  /**
   * Rechaza un mensaje pendiente con una razón opcional.
   * Requiere permiso `streaming:moderate`.
   *
   * @param id - ID del evento
   * @param messageId - ID del mensaje
   */
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

  /**
   * Elimina un mensaje (soft-delete) de la vista pública.
   * Requiere permiso `streaming:moderate`.
   *
   * @param id - ID del evento
   * @param messageId - ID del mensaje
   */
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
