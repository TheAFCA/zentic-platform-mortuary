import { Test, TestingModule } from '@nestjs/testing';
import { TributeBookController } from './tribute-book.controller';
import { TributeBookService } from './tribute-book.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('TributeBookController', () => {
  let controller: TributeBookController;
  let service: jest.Mocked<TributeBookService>;

  const mockService = {
    listMessages: jest.fn(),
    pendingCount: jest.fn(),
    approveMessage: jest.fn(),
    rejectMessage: jest.fn(),
    bulkApprove: jest.fn(),
    softDelete: jest.fn(),
    restore: jest.fn(),
    generate: jest.fn(),
    getHistory: jest.fn(),
    download: jest.fn(),
  };

  const user = { sub: 'user-1' } as never;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TributeBookController],
      providers: [
        { provide: TributeBookService, useValue: mockService },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = module.get(TributeBookController);
    service = module.get(TributeBookService) as jest.Mocked<TributeBookService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('listMessages delegates to the service', async () => {
    service.listMessages.mockResolvedValue({ data: [] } as never);

    await controller.listMessages('tenant-1', { status: undefined } as never);

    expect(service.listMessages).toHaveBeenCalledWith('tenant-1', {
      status: undefined,
    });
  });

  it('pendingCount wraps the count in an object', async () => {
    service.pendingCount.mockResolvedValue(3);

    const result = await controller.pendingCount('tenant-1');

    expect(result).toEqual({ count: 3 });
  });

  it('approveMessage delegates to the service with the actor id', async () => {
    await controller.approveMessage(
      'tenant-1',
      'msg-1',
      { origin: 'STREAMING' },
      user,
    );

    expect(service.approveMessage).toHaveBeenCalledWith(
      'tenant-1',
      'msg-1',
      'STREAMING',
      'user-1',
    );
  });

  it('rejectMessage forwards the rejection reason', async () => {
    await controller.rejectMessage(
      'tenant-1',
      'msg-1',
      { origin: 'OBITUARY', rejectedReason: 'spam' },
      user,
    );

    expect(service.rejectMessage).toHaveBeenCalledWith(
      'tenant-1',
      'msg-1',
      'OBITUARY',
      'user-1',
      'spam',
    );
  });

  it('bulkApprove delegates to the service', async () => {
    const dto = { items: [{ id: 'msg-1', origin: 'STREAMING' as const }] };

    await controller.bulkApprove('tenant-1', dto, user);

    expect(service.bulkApprove).toHaveBeenCalledWith('tenant-1', dto, 'user-1');
  });

  it('softDelete delegates to the service', async () => {
    await controller.softDelete('tenant-1', 'msg-1', { origin: 'STREAMING' });

    expect(service.softDelete).toHaveBeenCalledWith(
      'tenant-1',
      'msg-1',
      'STREAMING',
    );
  });

  it('restore delegates to the service', async () => {
    await controller.restore('tenant-1', 'msg-1', { origin: 'OBITUARY' });

    expect(service.restore).toHaveBeenCalledWith(
      'tenant-1',
      'msg-1',
      'OBITUARY',
    );
  });

  it('generate delegates to the service with the actor id', async () => {
    await controller.generate('tenant-1', { eventId: 'event-1' }, user);

    expect(service.generate).toHaveBeenCalledWith(
      'tenant-1',
      { eventId: 'event-1' },
      'user-1',
    );
  });

  it('getHistory parses page/limit from query strings', async () => {
    await controller.getHistory('tenant-1', '2', '10');

    expect(service.getHistory).toHaveBeenCalledWith('tenant-1', 2, 10);
  });

  it('getHistory passes undefined when page/limit are omitted', async () => {
    await controller.getHistory('tenant-1');

    expect(service.getHistory).toHaveBeenCalledWith(
      'tenant-1',
      undefined,
      undefined,
    );
  });

  it('download streams the PDF buffer with the right headers', async () => {
    service.download.mockResolvedValue({
      buffer: Buffer.from('%PDF-1.4'),
      filename: 'libro-homenajes-gen-1.pdf',
    });
    const res = {
      header: jest.fn(),
      send: jest.fn(),
    } as never;

    await controller.download('tenant-1', 'gen-1', res);

    expect(service.download).toHaveBeenCalledWith('tenant-1', 'gen-1');
    expect((res as any).header).toHaveBeenCalledWith(
      'Content-Type',
      'application/pdf',
    );
    expect((res as any).header).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="libro-homenajes-gen-1.pdf"',
    );
    expect((res as any).send).toHaveBeenCalledWith(Buffer.from('%PDF-1.4'));
  });
});
