import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  GoneException,
  NotFoundException,
} from '@nestjs/common';
import { MessageStatus, TributeBookStatus } from '@prisma/client';
import { TributeBookService } from './tribute-book.service';
import { TributeBookRepository } from './tribute-book.repository';
import { PdfFactory } from './factories/pdf.factory';
import { FilesService } from '../files/files.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

// Con fake timers activos, setImmediate/setTimeout quedan "congelados" — runGeneration()
// solo encadena promesas ya resueltas por los mocks, así que basta con drenar la cola de
// microtasks varias veces (sin depender de macrotasks, que sí están faked por Jest).
const flushMicrotasks = async () => {
  for (let i = 0; i < 10; i += 1) {
    await Promise.resolve();
  }
};

describe('TributeBookService', () => {
  let service: TributeBookService;
  let repo: jest.Mocked<TributeBookRepository>;
  let pdfFactory: jest.Mocked<PdfFactory>;
  let filesService: jest.Mocked<FilesService>;
  let gateway: jest.Mocked<NotificationsGateway>;

  const TENANT_ID = 'tenant-1';

  const streamingMessage = (overrides = {}) => ({
    id: 'msg-stream-1',
    tenantId: TENANT_ID,
    eventId: 'event-1',
    authorName: 'Juan Pérez',
    content: 'Descansa en paz',
    iconType: 'HEART',
    status: MessageStatus.PENDING,
    rejectedReason: null,
    approvedBy: null,
    approvedAt: null,
    createdAt: new Date('2026-07-01T10:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  });

  const obituaryMessage = (overrides = {}) => ({
    id: 'msg-obituary-1',
    tenantId: TENANT_ID,
    obituaryId: 'obituary-1',
    authorName: 'Ana Gómez',
    content: 'Que en paz descanse',
    iconType: 'CANDLE',
    status: MessageStatus.PENDING,
    rejectedReason: null,
    approvedBy: null,
    approvedAt: null,
    createdAt: new Date('2026-07-01T11:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  });

  const generationRecord = (overrides = {}) => ({
    id: 'gen-1',
    tenantId: TENANT_ID,
    eventId: 'event-1',
    obituaryId: null,
    generatedBy: 'user-1',
    status: TributeBookStatus.PROCESSING,
    pdfUrl: null,
    errorMessage: null,
    expiresAt: null,
    messageCount: 1,
    createdAt: new Date('2026-07-10T00:00:00.000Z'),
    ...overrides,
  });

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-12T12:00:00.000Z'));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TributeBookService,
        {
          provide: TributeBookRepository,
          useValue: {
            findStreamingMessages: jest.fn(),
            findObituaryMessages: jest.fn(),
            countPending: jest.fn(),
            findStreamingMessageById: jest.fn(),
            findObituaryMessageById: jest.fn(),
            setStreamingMessageStatus: jest.fn(),
            setObituaryMessageStatus: jest.fn(),
            bulkApprove: jest.fn(),
            softDeleteStreamingMessage: jest.fn(),
            softDeleteObituaryMessage: jest.fn(),
            restoreStreamingMessage: jest.fn(),
            restoreObituaryMessage: jest.fn(),
            findEventWithDeceased: jest.fn(),
            findObituaryWithDeceased: jest.fn(),
            findObituaryByEventId: jest.fn(),
            findApprovedStreamingMessages: jest.fn(),
            findApprovedObituaryMessages: jest.fn(),
            findTenantBrand: jest.fn(),
            createGeneration: jest.fn(),
            updateGenerationStatus: jest.fn(),
            findGenerationById: jest.fn(),
            listGenerations: jest.fn(),
          },
        },
        {
          provide: PdfFactory,
          useValue: { create: jest.fn() },
        },
        {
          provide: FilesService,
          useValue: {
            savePrivateFile: jest.fn(),
            readPrivateFile: jest.fn(),
          },
        },
        {
          provide: NotificationsGateway,
          useValue: {
            broadcastNewMessage: jest.fn(),
            broadcastObituaryMessage: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(TributeBookService);
    repo = module.get(TributeBookRepository);
    pdfFactory = module.get(PdfFactory);
    filesService = module.get(FilesService);
    gateway = module.get(NotificationsGateway);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('listMessages', () => {
    it('merges and sorts messages from both origins by createdAt desc', async () => {
      repo.findStreamingMessages.mockResolvedValue([
        streamingMessage({ createdAt: new Date('2026-07-01T09:00:00.000Z') }),
      ]);
      repo.findObituaryMessages.mockResolvedValue([
        obituaryMessage({ createdAt: new Date('2026-07-01T15:00:00.000Z') }),
      ]);

      const result = await service.listMessages(TENANT_ID, {});

      expect(result.data).toHaveLength(2);
      expect(result.data[0].origin).toBe('OBITUARY');
      expect(result.data[1].origin).toBe('STREAMING');
      expect(result.total).toBe(2);
    });

    it('paginates the merged result', async () => {
      repo.findStreamingMessages.mockResolvedValue(
        Array.from({ length: 3 }, (_, i) =>
          streamingMessage({
            id: `s-${i}`,
            createdAt: new Date(2026, 6, i + 1),
          }),
        ),
      );
      repo.findObituaryMessages.mockResolvedValue([]);

      const result = await service.listMessages(TENANT_ID, {
        page: 2,
        limit: 2,
      });

      expect(result.data).toHaveLength(1);
      expect(result.totalPages).toBe(2);
    });

    it('skips querying the streaming table when origin=OBITUARY', async () => {
      repo.findObituaryMessages.mockResolvedValue([]);

      await service.listMessages(TENANT_ID, { origin: 'OBITUARY' });

      expect(repo.findStreamingMessages).not.toHaveBeenCalled();
      expect(repo.findObituaryMessages).toHaveBeenCalled();
    });

    it('skips querying the obituary table when filtering by eventId', async () => {
      repo.findStreamingMessages.mockResolvedValue([]);

      await service.listMessages(TENANT_ID, { eventId: 'event-1' });

      expect(repo.findObituaryMessages).not.toHaveBeenCalled();
      expect(repo.findStreamingMessages).toHaveBeenCalled();
    });

    it('skips querying the streaming table when filtering by obituaryId', async () => {
      repo.findObituaryMessages.mockResolvedValue([]);

      await service.listMessages(TENANT_ID, { obituaryId: 'obituary-1' });

      expect(repo.findStreamingMessages).not.toHaveBeenCalled();
      expect(repo.findObituaryMessages).toHaveBeenCalled();
    });
  });

  describe('pendingCount', () => {
    it('delegates to the repository', async () => {
      repo.countPending.mockResolvedValue(5);

      const result = await service.pendingCount(TENANT_ID);

      expect(result).toBe(5);
      expect(repo.countPending).toHaveBeenCalledWith(TENANT_ID);
    });
  });

  describe('approveMessage', () => {
    it('approves a streaming message and broadcasts to its event room', async () => {
      repo.findStreamingMessageById.mockResolvedValue(streamingMessage());
      repo.setStreamingMessageStatus.mockResolvedValue(
        streamingMessage({ status: MessageStatus.APPROVED }),
      );

      const result = await service.approveMessage(
        TENANT_ID,
        'msg-stream-1',
        'STREAMING',
        'user-1',
      );

      expect(result.status).toBe('APPROVED');
      expect(gateway.broadcastNewMessage).toHaveBeenCalledWith(
        'event-1',
        expect.objectContaining({ eventId: 'event-1', tenantId: TENANT_ID }),
      );
      expect(gateway.broadcastObituaryMessage).not.toHaveBeenCalled();
    });

    it('approves an obituary message and broadcasts to its obituary room', async () => {
      repo.findObituaryMessageById.mockResolvedValue(obituaryMessage());
      repo.setObituaryMessageStatus.mockResolvedValue(
        obituaryMessage({ status: MessageStatus.APPROVED }),
      );

      await service.approveMessage(
        TENANT_ID,
        'msg-obituary-1',
        'OBITUARY',
        'user-1',
      );

      expect(gateway.broadcastObituaryMessage).toHaveBeenCalledWith(
        'obituary-1',
        expect.objectContaining({
          obituaryId: 'obituary-1',
          tenantId: TENANT_ID,
        }),
      );
      expect(gateway.broadcastNewMessage).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the message does not exist', async () => {
      repo.findStreamingMessageById.mockResolvedValue(null);

      await expect(
        service.approveMessage(TENANT_ID, 'missing', 'STREAMING', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('rejectMessage', () => {
    it('rejects a message without broadcasting', async () => {
      repo.findObituaryMessageById.mockResolvedValue(obituaryMessage());
      repo.setObituaryMessageStatus.mockResolvedValue(
        obituaryMessage({
          status: MessageStatus.REJECTED,
          rejectedReason: 'spam',
        }),
      );

      const result = await service.rejectMessage(
        TENANT_ID,
        'msg-obituary-1',
        'OBITUARY',
        'user-1',
        'spam',
      );

      expect(result.status).toBe('REJECTED');
      expect(gateway.broadcastObituaryMessage).not.toHaveBeenCalled();
      expect(repo.setObituaryMessageStatus).toHaveBeenCalledWith(
        TENANT_ID,
        'msg-obituary-1',
        MessageStatus.REJECTED,
        'user-1',
        'spam',
      );
    });
  });

  describe('bulkApprove', () => {
    it('partitions items by origin and broadcasts each approved message', async () => {
      repo.findStreamingMessageById.mockResolvedValue(
        streamingMessage({ status: MessageStatus.APPROVED }),
      );
      repo.findObituaryMessageById.mockResolvedValue(
        obituaryMessage({ status: MessageStatus.APPROVED }),
      );

      const result = await service.bulkApprove(
        TENANT_ID,
        {
          items: [
            { id: 'msg-stream-1', origin: 'STREAMING' },
            { id: 'msg-obituary-1', origin: 'OBITUARY' },
          ],
        },
        'user-1',
      );

      expect(result.approved).toBe(2);
      expect(repo.bulkApprove).toHaveBeenCalledWith(
        TENANT_ID,
        ['msg-stream-1'],
        ['msg-obituary-1'],
        'user-1',
      );
      expect(gateway.broadcastNewMessage).toHaveBeenCalled();
      expect(gateway.broadcastObituaryMessage).toHaveBeenCalled();
    });
  });

  describe('softDelete / restore', () => {
    it('soft-deletes a streaming message', async () => {
      await service.softDelete(TENANT_ID, 'msg-stream-1', 'STREAMING');

      expect(repo.softDeleteStreamingMessage).toHaveBeenCalledWith(
        TENANT_ID,
        'msg-stream-1',
      );
    });

    it('soft-deletes an obituary message', async () => {
      await service.softDelete(TENANT_ID, 'msg-obituary-1', 'OBITUARY');

      expect(repo.softDeleteObituaryMessage).toHaveBeenCalledWith(
        TENANT_ID,
        'msg-obituary-1',
      );
    });

    it('restores a streaming message deleted within the 30-day window', async () => {
      repo.findStreamingMessageById.mockResolvedValue(
        streamingMessage({ deletedAt: new Date('2026-07-01T00:00:00.000Z') }),
      );

      await service.restore(TENANT_ID, 'msg-stream-1', 'STREAMING');

      expect(repo.restoreStreamingMessage).toHaveBeenCalledWith(
        TENANT_ID,
        'msg-stream-1',
      );
    });

    it('restores a message deleted within the 30-day window', async () => {
      repo.findObituaryMessageById.mockResolvedValue(
        obituaryMessage({ deletedAt: new Date('2026-07-01T00:00:00.000Z') }),
      );

      await service.restore(TENANT_ID, 'msg-obituary-1', 'OBITUARY');

      expect(repo.restoreObituaryMessage).toHaveBeenCalledWith(
        TENANT_ID,
        'msg-obituary-1',
      );
    });

    it('throws ConflictException when the 30-day window has passed (RN-TRIB-003)', async () => {
      repo.findObituaryMessageById.mockResolvedValue(
        obituaryMessage({ deletedAt: new Date('2026-05-01T00:00:00.000Z') }),
      );

      await expect(
        service.restore(TENANT_ID, 'msg-obituary-1', 'OBITUARY'),
      ).rejects.toThrow(ConflictException);
    });

    it('throws BadRequestException when the message is not in the trash', async () => {
      repo.findObituaryMessageById.mockResolvedValue(
        obituaryMessage({ deletedAt: null }),
      );

      await expect(
        service.restore(TENANT_ID, 'msg-obituary-1', 'OBITUARY'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when the message does not exist', async () => {
      repo.findObituaryMessageById.mockResolvedValue(null);

      await expect(
        service.restore(TENANT_ID, 'missing', 'OBITUARY'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('generate', () => {
    it('throws BadRequestException when neither eventId nor obituaryId is given', async () => {
      await expect(service.generate(TENANT_ID, {}, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when both eventId and obituaryId are given', async () => {
      await expect(
        service.generate(
          TENANT_ID,
          { eventId: 'event-1', obituaryId: 'obituary-1' },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when the event does not exist', async () => {
      repo.findEventWithDeceased.mockResolvedValue(null);

      await expect(
        service.generate(TENANT_ID, { eventId: 'missing' }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when there are no approved messages (RN-TRIB-004)', async () => {
      repo.findEventWithDeceased.mockResolvedValue({
        deceased: { firstName: 'María', lastName: 'López' },
      } as never);
      repo.findObituaryByEventId.mockResolvedValue(null);
      repo.findApprovedStreamingMessages.mockResolvedValue([]);

      await expect(
        service.generate(TENANT_ID, { eventId: 'event-1' }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates a PROCESSING generation and flips it to READY in the background', async () => {
      repo.findEventWithDeceased.mockResolvedValue({
        deceased: {
          firstName: 'María',
          lastName: 'López',
          birthDate: null,
          deathDate: null,
          epitaph: null,
          photoUrl: null,
        },
      } as never);
      repo.findObituaryByEventId.mockResolvedValue(null);
      repo.findApprovedStreamingMessages.mockResolvedValue([
        streamingMessage({ status: MessageStatus.APPROVED }),
      ]);
      repo.createGeneration.mockResolvedValue(generationRecord());
      repo.findTenantBrand.mockResolvedValue({
        name: 'Funeraria Demo',
        logoUrl: null,
      });
      const generator = {
        generate: jest.fn().mockResolvedValue(Buffer.from('%PDF-1.4')),
      };
      pdfFactory.create.mockReturnValue(generator as never);
      filesService.savePrivateFile.mockResolvedValue('tribute-books/abc.pdf');
      repo.updateGenerationStatus.mockResolvedValue(
        generationRecord({ status: TributeBookStatus.READY }),
      );

      const result = await service.generate(
        TENANT_ID,
        { eventId: 'event-1' },
        'user-1',
      );

      expect(result.status).toBe('PROCESSING');
      expect(result.pdfUrl).toBeNull();

      await flushMicrotasks();

      expect(pdfFactory.create).toHaveBeenCalledWith('TRIBUTE_BOOK');
      expect(filesService.savePrivateFile).toHaveBeenCalledWith(
        expect.any(Buffer),
        'tribute-books',
        'pdf',
      );
      expect(repo.updateGenerationStatus).toHaveBeenCalledWith(
        'gen-1',
        expect.objectContaining({
          status: TributeBookStatus.READY,
          pdfUrl: 'tribute-books/abc.pdf',
        }),
      );
    });

    it('includes the linked event streaming messages when generating from an obituaryId', async () => {
      repo.findObituaryWithDeceased.mockResolvedValue({
        eventId: 'event-1',
        deceased: {
          firstName: 'María',
          lastName: 'López',
          birthDate: null,
          deathDate: null,
          epitaph: null,
          photoUrl: null,
        },
      } as never);
      repo.findApprovedObituaryMessages.mockResolvedValue([
        obituaryMessage({
          status: MessageStatus.APPROVED,
          createdAt: new Date('2026-07-02T00:00:00.000Z'),
        }),
      ]);
      repo.findApprovedStreamingMessages.mockResolvedValue([
        streamingMessage({
          status: MessageStatus.APPROVED,
          createdAt: new Date('2026-07-01T00:00:00.000Z'),
        }),
      ]);
      repo.createGeneration.mockResolvedValue(
        generationRecord({
          id: 'gen-3',
          eventId: null,
          obituaryId: 'obituary-1',
        }),
      );
      repo.findTenantBrand.mockResolvedValue(null);
      const generator = {
        generate: jest.fn().mockResolvedValue(Buffer.from('%PDF-1.4')),
      };
      pdfFactory.create.mockReturnValue(generator as never);
      filesService.savePrivateFile.mockResolvedValue('tribute-books/xyz.pdf');

      await service.generate(TENANT_ID, { obituaryId: 'obituary-1' }, 'user-1');
      await flushMicrotasks();

      expect(repo.findApprovedStreamingMessages).toHaveBeenCalledWith(
        'event-1',
      );
      const context = generator.generate.mock.calls[0][0];
      expect(context.messages).toHaveLength(2);
      expect(context.messages[0].authorName).toBe('Juan Pérez');
      expect(context.messages[1].authorName).toBe('Ana Gómez');
    });

    it('marks the generation as ERROR when the PDF generator throws', async () => {
      repo.findObituaryWithDeceased.mockResolvedValue({
        eventId: null,
        deceased: {
          firstName: 'María',
          lastName: 'López',
          birthDate: null,
          deathDate: null,
          epitaph: null,
          photoUrl: null,
        },
      } as never);
      repo.findApprovedObituaryMessages.mockResolvedValue([
        obituaryMessage({ status: MessageStatus.APPROVED }),
      ]);
      repo.createGeneration.mockResolvedValue(
        generationRecord({
          id: 'gen-2',
          eventId: null,
          obituaryId: 'obituary-1',
        }),
      );
      repo.findTenantBrand.mockResolvedValue(null);
      pdfFactory.create.mockImplementation(() => {
        throw new Error('boom');
      });

      await service.generate(TENANT_ID, { obituaryId: 'obituary-1' }, 'user-1');
      await flushMicrotasks();

      expect(repo.updateGenerationStatus).toHaveBeenCalledWith(
        'gen-2',
        expect.objectContaining({ status: TributeBookStatus.ERROR }),
      );
    });
  });

  describe('getHistory', () => {
    it('returns a paginated history list', async () => {
      repo.listGenerations.mockResolvedValue({
        data: [generationRecord()],
        total: 1,
      });

      const result = await service.getHistory(TENANT_ID);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].pdfUrl).toBeNull();
    });
  });

  describe('download', () => {
    it('throws BadRequestException while the generation is still processing', async () => {
      repo.findGenerationById.mockResolvedValue(
        generationRecord({ status: TributeBookStatus.PROCESSING }),
      );

      await expect(service.download(TENANT_ID, 'gen-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when the generation failed', async () => {
      repo.findGenerationById.mockResolvedValue(
        generationRecord({
          status: TributeBookStatus.ERROR,
          errorMessage: 'algo falló',
        }),
      );

      await expect(service.download(TENANT_ID, 'gen-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws GoneException when the download link expired', async () => {
      repo.findGenerationById.mockResolvedValue(
        generationRecord({
          status: TributeBookStatus.READY,
          pdfUrl: 'tribute-books/abc.pdf',
          expiresAt: new Date('2026-01-01T00:00:00.000Z'),
        }),
      );

      await expect(service.download(TENANT_ID, 'gen-1')).rejects.toThrow(
        GoneException,
      );
    });

    it('returns the PDF buffer when the link is still valid', async () => {
      repo.findGenerationById.mockResolvedValue(
        generationRecord({
          status: TributeBookStatus.READY,
          pdfUrl: 'tribute-books/abc.pdf',
          expiresAt: new Date('2026-12-01T00:00:00.000Z'),
        }),
      );
      filesService.readPrivateFile.mockResolvedValue(Buffer.from('%PDF-1.4'));

      const result = await service.download(TENANT_ID, 'gen-1');

      expect(result.buffer.toString()).toBe('%PDF-1.4');
      expect(result.filename).toBe('libro-homenajes-gen-1.pdf');
    });

    it('throws NotFoundException when the generation record does not exist', async () => {
      repo.findGenerationById.mockResolvedValue(null);

      await expect(service.download(TENANT_ID, 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
