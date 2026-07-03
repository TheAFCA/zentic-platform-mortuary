import { Injectable } from '@nestjs/common';
import { LeadsRepository } from './leads.repository';

@Injectable()
export class LeadsService {
  constructor(private readonly leadsRepo: LeadsRepository) {}

  // TODO: Implement in Module 13 — Leads / Mini-CRM

  findAll(_tenantId: string) { throw new Error('Not implemented'); }
  findOne(_tenantId: string, _id: string) { throw new Error('Not implemented'); }
  update(_tenantId: string, _id: string, _dto: unknown) { throw new Error('Not implemented'); }
  addNote(_tenantId: string, _leadId: string, _dto: unknown) { throw new Error('Not implemented'); }
  convert(_tenantId: string, _leadId: string) { throw new Error('Not implemented'); }
  remove(_tenantId: string, _id: string) { throw new Error('Not implemented'); }
  exportCsv(_tenantId: string) { throw new Error('Not implemented'); }
  getMetrics(_tenantId: string) { throw new Error('Not implemented'); }
}
