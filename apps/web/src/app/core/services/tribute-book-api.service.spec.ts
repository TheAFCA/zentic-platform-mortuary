import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MessageStatus, TributeBookStatus, TributeMessage } from '@zentic/shared-types';
import { TributeBookApiService } from './tribute-book-api.service';
import { environment } from '../../../environments/environment';

describe('TributeBookApiService', () => {
  let service: TributeBookApiService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/tribute-book`;

  const mockMessage: TributeMessage = {
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
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TributeBookApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('listMessages', () => {
    it('performs a GET against /tribute-book/messages with query params', () => {
      service.listMessages({ eventId: 'event-1', trashed: false }).subscribe((result) => {
        expect(result.data).toEqual([mockMessage]);
      });

      const req = httpMock.expectOne(
        (r) => r.url === `${baseUrl}/messages` && r.params.get('eventId') === 'event-1',
      );
      expect(req.request.method).toBe('GET');
      req.flush({ data: [mockMessage], total: 1, page: 1, limit: 25, totalPages: 1 });
    });
  });

  describe('pendingCount', () => {
    it('performs a GET against /tribute-book/messages/pending-count', () => {
      service.pendingCount().subscribe((result) => {
        expect(result.count).toBe(3);
      });

      const req = httpMock.expectOne(`${baseUrl}/messages/pending-count`);
      expect(req.request.method).toBe('GET');
      req.flush({ count: 3 });
    });
  });

  describe('approve', () => {
    it('performs a PATCH with the origin in the body', () => {
      service.approve('msg-1', 'STREAMING').subscribe();

      const req = httpMock.expectOne(`${baseUrl}/messages/msg-1/approve`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ origin: 'STREAMING' });
      req.flush({ ...mockMessage, status: MessageStatus.APPROVED });
    });
  });

  describe('reject', () => {
    it('performs a PATCH with the origin and rejectedReason in the body', () => {
      service.reject('msg-1', 'OBITUARY', 'spam').subscribe();

      const req = httpMock.expectOne(`${baseUrl}/messages/msg-1/reject`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ origin: 'OBITUARY', rejectedReason: 'spam' });
      req.flush({ ...mockMessage, status: MessageStatus.REJECTED });
    });
  });

  describe('bulkApprove', () => {
    it('performs a POST against /tribute-book/messages/bulk-approve', () => {
      const items = [{ id: 'msg-1', origin: 'STREAMING' as const }];
      service.bulkApprove({ items }).subscribe((result) => {
        expect(result.approved).toBe(1);
      });

      const req = httpMock.expectOne(`${baseUrl}/messages/bulk-approve`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ items });
      req.flush({ approved: 1 });
    });
  });

  describe('softDelete', () => {
    it('performs a DELETE with origin as a query param', () => {
      service.softDelete('msg-1', 'STREAMING').subscribe();

      const req = httpMock.expectOne(
        (r) => r.url === `${baseUrl}/messages/msg-1` && r.params.get('origin') === 'STREAMING',
      );
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('restore', () => {
    it('performs a POST with origin as a query param', () => {
      service.restore('msg-1', 'OBITUARY').subscribe();

      const req = httpMock.expectOne(
        (r) =>
          r.url === `${baseUrl}/messages/msg-1/restore` && r.params.get('origin') === 'OBITUARY',
      );
      expect(req.request.method).toBe('POST');
      req.flush(null);
    });
  });

  describe('generate', () => {
    it('performs a POST against /tribute-book/generate', () => {
      service.generate({ eventId: 'event-1' }).subscribe((result) => {
        expect(result.status).toBe(TributeBookStatus.PROCESSING);
      });

      const req = httpMock.expectOne(`${baseUrl}/generate`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ eventId: 'event-1' });
      req.flush({
        id: 'gen-1',
        tenantId: 'tenant-1',
        eventId: 'event-1',
        obituaryId: null,
        generatedBy: 'user-1',
        status: TributeBookStatus.PROCESSING,
        pdfUrl: null,
        errorMessage: null,
        expiresAt: null,
        messageCount: 2,
        createdAt: '2026-07-01T00:00:00Z',
      });
    });
  });

  describe('history', () => {
    it('performs a GET against /tribute-book/history with page/limit params', () => {
      service.history(2, 10).subscribe((result) => {
        expect(result.total).toBe(0);
      });

      const req = httpMock.expectOne(
        (r) => r.url === `${baseUrl}/history` && r.params.get('page') === '2',
      );
      expect(req.request.method).toBe('GET');
      req.flush({ data: [], total: 0, page: 2, limit: 10, totalPages: 0 });
    });
  });

  describe('download', () => {
    it('performs a GET with responseType blob', () => {
      service.download('gen-1').subscribe((blob) => {
        expect(blob).toBeInstanceOf(Blob);
      });

      const req = httpMock.expectOne(`${baseUrl}/gen-1/download`);
      expect(req.request.method).toBe('GET');
      expect(req.request.responseType).toBe('blob');
      req.flush(new Blob(['%PDF-1.4']));
    });
  });
});
