import {
  ConnectedSocket,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { ConfigService } from '@nestjs/config';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload, SecurityEventAlert, UserRole } from '@zentic/shared-types';

const SECURITY_ALERTS_ROOM = 'security:super-admin';

@Injectable()
@WebSocketGateway({
  namespace: '/security',
  cors: { origin: '*', credentials: true },
})
export class SecurityEventsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SecurityEventsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    const token = this.extractAccessToken(client);
    if (!token) return;

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.config.getOrThrow('JWT_SECRET'),
      });

      const user = await this.prisma.user.findFirst({
        where: { id: payload.sub, deletedAt: null },
        select: { role: true },
      });

      if (user?.role === UserRole.SUPER_ADMIN) {
        await client.join(SECURITY_ALERTS_ROOM);
        this.logger.log(`Security alerts client connected: ${client.id}`);
      }
    } catch {
      this.logger.debug(
        `Ignored unauthenticated security socket: ${client.id}`,
      );
    }
  }

  @SubscribeMessage('join-security-alerts')
  async joinSecurityAlerts(@ConnectedSocket() client: Socket) {
    const token = this.extractAccessToken(client);
    if (!token) return;

    const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
      secret: this.config.getOrThrow('JWT_SECRET'),
    });
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
      select: { role: true },
    });

    if (user?.role === UserRole.SUPER_ADMIN) {
      await client.join(SECURITY_ALERTS_ROOM);
    }
  }

  broadcastSecurityAlert(payload: SecurityEventAlert) {
    this.server.to(SECURITY_ALERTS_ROOM).emit('security-event', payload);
  }

  private extractAccessToken(client: Socket) {
    const authToken = (client.handshake.auth as { token?: unknown } | undefined)
      ?.token;
    if (typeof authToken === 'string' && authToken.trim()) {
      return authToken.trim();
    }

    const cookieHeader = client.handshake.headers.cookie;
    if (!cookieHeader) return null;

    const cookies = Object.fromEntries(
      cookieHeader.split(';').map((pair) => {
        const index = pair.indexOf('=');
        const key = pair.slice(0, index).trim();
        const value = pair.slice(index + 1).trim();
        return [key, decodeURIComponent(value)];
      }),
    );

    return (cookies.access_token as string | undefined) ?? null;
  }
}
