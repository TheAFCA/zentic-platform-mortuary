import { Test, TestingModule } from '@nestjs/testing';
import { StreamingService } from './streaming.service';
import { StreamingRepository } from './streaming.repository';

describe('StreamingService', () => {
  let service: StreamingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StreamingService,
        {
          provide: StreamingRepository,
          useValue: {
            findMany: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<StreamingService>(StreamingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // TODO: Add unit tests when implementing Module 06
});
