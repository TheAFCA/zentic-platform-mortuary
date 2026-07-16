import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { StreamingModule } from './modules/streaming/streaming.module';
import { ObituaryModule } from './modules/obituary/obituary.module';
import { InvitationsModule } from './modules/invitations/invitations.module';
import { LeadsModule } from './modules/leads/leads.module';
import { AdminModule } from './modules/admin/admin.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { SuperAdminModule } from './modules/super-admin/super-admin.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { FilesModule } from './modules/files/files.module';
import { ClientsModule } from './modules/clients/clients.module';
import { VenuesModule } from './modules/venues/venues.module';
import { validateEnv } from './config/env.validation';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  controllers: [AppController],
  providers: [AppService],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('THROTTLE_TTL', 60000),
            limit: config.get<number>('THROTTLE_LIMIT', 100),
          },
        ],
      }),
    }),
    PrismaModule,
    TenantModule,
    AuthModule,
    StreamingModule,
    ObituaryModule,
    InvitationsModule,
    LeadsModule,
    PermissionsModule,
    AdminModule,
    SuperAdminModule,
    NotificationsModule,
    FilesModule,
    ClientsModule,
    VenuesModule,
  ],
})
export class AppModule implements NestModule {
  configure(_consumer: MiddlewareConsumer) {
    void _consumer;
    // TenantMiddleware is applied per-module in TenantModule
  }
}
