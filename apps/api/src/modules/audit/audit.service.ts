import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type AuditPayload = {
  entityName: string;
  entityId: string;
  action: string;
  beforeData?: unknown;
  afterData?: unknown;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  log(data: AuditPayload) {
    return this.prisma.auditLog.create({
      data: {
        entityName: data.entityName,
        entityId: data.entityId,
        action: data.action,
        beforeData: data.beforeData as Prisma.InputJsonValue | undefined,
        afterData: data.afterData as Prisma.InputJsonValue | undefined,
      },
    });
  }

  logWithinTx(tx: PrismaClient | Prisma.TransactionClient, data: AuditPayload) {
    return tx.auditLog.create({
      data: {
        entityName: data.entityName,
        entityId: data.entityId,
        action: data.action,
        beforeData: data.beforeData as Prisma.InputJsonValue | undefined,
        afterData: data.afterData as Prisma.InputJsonValue | undefined,
      },
    });
  }

  list(entityName?: string) {
    return this.prisma.auditLog.findMany({
      where: entityName ? { entityName } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }
}

