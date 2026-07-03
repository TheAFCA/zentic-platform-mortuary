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
import { WsNewMessage, WsViewerCount, WsStreamStatus } from '@zentic/shared-types';

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

  afterInit(_server: Server) {
    this.logger.log('WebSocket gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-event')
  handleJoinEvent(@ConnectedSocket() client: Socket, @MessageBody() data: { eventId: string }) {
    client.join(`event:${data.eventId}`);
    this.logger.log(`Client ${client.id} joined event room: ${data.eventId}`);
  }

  @SubscribeMessage('leave-event')
  handleLeaveEvent(@ConnectedSocket() client: Socket, @MessageBody() data: { eventId: string }) {
    client.leave(`event:${data.eventId}`);
  }

  broadcastNewMessage(eventId: string, payload: WsNewMessage) {
    this.server.to(`event:${eventId}`).emit('new-message', payload);
  }

  broadcastViewerCount(eventId: string, payload: WsViewerCount) {
    this.server.to(`event:${eventId}`).emit('viewer-count', payload);
  }

  broadcastStreamStatus(eventId: string, payload: WsStreamStatus) {
    this.server.to(`event:${eventId}`).emit('stream-status', payload);
  }
}
