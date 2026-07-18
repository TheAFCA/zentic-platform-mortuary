import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { MessageStatus, TributeMessage } from '@zentic/shared-types';
import { MessagesListComponent } from './messages-list.component';
import { TributeBookApiService } from '../../../core/services/tribute-book-api.service';

const mockMessage = (overrides: Partial<TributeMessage> = {}): TributeMessage => ({
  id: 'msg-1',
  origin: 'STREAMING',
  tenantId: 'tenant-1',
  eventId: 'event-1',
  obituaryId: null,
  authorName: 'Juan Pérez',
  content: 'Descansa en paz',
  iconType: null,
  status: MessageStatus.PENDING,
  rejectedReason: null,
  approvedBy: null,
  approvedAt: null,
  createdAt: '2026-07-01T00:00:00Z',
  deletedAt: null,
  ...overrides,
});

describe('MessagesListComponent', () => {
  let apiMock: {
    listMessages: ReturnType<typeof vi.fn>;
    approve: ReturnType<typeof vi.fn>;
    reject: ReturnType<typeof vi.fn>;
    bulkApprove: ReturnType<typeof vi.fn>;
    softDelete: ReturnType<typeof vi.fn>;
    restore: ReturnType<typeof vi.fn>;
    generate: ReturnType<typeof vi.fn>;
  };
  let routeQueryParams: Map<string, string>;
  let router: { navigate: ReturnType<typeof vi.fn> };

  function createComponent() {
    const fixture = TestBed.createComponent(MessagesListComponent);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    routeQueryParams = new Map();
    apiMock = {
      listMessages: vi
        .fn()
        .mockReturnValue(
          of({ data: [mockMessage()], total: 1, page: 1, limit: 100, totalPages: 1 }),
        ),
      approve: vi.fn().mockReturnValue(of(mockMessage({ status: MessageStatus.APPROVED }))),
      reject: vi.fn().mockReturnValue(of(mockMessage({ status: MessageStatus.REJECTED }))),
      bulkApprove: vi.fn().mockReturnValue(of({ approved: 1 })),
      softDelete: vi.fn().mockReturnValue(of(undefined)),
      restore: vi.fn().mockReturnValue(of(undefined)),
      generate: vi.fn().mockReturnValue(
        of({
          id: 'gen-1',
          tenantId: 'tenant-1',
          eventId: 'event-1',
          obituaryId: null,
          generatedBy: 'user-1',
          status: 'PROCESSING',
          pdfUrl: null,
          errorMessage: null,
          expiresAt: null,
          messageCount: 1,
          createdAt: '2026-07-01T00:00:00Z',
        }),
      ),
    };
    router = { navigate: vi.fn().mockResolvedValue(true) };

    TestBed.configureTestingModule({
      providers: [
        { provide: TributeBookApiService, useValue: apiMock },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: { get: (key: string) => routeQueryParams.get(key) ?? null },
            },
          },
        },
      ],
    });
  });

  it('loads messages on init with no filters by default', () => {
    createComponent();

    expect(apiMock.listMessages).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: undefined, obituaryId: undefined, origin: undefined }),
    );
  });

  it('prefills the origin filter and target ids from query params', () => {
    routeQueryParams.set('origin', 'OBITUARY');
    routeQueryParams.set('obituaryId', 'obituary-1');

    const fixture = createComponent();
    const component = fixture.componentInstance;

    expect(component.originFilter()).toBe('OBITUARY');
    expect(component.obituaryId).toBe('obituary-1');
    expect(apiMock.listMessages).toHaveBeenCalledWith(
      expect.objectContaining({ origin: 'OBITUARY', obituaryId: 'obituary-1' }),
    );
  });

  it('reloads when the status filter changes', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    apiMock.listMessages.mockClear();

    component.statusFilter.set(MessageStatus.APPROVED);
    component.onFilterChange();

    expect(apiMock.listMessages).toHaveBeenCalledWith(
      expect.objectContaining({ status: MessageStatus.APPROVED }),
    );
  });

  it('toggles the trashed view and reloads', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    apiMock.listMessages.mockClear();

    component.toggleTrashed();

    expect(component.trashed()).toBe(true);
    expect(apiMock.listMessages).toHaveBeenCalledWith(expect.objectContaining({ trashed: true }));
  });

  describe('canGenerate', () => {
    it('is false without an eventId or obituaryId', () => {
      const fixture = createComponent();
      expect(fixture.componentInstance.canGenerate).toBe(false);
    });

    it('is true when eventId is set from query params', () => {
      routeQueryParams.set('eventId', 'event-1');
      const fixture = createComponent();
      expect(fixture.componentInstance.canGenerate).toBe(true);
    });
  });

  describe('moderation actions', () => {
    it('approve calls the api with the message id and origin, then reloads', () => {
      const fixture = createComponent();
      const component = fixture.componentInstance;
      apiMock.listMessages.mockClear();

      component.approve(mockMessage());

      expect(apiMock.approve).toHaveBeenCalledWith('msg-1', 'STREAMING');
      expect(apiMock.listMessages).toHaveBeenCalled();
    });

    it('reject calls the api and reloads', () => {
      const fixture = createComponent();
      const component = fixture.componentInstance;

      component.reject(mockMessage());

      expect(apiMock.reject).toHaveBeenCalledWith('msg-1', 'STREAMING');
    });

    it('remove soft-deletes the message and reloads', () => {
      const fixture = createComponent();
      const component = fixture.componentInstance;

      component.remove(mockMessage());

      expect(apiMock.softDelete).toHaveBeenCalledWith('msg-1', 'STREAMING');
    });

    it('restore restores the message and reloads', () => {
      const fixture = createComponent();
      const component = fixture.componentInstance;

      component.restore(mockMessage({ deletedAt: '2026-07-01T00:00:00Z' }));

      expect(apiMock.restore).toHaveBeenCalledWith('msg-1', 'STREAMING');
    });

    it('sets an error message when an action fails', () => {
      apiMock.approve.mockReturnValue(throwError(() => ({ error: { message: 'No autorizado' } })));
      const fixture = createComponent();
      const component = fixture.componentInstance;

      component.approve(mockMessage());

      expect(component.error()).toBe('No autorizado');
    });
  });

  describe('bulkApprove', () => {
    it('does nothing when there is no selection', () => {
      const fixture = createComponent();
      const component = fixture.componentInstance;

      component.bulkApprove();

      expect(apiMock.bulkApprove).not.toHaveBeenCalled();
    });

    it('approves the selected messages and reloads', () => {
      const fixture = createComponent();
      const component = fixture.componentInstance;
      component.onSelectionChange(new Set(['msg-1']));

      component.bulkApprove();

      expect(apiMock.bulkApprove).toHaveBeenCalledWith({
        items: [{ id: 'msg-1', origin: 'STREAMING' }],
      });
    });
  });

  describe('generate dialog', () => {
    it('opens and cancels the dialog', () => {
      const fixture = createComponent();
      const component = fixture.componentInstance;

      component.openGenerateDialog();
      expect(component.showGenerateDialog()).toBe(true);

      component.cancelGenerate();
      expect(component.showGenerateDialog()).toBe(false);
    });

    it('confirmGenerate calls the api and navigates to history on success', () => {
      routeQueryParams.set('eventId', 'event-1');
      const fixture = createComponent();
      const component = fixture.componentInstance;

      component.confirmGenerate();

      expect(apiMock.generate).toHaveBeenCalledWith(
        expect.objectContaining({ eventId: 'event-1' }),
      );
      expect(router.navigate).toHaveBeenCalledWith(['/admin/tribute-book/history']);
      expect(component.showGenerateDialog()).toBe(false);
    });

    it('sets generateError on failure without navigating', () => {
      apiMock.generate.mockReturnValue(
        throwError(() => ({ error: { message: 'No hay mensajes aprobados' } })),
      );
      const fixture = createComponent();
      const component = fixture.componentInstance;

      component.confirmGenerate();

      expect(component.generateError()).toBe('No hay mensajes aprobados');
      expect(router.navigate).not.toHaveBeenCalled();
    });
  });
});
