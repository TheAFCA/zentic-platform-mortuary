import { InvitationTemplate } from '@zentic/shared-types';
import { InvitationTemplateFactory } from './invitation-template.factory';
import { ClassicInvitationRenderer } from '../renderers/classic-invitation.renderer';
import { ModernInvitationRenderer } from '../renderers/modern-invitation.renderer';
import { MinimalistInvitationRenderer } from '../renderers/minimalist-invitation.renderer';
import { InvitationRenderContext } from '../renderers/invitation-template-renderer.interface';

describe('InvitationTemplateFactory', () => {
  const classic = new ClassicInvitationRenderer();
  const modern = new ModernInvitationRenderer();
  const minimalist = new MinimalistInvitationRenderer();
  const factory = new InvitationTemplateFactory(classic, modern, minimalist);

  const baseContext: InvitationRenderContext = {
    deceasedFullName: 'María López',
    deceasedPhotoDataUri: null,
    message: 'La familia López invita a acompañarlos',
    scheduledAt: new Date('2026-07-05T19:00:00.000Z'),
    ceremonyType: 'VELATORIO',
    place: {
      venueName: 'Sede Norte',
      roomName: 'Sala A',
      address: 'Calle 45 #23-10',
    },
    accessCodeDisplay: null,
    tenantName: 'Funeraria XYZ',
    tenantLogoDataUri: null,
    brand: {
      primaryColor: '#1a1a2e',
      secondaryColor: '#16213e',
      textColor: '#333333',
      backgroundColor: '#f5f5f5',
    },
  };

  it.each([
    [InvitationTemplate.CLASSIC, ClassicInvitationRenderer],
    [InvitationTemplate.MODERN, ModernInvitationRenderer],
    [InvitationTemplate.MINIMALIST, MinimalistInvitationRenderer],
  ])('returns the %s renderer', (template, RendererClass) => {
    expect(factory.create(template)).toBeInstanceOf(RendererClass);
  });

  it.each([
    InvitationTemplate.CLASSIC,
    InvitationTemplate.MODERN,
    InvitationTemplate.MINIMALIST,
  ])(
    '%s renderer produces SVG containing the interpolated name and message',
    (template) => {
      const svg = factory
        .create(template)
        .renderSvg(baseContext, { width: 1080, height: 1080 });

      expect(svg).toContain('<svg');
      expect(svg).toContain('María López');
      expect(svg).toContain('La familia López invita a acompañarlos');
    },
  );

  it('escapes XML special characters in the deceased name and message (XSS-in-SVG regression)', () => {
    const context: InvitationRenderContext = {
      ...baseContext,
      deceasedFullName: `María <script>alert('x')</script> & López`,
      message: `Ven & trae a "todos" los que <quieran>`,
    };

    const svg = factory
      .create(InvitationTemplate.CLASSIC)
      .renderSvg(context, { width: 1080, height: 1080 });

    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;');
    expect(svg).toContain('&amp;');
    expect(svg).toContain('&lt;quieran&gt;');
  });

  it('renders a placeholder (no <image>) when there is no deceased photo', () => {
    const svg = factory
      .create(InvitationTemplate.MODERN)
      .renderSvg(baseContext, { width: 1200, height: 630 });

    expect(svg).not.toContain('<image');
    expect(svg).toContain('ML'); // iniciales de "María López"
  });

  it('embeds the photo as an <image> when a data URI is provided', () => {
    const context: InvitationRenderContext = {
      ...baseContext,
      deceasedPhotoDataUri: 'data:image/png;base64,AAAA',
    };

    const svg = factory
      .create(InvitationTemplate.MINIMALIST)
      .renderSvg(context, { width: 1080, height: 1080 });

    expect(svg).toContain('<image');
    expect(svg).toContain('data:image/png;base64,AAAA');
  });

  it('falls back to "Dirección por confirmar" when the place has no address', () => {
    const context: InvitationRenderContext = {
      ...baseContext,
      place: { venueName: 'Sede Norte', roomName: 'Sala A', address: null },
    };

    const svg = factory
      .create(InvitationTemplate.CLASSIC)
      .renderSvg(context, { width: 1080, height: 1080 });

    expect(svg).toContain('Dirección por confirmar');
  });
});
