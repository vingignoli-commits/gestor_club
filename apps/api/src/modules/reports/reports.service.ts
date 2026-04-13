import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildCurrentRatesMap,
  buildDebtSnapshot,
} from '../members/member-debt.utils';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDebtors() {
    const queryDate = new Date();

    const [members, rates] = await Promise.all([
      this.prisma.member.findMany({
        include: {
          payments: {
            where: { status: 'REGISTERED' },
            orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
          },
          statusHistory: {
            orderBy: { effectiveFrom: 'desc' },
          },
          categoryHistory: {
            orderBy: { effectiveFrom: 'desc' },
          },
        },
      }),
      this.prisma.monthlyRate.findMany({
        where: {
          validFrom: { lte: queryDate },
          OR: [{ validTo: null }, { validTo: { gt: queryDate } }],
        },
        orderBy: [{ category: 'asc' }, { validFrom: 'desc' }],
      }),
    ]);

    const currentRates = buildCurrentRatesMap(rates, queryDate);

    return members
      .map((member) => {
        const snapshot = buildDebtSnapshot(member, currentRates, queryDate);

        return {
          id: member.id,
          matricula: member.matricula,
          firstName: member.firstName,
          lastName: member.lastName,
          category: member.category,
          status: member.status,
          phone: member.phone,
          debt: snapshot.debt,
          monthsOwed: snapshot.monthsOwed,
          owesCurrentMonth: snapshot.owesCurrentMonth,
          overdueMonthsCount: snapshot.overdueMonthsCount,
          overdueMonthLabels: snapshot.overdueMonthLabels,
          debtLevel: snapshot.debtLevel,
          debtLevelLabel: snapshot.debtLevelLabel,
          debtColor: snapshot.debtColor,
          months: snapshot.months,
        };
      })
      .filter((member) => member.debt > 0)
      .sort((a, b) => b.debt - a.debt);
  }

  async getMonthlyCollection() {
    const payments = await this.prisma.payment.findMany({
      where: { status: 'REGISTERED' },
      orderBy: [{ periodYear: 'asc' }, { periodMonth: 'asc' }],
    });

    const grouped: Record<string, number> = {};

    for (const payment of payments) {
      const key = `${payment.periodYear}-${String(payment.periodMonth).padStart(2, '0')}`;
      grouped[key] = (grouped[key] ?? 0) + Number(payment.amount);
    }

    return Object.entries(grouped).map(([month, total]) => ({
      month,
      total,
    }));
  }

  async getCashSummary() {
    const transactions = await this.prisma.cashTransaction.findMany({
      orderBy: { occurredAt: 'desc' },
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

  async getMembersByCategory() {
    const members = await this.prisma.member.findMany({
      select: {
        category: true,
        status: true,
      },
    });

    const grouped: Record<
      string,
      { active: number; inactive: number }
    > = {};

    for (const member of members) {
      if (!grouped[member.category]) {
        grouped[member.category] = {
          active: 0,
          inactive: 0,
        };
      }

      if (member.status === 'ACTIVE') {
        grouped[member.category].active += 1;
      } else {
        grouped[member.category].inactive += 1;
      }
    }

    return Object.entries(grouped).map(([category, counts]) => ({
      category,
      ...counts,
      total: counts.active + counts.inactive,
    }));
  }
}
