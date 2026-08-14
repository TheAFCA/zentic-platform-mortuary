import {
  Module,
  MiddlewareConsumer,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { TenantMiddleware } from './tenant.middleware';
import { TenantController } from './tenant.controller';

@Module({ controllers: [TenantController] })
export class TenantModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .exclude({ path: 'api/health', method: RequestMethod.GET })
      .forRoutes('*');
  }
}
