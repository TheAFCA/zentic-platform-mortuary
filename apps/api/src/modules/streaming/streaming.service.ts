import { Injectable } from '@nestjs/common';
import { StreamingRepository } from './streaming.repository';

@Injectable()
export class StreamingService {
  constructor(private readonly streamingRepo: StreamingRepository) {}

  // TODO: Implement in Module 06 — Streaming

  findAll(_tenantId: string) {
    throw new Error('Not implemented');
  }
  findOne(_tenantId: string, _id: string) {
    throw new Error('Not implemented');
  }
  findPublic(_slug: string) {
    throw new Error('Not implemented');
  }
  create(_tenantId: string, _dto: unknown) {
    throw new Error('Not implemented');
  }
  update(_tenantId: string, _id: string, _dto: unknown) {
    throw new Error('Not implemented');
  }
  remove(_tenantId: string, _id: string) {
    throw new Error('Not implemented');
  }
  startStream(_tenantId: string, _id: string) {
    throw new Error('Not implemented');
  }
  stopStream(_tenantId: string, _id: string) {
    throw new Error('Not implemented');
  }
}
