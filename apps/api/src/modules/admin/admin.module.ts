import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminRepository } from './admin.repository';
import { PermissionsModule } from '../permissions/permissions.module';
import { EmailModule } from '../email/email.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [PermissionsModule, EmailModule, FilesModule],
  controllers: [AdminController],
  providers: [AdminService, AdminRepository],
})
export class AdminModule {}
