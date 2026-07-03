import { Module } from '@nestjs/common';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService } from './super-admin.service';
import { SuperAdminRepository } from './super-admin.repository';

@Module({
  controllers: [SuperAdminController],
  providers: [SuperAdminService, SuperAdminRepository],
})
export class SuperAdminModule {}
