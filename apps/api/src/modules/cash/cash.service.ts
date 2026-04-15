import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CashService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.cashTransaction.findMany({
      orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getSummary() {
    const transactions = await this.prisma.cashTransaction.findMany({
      orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
    });

    const totalIn = transactions
      .filter((transaction) => transaction.direction === 'IN')
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

    const totalOut = transactions
      .filter((transaction) => transaction.direction === 'OUT')
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

    return {
      totalIn,
      totalOut,
      balance: totalIn - totalOut,
      transactions,
    };
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
    notes?: string;
  }) {
    return this.prisma.cashTransaction.create({
      data: {
        direction: data.direction,
        amount: data.amount,
        description: data.description,
        occurredAt: new Date(data.occurredAt),
        methodCode: data.methodCode ?? null,
        incomeType: data.incomeType ? (data.incomeType as never) : null,
        expenseType: data.expenseType ? (data.expenseType as never) : null,
        receiptNote: data.receiptNote ?? null,
        notes: data.notes ?? null,
      },
    });
  }

  async createCorrection(data: {
    actualBalance: number;
    occurredAt?: string;
    notes?: string;
    methodCode?: string;
  }) {
    const summary = await this.getSummary();
    const actualBalance = Number(data.actualBalance);
    const difference = actualBalance - summary.balance;

    if (Number.isNaN(actualBalance)) {
      throw new BadRequestException('El valor real es inválido.');
    }

    if (difference === 0) {
      throw new BadRequestException(
        'No hay diferencia entre el saldo actual y el saldo real.',
      );
    }

    return this.prisma.cashTransaction.create({
      data: {
        direction: difference > 0 ? 'IN' : 'OUT',
        amount: Math.abs(difference),
        occurredAt: data.occurredAt
          ? new Date(data.occurredAt)
          : new Date(),
        methodCode: data.methodCode ?? 'AJUSTE',
        incomeType: difference > 0 ? ('OTHER' as never) : null,
        expenseType: difference < 0 ? ('OTHER' as never) : null,
        description: 'Corrección de caja',
        receiptNote: null,
        notes:
          data.notes?.trim() ||
          `Saldo teórico: ${summary.balance}. Saldo real informado: ${actualBalance}.`,
      },
    });
  }
}
