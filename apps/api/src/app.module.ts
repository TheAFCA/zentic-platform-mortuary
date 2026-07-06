import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { StreamingModule } from './modules/streaming/streaming.module';
import { ObituaryModule } from './modules/obituary/obituary.module';
import { LeadsModule } from './modules/leads/leads.module';
import { AdminModule } from './modules/admin/admin.module';
import { SuperAdminModule } from './modules/super-admin/super-admin.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { FilesModule } from './modules/files/files.module';
import { validateEnv } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    TenantModule,
    AuthModule,
    StreamingModule,
    ObituaryModule,
    LeadsModule,
    AdminModule,
    SuperAdminModule,
    NotificationsModule,
    FilesModule,
  ],
})
export class AppModule implements NestModule {
  configure(_consumer: MiddlewareConsumer) {
    void _consumer;
    // TenantMiddleware is applied per-module in TenantModule
  }
}
