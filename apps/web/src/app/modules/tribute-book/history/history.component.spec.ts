import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { TributeBookGeneration, TributeBookStatus } from '@zentic/shared-types';
import { HistoryComponent } from './history.component';
import { TributeBookApiService } from '../../../core/services/tribute-book-api.service';

const mockGeneration = (overrides: Partial<TributeBookGeneration> = {}): TributeBookGeneration => ({
  id: 'gen-1',
  tenantId: 'tenant-1',
  eventId: 'event-1',
  obituaryId: null,
  generatedBy: 'user-1',
  status: TributeBookStatus.READY,
  pdfUrl: null,
  errorMessage: null,
  expiresAt: '2026-07-04T00:00:00Z',
  messageCount: 5,
  createdAt: '2026-07-01T00:00:00Z',
  ...overrides,
});

describe('HistoryComponent', () => {
  let apiMock: {
    history: ReturnType<typeof vi.fn>;
    download: ReturnType<typeof vi.fn>;
    generate: ReturnType<typeof vi.fn>;
  };

  function createComponent() {
    const fixture = TestBed.createComponent(HistoryComponent);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    apiMock = {
      history: vi
        .fn()
        .mockReturnValue(
          of({ data: [mockGeneration()], total: 1, page: 1, limit: 25, totalPages: 1 }),
        ),
      download: vi.fn().mockReturnValue(of(new Blob(['%PDF-1.4']))),
      generate: vi
        .fn()
        .mockReturnValue(of(mockGeneration({ status: TributeBookStatus.PROCESSING }))),
    };

    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: TributeBookApiService, useValue: apiMock }],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads the history on init', () => {
    const fixture = createComponent();

    expect(apiMock.history).toHaveBeenCalled();
    expect(fixture.componentInstance.generations()).toHaveLength(1);
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('polls the history every 5 seconds', () => {
    vi.useFakeTimers();
    try {
      createComponent();
      apiMock.history.mockClear();

      vi.advanceTimersByTime(5_000);
      expect(apiMock.history).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(5_000);
      expect(apiMock.history).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  describe('statusBadgeColor', () => {
    it('returns green for READY', () => {
      const fixture = createComponent();
      expect(fixture.componentInstance.statusBadgeColor(TributeBookStatus.READY)).toBe('green');
    });

    it('returns red for ERROR', () => {
      const fixture = createComponent();
      expect(fixture.componentInstance.statusBadgeColor(TributeBookStatus.ERROR)).toBe('red');
    });

    it('returns yellow for PROCESSING', () => {
      const fixture = createComponent();
      expect(fixture.componentInstance.statusBadgeColor(TributeBookStatus.PROCESSING)).toBe(
        'yellow',
      );
    });
  });

  describe('download', () => {
    it('calls the api and clears downloadingId on success', () => {
      const fixture = createComponent();
      const component = fixture.componentInstance;

      component.download(mockGeneration());

      expect(apiMock.download).toHaveBeenCalledWith('gen-1');
      expect(component.downloadingId()).toBeNull();
    });

    it('sets an error message on failure', () => {
      apiMock.download.mockReturnValue(throwError(() => ({ error: { message: 'Expiró' } })));
      const fixture = createComponent();
      const component = fixture.componentInstance;

      component.download(mockGeneration());

      expect(component.error()).toBe('Expiró');
    });
  });

  describe('retry', () => {
    it('calls generate with the same target', () => {
      const fixture = createComponent();
      const component = fixture.componentInstance;

      component.retry(mockGeneration({ status: TributeBookStatus.ERROR }));

      expect(apiMock.generate).toHaveBeenCalledWith(
        expect.objectContaining({ eventId: 'event-1' }),
      );
    });
  });
});
