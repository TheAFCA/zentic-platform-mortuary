import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StreamingRepository {
  constructor(private readonly prisma: PrismaService) {}

  // TODO: Implement in Module 06 — Streaming
}
