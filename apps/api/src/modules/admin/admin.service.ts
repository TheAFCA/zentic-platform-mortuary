import { Injectable } from '@nestjs/common';
import { AdminRepository } from './admin.repository';

@Injectable()
export class AdminService {
  constructor(private readonly adminRepo: AdminRepository) {}

  // TODO: Implement in Module 05 — Admin General

  getDashboard(_tenantId: string) {
    throw new Error('Not implemented');
  }
  getUsers(_tenantId: string) {
    throw new Error('Not implemented');
  }
  createUser(_tenantId: string, _dto: unknown) {
    throw new Error('Not implemented');
  }
  updateUser(_tenantId: string, _id: string, _dto: unknown) {
    throw new Error('Not implemented');
  }
  getSettings(_tenantId: string) {
    throw new Error('Not implemented');
  }
  updateSettings(_tenantId: string, _dto: unknown) {
    throw new Error('Not implemented');
  }
  updateBrand(_tenantId: string, _dto: unknown) {
    throw new Error('Not implemented');
  }
}
