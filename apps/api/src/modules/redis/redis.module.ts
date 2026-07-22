import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { Env } from '../../config/env.validation';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env>) => {
        return new Redis(
          config.get<string>('REDIS_URL') ?? 'redis://localhost:6379',
          {
            lazyConnect: true,
            maxRetriesPerRequest: 3,
            retryStrategy: (times) => Math.min(times * 200, 3000),
          },
        );
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
