import { Test, TestingModule } from '@nestjs/testing';
import { TributeBookCleanupService } from './tribute-book-cleanup.service';
import { TributeBookRepository } from './tribute-book.repository';

describe('TributeBookCleanupService', () => {
  let service: TributeBookCleanupService;
  let repo: jest.Mocked<TributeBookRepository>;

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-31T03:00:00.000Z'));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TributeBookCleanupService,
        {
          provide: TributeBookRepository,
          useValue: { hardDeleteOlderThan: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(TributeBookCleanupService);
    repo = module.get(TributeBookRepository);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('purges messages soft-deleted more than 30 days ago (RN-TRIB-003)', async () => {
    repo.hardDeleteOlderThan.mockResolvedValue({
      streamingDeleted: 2,
      obituaryDeleted: 1,
    });

    await service.purgeExpiredTrash();

    expect(repo.hardDeleteOlderThan).toHaveBeenCalledTimes(1);
    const cutoff = repo.hardDeleteOlderThan.mock.calls[0][0];
    expect(cutoff.toISOString()).toBe('2026-07-01T03:00:00.000Z');
  });

  it('does not throw when there is nothing to purge', async () => {
    repo.hardDeleteOlderThan.mockResolvedValue({
      streamingDeleted: 0,
      obituaryDeleted: 0,
    });

    await expect(service.purgeExpiredTrash()).resolves.toBeUndefined();
  });
});
