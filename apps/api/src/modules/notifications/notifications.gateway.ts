import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, ValidationPipe, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import {
  JwtPayload,
  WsNewMessage,
  WsViewerCount,
  WsStreamStatus,
  UserRole,
  WsObituaryMessage,
} from '@zentic/shared-types';
import { PrismaService } from '../../prisma/prisma.service';
import { EventRoomDto } from './dto/event-room.dto';
import { STREAM_ACCESS_COOKIE } from '../streaming/stream-access.service';
import { REDIS_CLIENT } from '../redis/redis.module';
import { DistributedRateLimiterService } from '../streaming/services/distributed-rate-limiter.service';

@WebSocketGateway({
  namespace: '/events',
  cors: {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:4200',
    credentials: true,
  },
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  private readonly eventViewers = new Map<string, Set<string>>();
  private readonly socketToEvent = new Map<string, string>();
  private readonly VIEWER_PREFIX = 'ws:viewers:';
  private readonly VIEWER_TTL = 120;
  private pubClient: Redis;
  private subClient: Redis;

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly rateLimiter: DistributedRateLimiterService,
  ) {
    this.pubClient = redis;
    this.subClient = redis.duplicate();
  }

  afterInit(server: Server) {
    // Algunos adaptadores de prueba de Nest no exponen el servidor Socket.IO
    // completo. En producción siempre se instala el adaptador Redis.
    if (typeof server.adapter !== 'function') {
      this.logger.warn(
        'Servidor WebSocket sin soporte de adapter; se omite Redis adapter',
      );
      return;
    }
    server.adapter(createAdapter(this.pubClient, this.subClient));
    this.logger.log('WebSocket gateway initialized with Redis adapter');
  }

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    const user = await this.authenticateClient(client);
    if (user) this.socketData(client).user = user;
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    const eventId = this.socketToEvent.get(client.id);
    this.socketToEvent.delete(client.id);
    if (eventId) {
      await this.removeViewer(eventId, client.id);
      await this.broadcastCurrentViewerCount(eventId);
    }
  }

  /**
   * Suscribe un cliente a la sala de un evento específico.
   * El cliente recibirá todos los mensajes y eventos en tiempo real
   * relacionados con ese evento.
   *
   * @param client - Socket del cliente conectado
   * @param data - Objeto con el eventId
   */
  @SubscribeMessage('join-event')
  async handleJoinEvent(
    @ConnectedSocket() client: Socket,
    @MessageBody(new ValidationPipe({ whitelist: true, transform: true }))
    data: EventRoomDto,
  ) {
    const isAllowed = await this.rateLimiter.checkRateLimit(
      'admin_action',
      this.rateLimiter.buildKey({
        ip: client.handshake.address,
        sessionId: client.id,
      }),
    );
    if (!isAllowed) {
      throw new WsException('Demasiadas solicitudes. Intenta más tarde.');
    }

    const event = await this.prisma.event.findFirst({
      where: { id: data.eventId, deletedAt: null },
      select: { tenantId: true, isPublic: true },
    });
    if (!event || !(await this.canViewEvent(client, event, data.eventId))) {
      throw new WsException('No autorizado para acceder a este evento');
    }

    const previousEventId = this.socketToEvent.get(client.id);
    if (previousEventId && previousEventId !== data.eventId) {
      await client.leave(`event:${previousEventId}`);
      await this.removeViewer(previousEventId, client.id);
      await this.broadcastCurrentViewerCount(previousEventId);
    }

    await client.join(`event:${data.eventId}`);
    this.socketToEvent.set(client.id, data.eventId);
    await this.addViewer(data.eventId, client.id);
    this.logger.log(`Client ${client.id} joined event room: ${data.eventId}`);
    await this.broadcastCurrentViewerCount(data.eventId);
  }

  /**
   * Remueve un cliente de la sala de un evento.
   *
   * @param client - Socket del cliente
   * @param data - Objeto con el eventId
   */
  @SubscribeMessage('leave-event')
  async handleLeaveEvent(
    @ConnectedSocket() client: Socket,
    @MessageBody(new ValidationPipe({ whitelist: true, transform: true }))
    data: EventRoomDto,
  ) {
    await client.leave(`event:${data.eventId}`);
    this.socketToEvent.delete(client.id);
    await this.removeViewer(data.eventId, client.id);
    await this.broadcastCurrentViewerCount(data.eventId);
  }

  /**
   * Suscribe un administrador a la sala de moderación de un evento.
   * Los administradores reciben eventos de mensajes pendientes de moderación.
   * Se excluye al administrador del contador de espectadores.
   *
   * @param client - Socket del administrador
   * @param data - Objeto con el eventId
   */
  @SubscribeMessage('join-admin')
  async handleJoinAdmin(
    @ConnectedSocket() client: Socket,
    @MessageBody(new ValidationPipe({ whitelist: true, transform: true }))
    data: EventRoomDto,
  ) {
    const isAllowed = await this.rateLimiter.checkRateLimit(
      'admin_action',
      this.rateLimiter.buildKey({
        ip: client.handshake.address,
        sessionId: client.id,
      }),
    );
    if (!isAllowed) {
      throw new WsException('Demasiadas solicitudes. Intenta más tarde.');
    }

    const user =
      this.socketData(client).user ?? (await this.authenticateClient(client));
    if (!user || !this.canModerate(user)) {
      throw new WsException('No autorizado para moderar este evento');
    }

    const event = await this.prisma.event.findFirst({
      where: { id: data.eventId, deletedAt: null },
      select: { tenantId: true },
    });
    const effectiveTenantId = user.impersonatedTenantId ?? user.tenantId;
    if (
      !event ||
      (user.role !== UserRole.SUPER_ADMIN &&
        event.tenantId !== effectiveTenantId) ||
      (user.impersonatedTenantId && event.tenantId !== effectiveTenantId)
    ) {
      throw new WsException('No autorizado para moderar este evento');
    }

    this.socketData(client).user = user;
    await client.join(`event:${data.eventId}:admin`);
    await this.removeViewer(data.eventId, client.id);
    this.logger.log(`Admin ${client.id} joined admin room: ${data.eventId}`);
    await this.broadcastCurrentViewerCount(data.eventId);
  }

  /**
   * Remueve un administrador de la sala de moderación.
   *
   * @param client - Socket del administrador
   * @param data - Objeto con el eventId
   */
  @SubscribeMessage('leave-admin')
  async handleLeaveAdmin(
    @ConnectedSocket() client: Socket,
    @MessageBody(new ValidationPipe({ whitelist: true, transform: true }))
    data: EventRoomDto,
  ) {
    await client.leave(`event:${data.eventId}:admin`);
  }

  private async addViewer(eventId: string, socketId: string): Promise<void> {
    if (!this.eventViewers.has(eventId)) {
      this.eventViewers.set(eventId, new Set());
    }
    this.eventViewers.get(eventId)!.add(socketId);

    const redisKey = `${this.VIEWER_PREFIX}${eventId}`;
    await this.redis.sadd(redisKey, socketId);
    await this.redis.expire(redisKey, this.VIEWER_TTL);
  }

  private async removeViewer(eventId: string, socketId: string): Promise<void> {
    const viewers = this.eventViewers.get(eventId);
    if (viewers) {
      viewers.delete(socketId);
      if (viewers.size === 0) this.eventViewers.delete(eventId);
    }

    const redisKey = `${this.VIEWER_PREFIX}${eventId}`;
    await this.redis.srem(redisKey, socketId);
  }

  private async broadcastCurrentViewerCount(eventId: string): Promise<void> {
    const localCount = this.eventViewers.get(eventId)?.size ?? 0;

    const redisKey = `${this.VIEWER_PREFIX}${eventId}`;
    let redisCount = 0;
    try {
      redisCount = await this.redis.scard(redisKey);
    } catch {
      redisCount = localCount;
    }

    const count = Math.max(localCount, redisCount);
    this.broadcastViewerCount(eventId, { eventId, tenantId: '', count });

    await this.debouncedSyncViewerCount(eventId, count);
  }

  private readonly syncTimers = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();

  private async debouncedSyncViewerCount(
    eventId: string,
    count: number,
  ): Promise<void> {
    const existing = this.syncTimers.get(eventId);
    if (existing) clearTimeout(existing);

    this.syncTimers.set(
      eventId,
      setTimeout(() => {
        this.syncTimers.delete(eventId);
        void Promise.resolve()
          .then(() =>
            this.prisma.event.updateMany({
              where: { id: eventId },
              data: { viewerCount: count },
            }),
          )
          .catch((error) => {
            this.logger.warn(
              `Error syncing viewer count for ${eventId}: ${error}`,
            );
          });
      }, 5000),
    );
  }

  /**
   * Suscribe un cliente a la sala de un obituario específico (Módulo 10: Libro de
   * Homenajes). A diferencia de los eventos de streaming, la página de obituario es
   * estática por defecto — esta sala solo existe para reflejar cambios de moderación
   * en tiempo real (RNF-TRIB-004).
   *
   * @param client - Socket del cliente conectado
   * @param data - Objeto con el obituaryId
   */
  @SubscribeMessage('join-obituary')
  async handleJoinObituary(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { obituaryId: string },
  ) {
    await client.join(`obituary:${data.obituaryId}`);
    this.logger.log(
      `Client ${client.id} joined obituary room: ${data.obituaryId}`,
    );
  }

  /**
   * Remueve un cliente de la sala de un obituario.
   *
   * @param client - Socket del cliente
   * @param data - Objeto con el obituaryId
   */
  @SubscribeMessage('leave-obituary')
  async handleLeaveObituary(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { obituaryId: string },
  ) {
    await client.leave(`obituary:${data.obituaryId}`);
  }

  /**
   * Transmite un nuevo mensaje aprobado a todos los viewers del evento.
   *
   * @param eventId - Identificador del evento
   * @param payload - Datos del mensaje (autor, contenido, icono, fecha)
   */
  broadcastNewMessage(eventId: string, payload: WsNewMessage) {
    this.server.to(`event:${eventId}`).emit('new-message', payload);
  }

  /**
   * Transmite una actualización del contador de espectadores.
   *
   * @param eventId - Identificador del evento
   * @param payload - Nuevo conteo de viewers
   */
  broadcastViewerCount(eventId: string, payload: WsViewerCount) {
    this.server.to(`event:${eventId}`).emit('viewer-count', payload);
  }

  /**
   * Notifica a todos los viewers sobre un cambio en el estado del stream.
   * Usado cuando el stream pasa a LIVE, PAUSED o FINISHED.
   *
   * @param eventId - Identificador del evento
   * @param payload - Nuevo estado del stream
   */
  broadcastStreamStatus(eventId: string, payload: WsStreamStatus) {
    this.server.to(`event:${eventId}`).emit('stream-status', payload);
  }

  /**
   * Notifica a los administradores sobre un nuevo mensaje pendiente de moderación.
   * Solo se emite a la sala de administración del evento.
   *
   * @param eventId - Identificador del evento
   * @param payload - Datos del mensaje pendiente
   */
  broadcastMessagePending(eventId: string, payload: WsNewMessage) {
    this.server.to(`event:${eventId}:admin`).emit('message-pending', payload);
  }

  /**
   * Transmite una reacción rápida a todos los viewers del evento.
   * Las reacciones no requieren moderación y se muestran como animaciones.
   *
   * @param eventId - Identificador del evento
   * @param payload - Tipo e ícono de la reacción
   */
  broadcastReaction(eventId: string, payload: WsNewMessage) {
    this.server.to(`event:${eventId}`).emit('new-reaction', payload);
  }

  private canModerate(user: JwtPayload): boolean {
    return (
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.TENANT_ADMIN ||
      user.permissions.includes('streaming:moderate')
    );
  }

  private async canViewEvent(
    client: Socket,
    event: { tenantId: string; isPublic: boolean },
    eventId: string,
  ): Promise<boolean> {
    if (event.isPublic) return true;

    const user =
      this.socketData(client).user ?? (await this.authenticateClient(client));
    if (user) {
      this.socketData(client).user = user;
      const effectiveTenantId = user.impersonatedTenantId ?? user.tenantId;
      const hasTenantAccess =
        user.role === UserRole.SUPER_ADMIN
          ? !user.impersonatedTenantId || effectiveTenantId === event.tenantId
          : effectiveTenantId === event.tenantId;
      const hasPermission =
        user.role === UserRole.SUPER_ADMIN ||
        user.role === UserRole.TENANT_ADMIN ||
        user.permissions.some((permission) =>
          ['streaming:read', 'streaming:manage', 'streaming:moderate'].includes(
            permission,
          ),
        );
      if (hasTenantAccess && hasPermission) return true;
    }

    const token = this.extractCookie(client, STREAM_ACCESS_COOKIE);
    if (!token) return false;
    try {
      const payload = await this.jwtService.verifyAsync<{
        type: string;
        eventId: string;
      }>(token, {
        secret: this.config.getOrThrow('STREAM_ACCESS_SECRET'),
        audience: 'stream-viewer',
        issuer: 'zentic',
      });
      return payload.type === 'stream-access' && payload.eventId === eventId;
    } catch {
      return false;
    }
  }

  private socketData(client: Socket): { user?: JwtPayload } {
    return client.data as { user?: JwtPayload };
  }

  private async authenticateClient(client: Socket): Promise<JwtPayload | null> {
    const token = this.extractAccessToken(client);
    if (!token) return null;

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.config.getOrThrow('JWT_SECRET'),
      });
      const user = await this.prisma.user.findFirst({
        where: { id: payload.sub, deletedAt: null },
        select: {
          email: true,
          role: true,
          tenantId: true,
          lockedUntil: true,
          permissions: { select: { permission: true } },
        },
      });
      if (!user || (user.lockedUntil && user.lockedUntil > new Date())) {
        return null;
      }

      return {
        ...payload,
        email: user.email,
        role: user.role as UserRole,
        tenantId: user.tenantId,
        permissions: user.permissions.map(
          ({ permission }) => permission as JwtPayload['permissions'][number],
        ),
      };
    } catch {
      return null;
    }
  }

  private extractAccessToken(client: Socket): string | null {
    const authToken = (client.handshake.auth as { token?: unknown } | undefined)
      ?.token;
    if (typeof authToken === 'string' && authToken.trim()) {
      return authToken.trim();
    }

    return this.extractCookie(client, 'access_token');
  }

  private extractCookie(client: Socket, name: string): string | null {
    const cookieHeader = client.handshake.headers.cookie;
    if (!cookieHeader) return null;
    for (const pair of cookieHeader.split(';')) {
      const separator = pair.indexOf('=');
      if (separator < 0) continue;
      const key = pair.slice(0, separator).trim();
      if (key === name) {
        return decodeURIComponent(pair.slice(separator + 1).trim());
      }
    }
    return null;
  }

  /**
   * Transmite un mensaje de homenaje recién aprobado a los viewers de la página
   * pública de un obituario (Módulo 10: Libro de Homenajes, RNF-TRIB-004).
   *
   * @param obituaryId - Identificador del obituario
   * @param payload - Datos del mensaje (autor, contenido, icono, fecha)
   */
  broadcastObituaryMessage(obituaryId: string, payload: WsObituaryMessage) {
    this.server.to(`obituary:${obituaryId}`).emit('new-message', payload);
  }
}
