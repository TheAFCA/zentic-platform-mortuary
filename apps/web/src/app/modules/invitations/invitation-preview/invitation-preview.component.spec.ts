import { TestBed } from '@angular/core/testing';
import { InvitationTemplate } from '@zentic/shared-types';
import { InvitationPreviewComponent } from './invitation-preview.component';

describe('InvitationPreviewComponent', () => {
  function createFixture() {
    TestBed.configureTestingModule({ imports: [InvitationPreviewComponent] });
    const fixture = TestBed.createComponent(InvitationPreviewComponent);
    return fixture;
  }

  it.each([
    [InvitationTemplate.CLASSIC, 'invitation-preview--classic'],
    [InvitationTemplate.MODERN, 'invitation-preview--modern'],
    [InvitationTemplate.MINIMALIST, 'invitation-preview--minimalist'],
  ])('applies the %s template class', (template, expectedClass) => {
    const fixture = createFixture();
    fixture.componentInstance.template = template;
    fixture.detectChanges();

    expect(fixture.componentInstance.templateClass).toBe(expectedClass);
  });

  it('reflects the tenant brand colors as CSS custom properties', () => {
    const fixture = createFixture();
    fixture.componentInstance.brand = {
      logoUrl: null,
      faviconUrl: null,
      primaryColor: '#ff0000',
      secondaryColor: '#00ff00',
      textColor: '#111111',
      backgroundColor: '#eeeeee',
    };
    fixture.detectChanges();

    expect(fixture.componentInstance.brandStyle).toEqual({
      '--invitation-primary': '#ff0000',
      '--invitation-secondary': '#00ff00',
      '--invitation-text': '#111111',
      '--invitation-background': '#eeeeee',
    });
  });

  it('falls back to default brand colors when no brand is set', () => {
    const fixture = createFixture();
    fixture.detectChanges();

    expect(fixture.componentInstance.brandStyle['--invitation-primary']).toBe('#1a1a2e');
  });

  it('falls back to "Dirección por confirmar" when there is no address', () => {
    const fixture = createFixture();
    fixture.componentInstance.venueName = 'Sede Norte';
    fixture.componentInstance.roomName = 'Sala A';
    fixture.componentInstance.address = null;
    fixture.detectChanges();

    expect(fixture.componentInstance.addressLabel).toBe('Dirección por confirmar');
    expect(fixture.componentInstance.placeLabel).toBe('Sede Norte — Sala A');
  });
});
