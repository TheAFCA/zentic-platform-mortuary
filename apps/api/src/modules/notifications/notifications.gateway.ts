import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import {
  WsNewMessage,
  WsViewerCount,
  WsStreamStatus,
} from '@zentic/shared-types';

/**
 * Gateway WebSocket para el módulo de Streaming.
 *
 * Gestiona la comunicación en tiempo real entre el servidor y los clientes
 * (viewers y administradores) durante eventos de transmisión en vivo.
 * Opera bajo el namespace `/events` y utiliza salas (rooms) por evento
 * para segmentar las comunicaciones.
 *
 * @remarks
 * Eventos del socket:
 * - `join-event` / `leave-event`: gestión de salas de viewers
 * - `join-admin` / `leave-admin`: gestión de salas de administración
 * - `new-message`: mensaje de homenaje aprobado
 * - `new-reaction`: reacción rápida
 * - `viewer-count`: actualización del contador de espectadores
 * - `stream-status`: cambio de estado del stream (LIVE/FINISHED)
 * - `message-pending`: nuevo mensaje esperando moderación (solo admins)
 */
@WebSocketGateway({
  namespace: '/events',
  cors: { origin: '*', credentials: true },
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  /** eventId -> ids de sockets viewers (excluye administradores) conectados a ese evento. */
  private readonly eventViewers = new Map<string, Set<string>>();
  /** socketId -> eventId, para saber a qué evento pertenecía un socket al desconectarse. */
  private readonly socketToEvent = new Map<string, string>();

  afterInit(_server: Server) {
    this.logger.log('WebSocket gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    const eventId = this.socketToEvent.get(client.id);
    this.socketToEvent.delete(client.id);
    if (eventId) {
      this.removeViewer(eventId, client.id);
      this.broadcastCurrentViewerCount(eventId);
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
    @MessageBody() data: { eventId: string },
  ) {
    await client.join(`event:${data.eventId}`);
    this.socketToEvent.set(client.id, data.eventId);
    this.addViewer(data.eventId, client.id);
    this.logger.log(`Client ${client.id} joined event room: ${data.eventId}`);
    this.broadcastCurrentViewerCount(data.eventId);
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
    @MessageBody() data: { eventId: string },
  ) {
    await client.leave(`event:${data.eventId}`);
    this.socketToEvent.delete(client.id);
    this.removeViewer(data.eventId, client.id);
    this.broadcastCurrentViewerCount(data.eventId);
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
    @MessageBody() data: { eventId: string },
  ) {
    await client.join(`event:${data.eventId}:admin`);
    this.removeViewer(data.eventId, client.id);
    this.logger.log(`Admin ${client.id} joined admin room: ${data.eventId}`);
    this.broadcastCurrentViewerCount(data.eventId);
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
    @MessageBody() data: { eventId: string },
  ) {
    await client.leave(`event:${data.eventId}:admin`);
  }

  private addViewer(eventId: string, socketId: string): void {
    if (!this.eventViewers.has(eventId)) {
      this.eventViewers.set(eventId, new Set());
    }
    this.eventViewers.get(eventId)!.add(socketId);
  }

  private removeViewer(eventId: string, socketId: string): void {
    const viewers = this.eventViewers.get(eventId);
    if (!viewers) return;
    viewers.delete(socketId);
    if (viewers.size === 0) this.eventViewers.delete(eventId);
  }

  /**
   * Emite el contador de espectadores actual de un evento (RF-STREAM-009).
   * `tenantId` se deja vacío: el frontend solo consume `count` de este payload.
   */
  private broadcastCurrentViewerCount(eventId: string): void {
    const count = this.eventViewers.get(eventId)?.size ?? 0;
    this.broadcastViewerCount(eventId, { eventId, tenantId: '', count });
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
}
