import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getExecutiveDashboard() {
    const [totalMembers, activeMembers, delinquentMembers, payments, transactions] =
      await Promise.all([
        this.prisma.member.count(),
        this.prisma.member.count({ where: { currentStatusCode: 'ACTIVE' } }),
        this.prisma.charge.groupBy({
          by: ['memberId'],
          where: { status: 'PENDING' },
        }),
        this.prisma.payment.aggregate({
          _sum: { amount: true },
          where: { status: 'REGISTERED' },
        }),
        this.prisma.cashTransaction.groupBy({
          by: ['direction'],
          _sum: { amount: true },
        }),
      ]);

    const income = transactions.find((item) => item.direction === 'IN')?._sum.amount ?? 0;
    const expense = transactions.find((item) => item.direction === 'OUT')?._sum.amount ?? 0;

    return {
      cards: {
        totalMembers,
        activeMembers,
        delinquentMembers: delinquentMembers.length,
        collectedAmount: Number(payments._sum.amount ?? 0),
        income: Number(income),
        expense: Number(expense),
      },
      alerts: [
        {
          code: 'DELINQUENCY',
          label: 'Socios con deuda pendiente',
          value: delinquentMembers.length,
        },
      ],
    };
  }
}

