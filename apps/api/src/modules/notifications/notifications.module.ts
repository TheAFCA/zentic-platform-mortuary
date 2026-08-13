import { Module } from '@nestjs/common';
import { NotificationsGateway } from './notifications.gateway';
import { DistributedRateLimiterService } from '../streaming/services/distributed-rate-limiter.service';

// JwtService viene del JwtModule global registrado en AuthModule (ver auth.module.ts) — todo
// verifyAsync() en este gateway ya pasa su propio `secret` explícito por llamada, así que no
// depende de ninguna configuración por módulo.
@Module({
  providers: [NotificationsGateway, DistributedRateLimiterService],
  exports: [NotificationsGateway],
})
export class NotificationsModule {}
