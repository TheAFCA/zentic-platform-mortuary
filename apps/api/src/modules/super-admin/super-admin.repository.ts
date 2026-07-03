import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SuperAdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  // TODO: Implement in Module 04 — Super Admin
}
