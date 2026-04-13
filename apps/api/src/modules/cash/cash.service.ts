import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CashService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.cashTransaction.findMany({
      orderBy: { occurredAt: 'desc' },
    });
  }

  create(data: {
    direction: 'IN' | 'OUT';
    amount: number;
    description: string;
    occurredAt: string;
    methodCode?: string;
    incomeType?: string;
    expenseType?: string;
    receiptNote?: string;
  }) {
    return this.prisma.cashTransaction.create({
      data: {
        direction: data.direction,
        amount: data.amount,
        description: data.description,
        occurredAt: new Date(data.occurredAt),
        methodCode: data.methodCode,
        incomeType: data.incomeType as any,
        expenseType: data.expenseType as any,
        receiptNote: data.receiptNote,
      },
    });
  }
}
