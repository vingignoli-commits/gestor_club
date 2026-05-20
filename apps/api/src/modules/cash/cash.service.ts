import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type CashInput = {
  direction: 'IN' | 'OUT';
  amount: number;
  description: string;
  occurredAt: string;
  methodCode?: string;
  incomeType?: string;
  expenseType?: string;
  receiptUrl?: string;
  receiptNote?: string;
  notes?: string;
};

@Injectable()
export class CashService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.cashTransaction.findMany({
      orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getSummary() {
    const [transactions, periodCloses] = await Promise.all([
      this.prisma.cashTransaction.findMany({
        orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.cashPeriodClose.findMany({
        orderBy: [{ period: 'desc' }],
      }),
    ]);

    const activeTransactions = transactions.filter(
      (transaction) => transaction.status === 'REGISTERED',
    );

    const totalIn = activeTransactions
      .filter((transaction) => transaction.direction === 'IN')
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

    const totalOut = activeTransactions
      .filter((transaction) => transaction.direction === 'OUT')
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

    return {
      totalIn,
      totalOut,
      balance: totalIn - totalOut,
      transactions,
      periodCloses,
    };
  }

  getPeriodCloses() {
    return this.prisma.cashPeriodClose.findMany({
      orderBy: [{ period: 'desc' }],
    });
  }

  async create(data: CashInput) {
    const occurredAt = new Date(data.occurredAt);
    await this.ensurePeriodIsOpen(occurredAt);

    return this.prisma.cashTransaction.create({
      data: {
        direction: data.direction,
        amount: Number(data.amount),
        description: data.description.trim(),
        occurredAt,
        methodCode: data.methodCode ?? null,
        incomeType:
          data.direction === 'IN' && data.incomeType
            ? (data.incomeType as never)
            : null,
        expenseType:
          data.direction === 'OUT' && data.expenseType
            ? (data.expenseType as never)
            : null,
        receiptUrl: data.receiptUrl?.trim() || null,
        receiptNote: data.receiptNote?.trim() || null,
        notes: data.notes?.trim() || null,
      },
    });
  }

  async update(id: string, data: Partial<CashInput>) {
    const current = await this.prisma.cashTransaction.findUnique({
      where: { id },
    });

    if (!current) {
      throw new NotFoundException('Movimiento de caja no encontrado.');
    }

    if (current.status === 'VOID') {
      throw new BadRequestException('No se puede editar un movimiento anulado.');
    }

    const nextOccurredAt = data.occurredAt
      ? new Date(data.occurredAt)
      : current.occurredAt;

    await this.ensurePeriodIsOpen(current.occurredAt);
    await this.ensurePeriodIsOpen(nextOccurredAt);

    const direction = data.direction ?? current.direction;

    return this.prisma.cashTransaction.update({
      where: { id },
      data: {
        direction,
        amount: data.amount === undefined ? undefined : Number(data.amount),
        description:
          data.description === undefined ? undefined : data.description.trim(),
        occurredAt: data.occurredAt === undefined ? undefined : nextOccurredAt,
        methodCode: data.methodCode === undefined ? undefined : data.methodCode,
        incomeType:
          direction === 'IN'
            ? data.incomeType === undefined
              ? undefined
              : (data.incomeType as never)
            : null,
        expenseType:
          direction === 'OUT'
            ? data.expenseType === undefined
              ? undefined
              : (data.expenseType as never)
            : null,
        receiptUrl:
          data.receiptUrl === undefined ? undefined : data.receiptUrl.trim() || null,
        receiptNote:
          data.receiptNote === undefined
            ? undefined
            : data.receiptNote.trim() || null,
        notes: data.notes === undefined ? undefined : data.notes.trim() || null,
      },
    });
  }

  async voidTransaction(id: string, reason?: string) {
    const transaction = await this.prisma.cashTransaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      throw new NotFoundException('Movimiento de caja no encontrado.');
    }

    if (transaction.status === 'VOID') {
      return transaction;
    }

    await this.ensurePeriodIsOpen(transaction.occurredAt);

    return this.prisma.cashTransaction.update({
      where: { id },
      data: {
        status: 'VOID',
        voidedAt: new Date(),
        voidReason: reason?.trim() || 'Anulado sin motivo informado',
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

    const occurredAt = data.occurredAt ? new Date(data.occurredAt) : new Date();
    await this.ensurePeriodIsOpen(occurredAt);

    return this.prisma.cashTransaction.create({
      data: {
        direction: difference > 0 ? 'IN' : 'OUT',
        amount: Math.abs(difference),
        occurredAt,
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

  async closePeriod(data: {
    period: string;
    initialBalance: number;
    notes?: string;
  }) {
    if (!/^\d{4}-\d{2}$/.test(data.period)) {
      throw new BadRequestException('El período debe tener formato YYYY-MM.');
    }

    const existing = await this.prisma.cashPeriodClose.findUnique({
      where: { period: data.period },
    });

    if (existing) {
      throw new BadRequestException('El período ya está cerrado.');
    }

    const [year, month] = data.period.split('-').map(Number);
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));

    const transactions = await this.prisma.cashTransaction.findMany({
      where: {
        status: 'REGISTERED',
        occurredAt: {
          gte: start,
          lt: end,
        },
      },
    });

    const totalIn = transactions
      .filter((transaction) => transaction.direction === 'IN')
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

    const totalOut = transactions
      .filter((transaction) => transaction.direction === 'OUT')
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

    const initialBalance = Number(data.initialBalance);
    const finalBalance = initialBalance + totalIn - totalOut;

    return this.prisma.cashPeriodClose.create({
      data: {
        period: data.period,
        initialBalance,
        finalBalance,
        notes: data.notes?.trim() || null,
      },
    });
  }

  private async ensurePeriodIsOpen(date: Date) {
    const period = this.periodFromDate(date);

    const close = await this.prisma.cashPeriodClose.findUnique({
      where: { period },
    });

    if (close) {
      throw new BadRequestException(
        `El período ${period} ya está cerrado. No se pueden modificar movimientos.`,
      );
    }
  }

  private periodFromDate(date: Date) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
      2,
      '0',
    )}`;
  }
}
