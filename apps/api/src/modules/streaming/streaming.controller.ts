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
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
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
  EventListItemResponseDto,
  EventDetailResponseDto,
  PublicEventResponseDto,
  StreamCredentialsResponseDto,
  PlaybackResponseDto,
} from './dto';
import {
  STREAM_ACCESS_COOKIE,
  StreamAccessService,
} from './stream-access.service';

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
  constructor(
    private readonly streamingService: StreamingService,
    private readonly streamAccess: StreamAccessService,
  ) {}

  // ── CRUD ────────────────────────────────────────────────────────────

  /**
   * Lista todos los eventos del tenant autenticado.
   * Requiere permiso `streaming:read`.
   */
  @Get()
  @RequirePermission('streaming:read')
  @ApiOkResponse({ type: EventListItemResponseDto, isArray: true })
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
  @ApiOkResponse({ type: EventDetailResponseDto })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.streamingService.findOne(tenantId, id);
  }

  /** Obtiene las credenciales RTMP para configurar el emisor. */
  @Get(':id/credentials')
  @RequirePermission('streaming:manage')
  @ApiOkResponse({ type: StreamCredentialsResponseDto })
  getCredentials(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.streamingService.getCredentials(tenantId, id);
  }

  /** Revela las credenciales mediante una acción explícita y auditada. */
  @Post(':id/credentials/reveal')
  @RequirePermission('streaming:manage')
  @ApiOkResponse({ type: StreamCredentialsResponseDto })
  revealCredentials(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Ip() ip: string,
  ) {
    return this.streamingService.revealCredentials(tenantId, id, user, ip);
  }

  /** Rota la stream key de Mux fuera de una transmisión activa. */
  @Post(':id/credentials/rotate')
  @RequirePermission('streaming:manage')
  @ApiOkResponse({ type: StreamCredentialsResponseDto })
  rotateStreamKey(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Ip() ip: string,
  ) {
    return this.streamingService.rotateStreamKey(tenantId, id, user, ip);
  }

  /** Registra la copia de una stream key previamente revelada. */
  @Post(':id/credentials/audit-copy')
  @RequirePermission('streaming:manage')
  auditCredentialCopy(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Ip() ip: string,
  ) {
    return this.streamingService.auditCredentialCopy(tenantId, id, user, ip);
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
  @ApiOkResponse({ type: PublicEventResponseDto })
  findPublic(@Param('slug') slug: string, @Req() req: Request) {
    return this.streamingService.findPublic(slug, this.accessToken(req));
  }

  /** Obtiene los mensajes aprobados visibles para un espectador autorizado. */
  @Get(':slug/public/messages')
  @Public()
  getPublicMessages(@Param('slug') slug: string, @Req() req: Request) {
    return this.streamingService.getPublicMessages(slug, this.accessToken(req));
  }

  /** Entrega una URL de playback pública o firmada para el espectador actual. */
  @Get(':slug/playback')
  @Public()
  @ApiOkResponse({ type: PlaybackResponseDto })
  getPlayback(@Param('slug') slug: string, @Req() req: Request) {
    return this.streamingService.getPlayback(slug, this.accessToken(req));
  }

  /**
   * Envía un mensaje de homenaje a un evento desde la página pública.
   * No requiere autenticación.
   *
   * @param slug - Slug del evento
   */
  @Post(':slug/messages')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  sendMessage(
    @Param('slug') slug: string,
    @Body() dto: SendMessageDto,
    @Req() req: Request,
  ) {
    return this.streamingService.sendMessage(slug, dto, this.accessToken(req));
  }

  /**
   * Envía una reacción rápida durante un evento en vivo.
   * No requiere autenticación. Implementa rate limiting por IP.
   *
   * @param slug - Slug del evento
   */
  @Post(':slug/reactions')
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  sendReaction(
    @Param('slug') slug: string,
    @Body() dto: SendReactionDto,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    return this.streamingService.sendReaction(
      slug,
      dto,
      ip,
      this.accessToken(req),
    );
  }

  /**
   * Valida el código de acceso de un evento privado.
   * No requiere autenticación. Opcionalmente registra al visitante como lead.
   *
   * @param slug - Slug del evento
   */
  @Post(':slug/access')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async validateAccessCode(
    @Param('slug') slug: string,
    @Body() dto: AccessCodeDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, ...result } =
      await this.streamingService.validateAccessCode(slug, dto);
    res.cookie(
      STREAM_ACCESS_COOKIE,
      accessToken,
      this.streamAccess.cookieOptions(),
    );
    return result;
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

  private accessToken(req: Request): string | undefined {
    return req.cookies?.[STREAM_ACCESS_COOKIE] as string | undefined;
  }
}
