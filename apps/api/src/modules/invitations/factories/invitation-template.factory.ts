import { Injectable } from '@nestjs/common';
import { InvitationTemplate } from '@zentic/shared-types';
import { InvitationTemplateRenderer } from '../renderers/invitation-template-renderer.interface';
import { ClassicInvitationRenderer } from '../renderers/classic-invitation.renderer';
import { ModernInvitationRenderer } from '../renderers/modern-invitation.renderer';
import { MinimalistInvitationRenderer } from '../renderers/minimalist-invitation.renderer';

@Injectable()
export class InvitationTemplateFactory {
  constructor(
    private readonly classic: ClassicInvitationRenderer,
    private readonly modern: ModernInvitationRenderer,
    private readonly minimalist: MinimalistInvitationRenderer,
  ) {}

  create(template: InvitationTemplate): InvitationTemplateRenderer {
    switch (template) {
      case InvitationTemplate.CLASSIC:
        return this.classic;
      case InvitationTemplate.MODERN:
        return this.modern;
      case InvitationTemplate.MINIMALIST:
        return this.minimalist;
    }
  }
}
