import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { InvitationTemplate } from '@zentic/shared-types';
import { InvitationFormComponent } from './invitation-form.component';
import { StreamingEvent } from '../../../core/services/streaming-api.service';

function buildEvent(overrides: Partial<StreamingEvent> = {}): StreamingEvent {
  return {
    id: 'event-1',
    title: 'Velatorio de María López',
    slug: 'velatorio-maria-lopez',
    description: null,
    ceremonyType: 'VELATORIO',
    status: 'SCHEDULED' as StreamingEvent['status'],
    scheduledAt: '2026-07-05T19:00:00.000Z',
    startedAt: null,
    finishedAt: null,
    estimatedDuration: null,
    isPublic: true,
    hasAccessCode: false,
    streamKey: null,
    rtmpUrl: null,
    recordingUrl: null,
    viewerCount: 0,
    moderationMode: 'AUTO',
    createdAt: '2026-07-01T00:00:00.000Z',
    deceased: {
      id: 'deceased-1',
      firstName: 'María',
      lastName: 'López',
      birthDate: null,
      deathDate: '2026-07-01T00:00:00.000Z',
      photoUrl: null,
      biography: null,
      epitaph: null,
    },
    room: { id: 'room-1', name: 'Sala A', venue: { id: 'venue-1', name: 'Sede Norte' } },
    client: null,
    assignedTo: null,
    ...overrides,
  };
}

describe('InvitationFormComponent', () => {
  function createFixture(eventOptions: StreamingEvent[] = [buildEvent()]) {
    TestBed.configureTestingModule({ imports: [InvitationFormComponent] });
    const fixture = TestBed.createComponent(InvitationFormComponent);
    fixture.componentInstance.eventOptions = eventOptions;
    fixture.detectChanges();
    return fixture;
  }

  it('does not emit save when the event is not selected', () => {
    const fixture = createFixture();
    const saveSpy = vi.fn();
    fixture.componentInstance.save.subscribe(saveSpy);

    fixture.componentInstance.submit();

    expect(saveSpy).not.toHaveBeenCalled();
    expect(fixture.componentInstance.form.invalid).toBe(true);
  });

  it('enforces the 200-character limit on the message field', () => {
    const fixture = createFixture();
    fixture.componentInstance.form.patchValue({ message: 'a'.repeat(201) });

    expect(fixture.componentInstance.form.controls.message.valid).toBe(false);
  });

  it('emits save with the form value when the event is selected', () => {
    const fixture = createFixture();
    fixture.componentInstance.form.patchValue({ eventId: 'event-1', message: 'Hola' });

    const saveSpy = vi.fn();
    fixture.componentInstance.save.subscribe(saveSpy);
    fixture.componentInstance.submit();

    expect(saveSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        value: expect.objectContaining({ eventId: 'event-1', message: 'Hola' }),
      }),
    );
  });

  it('shows the access code field only when the selected event has one enabled (RN-INV-004)', () => {
    const withCode = buildEvent({ id: 'event-2', hasAccessCode: true });
    const fixture = createFixture([buildEvent(), withCode]);

    fixture.componentInstance.form.patchValue({ eventId: 'event-1' });
    expect(fixture.componentInstance.selectedEventHasAccessCode).toBe(false);

    fixture.componentInstance.form.patchValue({ eventId: 'event-2' });
    expect(fixture.componentInstance.selectedEventHasAccessCode).toBe(true);
  });

  it('disables the event field and pre-fills values when editing an existing invitation', () => {
    const fixture = createFixture();
    fixture.componentInstance.initialValue = {
      eventId: 'event-1',
      template: InvitationTemplate.MODERN,
      message: 'Mensaje existente',
      accessCodeDisplay: '',
    };
    fixture.componentInstance.ngOnChanges();

    expect(fixture.componentInstance.form.controls.eventId.disabled).toBe(true);
    expect(fixture.componentInstance.form.getRawValue().template).toBe(InvitationTemplate.MODERN);
    expect(fixture.componentInstance.isEditing).toBe(true);
  });
});
