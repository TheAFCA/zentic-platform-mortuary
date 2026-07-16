import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ShareButtonsComponent } from './share-buttons.component';

describe('ShareButtonsComponent', () => {
  function createFixture() {
    TestBed.configureTestingModule({ imports: [ShareButtonsComponent] });
    const fixture = TestBed.createComponent(ShareButtonsComponent);
    fixture.componentInstance.shareMessage =
      'Nos unimos en memoria de María Fernanda López Rodríguez. Puedes ver el obituario y la transmisión aquí: https://demo.zentic.pro/o/maria-lopez-a1b2';
    fixture.componentInstance.pageUrl = 'https://demo.zentic.pro/o/maria-lopez-a1b2';
    fixture.componentInstance.title = 'María Fernanda López Rodríguez';
    fixture.detectChanges();
    return fixture;
  }

  it('builds a WhatsApp share URL with the pre-written message', () => {
    const fixture = createFixture();
    const url = new URL(fixture.componentInstance.whatsappUrl);

    expect(url.origin + url.pathname).toBe('https://wa.me/');
    expect(url.searchParams.get('text')).toBe(fixture.componentInstance.shareMessage);
  });

  it('builds a mailto URL with a subject referencing the title', () => {
    const fixture = createFixture();
    expect(fixture.componentInstance.mailtoUrl).toContain(
      encodeURIComponent('En memoria de María Fernanda López Rodríguez'),
    );
  });

  it('copies the page URL to the clipboard and shows a confirmation', () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    const fixture = createFixture();
    fixture.componentInstance.copyLink();

    expect(writeText).toHaveBeenCalledWith('https://demo.zentic.pro/o/maria-lopez-a1b2');
    expect(fixture.componentInstance.copied()).toBe(true);
  });

  it('builds a WhatsApp share message usable for an invitation title (HU-INV-001)', () => {
    TestBed.configureTestingModule({ imports: [ShareButtonsComponent] });
    const fixture = TestBed.createComponent(ShareButtonsComponent);
    fixture.componentInstance.shareMessage =
      'Te invitamos a acompañarnos en memoria de María Fernanda López Rodríguez.\n📅 Sábado 05 de Julio, 2:00 PM\n📍 Sala A - Funeraria XYZ, Calle 45 #23-10\n🔗 https://demo.zentic.pro/i/invitacion-maria-lopez-x7k2';
    fixture.componentInstance.pageUrl = 'https://demo.zentic.pro/i/invitacion-maria-lopez-x7k2';
    fixture.componentInstance.title = 'María Fernanda López Rodríguez';
    fixture.detectChanges();

    const url = new URL(fixture.componentInstance.whatsappUrl);
    expect(decodeURIComponent(url.search)).toContain('📅');
    expect(decodeURIComponent(url.search)).toContain(
      'https://demo.zentic.pro/i/invitacion-maria-lopez-x7k2',
    );
  });
});
