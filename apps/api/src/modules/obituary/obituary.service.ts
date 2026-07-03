import { Injectable } from '@nestjs/common';
import { ObituaryRepository } from './obituary.repository';

@Injectable()
export class ObituaryService {
  constructor(private readonly obituaryRepo: ObituaryRepository) {}

  // TODO: Implement in Module 07 — Obituarios

  findAll(_tenantId: string) { throw new Error('Not implemented'); }
  findOne(_tenantId: string, _id: string) { throw new Error('Not implemented'); }
  findPublic(_slug: string) { throw new Error('Not implemented'); }
  create(_tenantId: string, _dto: unknown) { throw new Error('Not implemented'); }
  update(_tenantId: string, _id: string, _dto: unknown) { throw new Error('Not implemented'); }
  publish(_tenantId: string, _id: string) { throw new Error('Not implemented'); }
  unpublish(_tenantId: string, _id: string) { throw new Error('Not implemented'); }
  remove(_tenantId: string, _id: string) { throw new Error('Not implemented'); }
}
