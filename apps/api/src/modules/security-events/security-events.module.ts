import { Module } from '@nestjs/common';
import { SecurityEventsGateway } from './security-events.gateway';
import { SecurityEventsService } from './security-events.service';

// JwtService viene del JwtModule global registrado en AuthModule (ver auth.module.ts) — todo
// verifyAsync() en este gateway ya pasa su propio `secret` explícito por llamada, así que no
// depende de ninguna configuración por módulo.
@Module({
  providers: [SecurityEventsGateway, SecurityEventsService],
  exports: [SecurityEventsService],
})
export class SecurityEventsModule {}
