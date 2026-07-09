import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SecurityEventsGateway } from './security-events.gateway';
import { SecurityEventsService } from './security-events.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow('JWT_SECRET'),
      }),
    }),
  ],
  providers: [SecurityEventsGateway, SecurityEventsService],
  exports: [SecurityEventsService],
})
export class SecurityEventsModule {}
