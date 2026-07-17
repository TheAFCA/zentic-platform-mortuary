import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { NotificationsGateway } from './notifications.gateway';
import { DistributedRateLimiterService } from '../streaming/services/distributed-rate-limiter.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow('JWT_SECRET'),
      }),
    }),
  ],
  providers: [NotificationsGateway, DistributedRateLimiterService],
  exports: [NotificationsGateway],
})
export class NotificationsModule {}
