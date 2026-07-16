import { Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';
import { InvitationsRepository } from './invitations.repository';
import { InvitationTemplateFactory } from './factories/invitation-template.factory';
import { ClassicInvitationRenderer } from './renderers/classic-invitation.renderer';
import { ModernInvitationRenderer } from './renderers/modern-invitation.renderer';
import { MinimalistInvitationRenderer } from './renderers/minimalist-invitation.renderer';
import { InvitationImageService } from './services/invitation-image.service';

@Module({
  imports: [FilesModule],
  controllers: [InvitationsController],
  providers: [
    InvitationsService,
    InvitationsRepository,
    InvitationTemplateFactory,
    ClassicInvitationRenderer,
    ModernInvitationRenderer,
    MinimalistInvitationRenderer,
    InvitationImageService,
  ],
  exports: [InvitationsService],
})
export class InvitationsModule {}
