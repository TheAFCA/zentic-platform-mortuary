import { Injectable } from '@nestjs/common';
import { SuperAdminRepository } from './super-admin.repository';

@Injectable()
export class SuperAdminService {
  constructor(private readonly superAdminRepo: SuperAdminRepository) {}

  // TODO: Implement in Module 04 — Super Admin

  getDashboard() { throw new Error('Not implemented'); }
  getTenants() { throw new Error('Not implemented'); }
  createTenant(_dto: unknown) { throw new Error('Not implemented'); }
  getTenant(_id: string) { throw new Error('Not implemented'); }
  updateTenant(_id: string, _dto: unknown) { throw new Error('Not implemented'); }
  suspendTenant(_id: string, _dto: unknown) { throw new Error('Not implemented'); }
  reactivateTenant(_id: string) { throw new Error('Not implemented'); }
  deleteTenant(_id: string) { throw new Error('Not implemented'); }
  impersonate(_tenantId: string, _reason: string) { throw new Error('Not implemented'); }
  getAuditLogs() { throw new Error('Not implemented'); }
  getUsers() { throw new Error('Not implemented'); }
}
