import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ObituaryRepository {
  constructor(private readonly prisma: PrismaService) {}

  // TODO: Implement in Module 07 — Obituarios
}
