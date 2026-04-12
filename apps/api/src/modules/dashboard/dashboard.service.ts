import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getExecutiveDashboard() {
    const [totalMembers, activeMembers, charges, payments, transactions] =
      await Promise.all([
        this.prisma.member.count(),
        this.prisma.member.count({ where: { status: 'ACTIVE' } }),
        this.prisma.charge.findMany(),
        this.prisma.payment.aggregate({
          _sum: { amount: true },
          where: { status: 'REGISTERED' },
        }),
        this.prisma.cashTransaction.groupBy({
          by: ['direction'],
          _sum: { amount: true },
        }),
      ]);

    const totalCharged = charges.reduce((s, c) => s + Number(c.amount), 0);
    const totalPaid = charges.reduce((s, c) => s + Number(c.paidAmount), 0);
    const delinquentMembers = await this.prisma.member.count({
      where: {
        charges: {
          some: {
            paidAmount: { lt: this.prisma.charge.fields.amount },
          },
        },
      },
    });

    const income = transactions.find((t) => t.direction === 'IN')?._sum.amount ?? 0;
    const expense = transactions.find((t) => t.direction === 'OUT')?._sum.amount ?? 0;

    return {
      cards: {
        totalMembers,
        activeMembers,
        delinquentMembers,
        collectedAmount: Number(payments._sum.amount ?? 0),
        totalDebt: totalCharged - totalPaid,
        income: Number(income),
        expense: Number(expense),
      },
      alerts: [
        ...(delinquentMembers > 0
          ? [{ code: 'DELINQUENCY', label: 'socios con deuda pendiente', value: delinquentMembers }]
          : []),
      ],
    };
  }
}
