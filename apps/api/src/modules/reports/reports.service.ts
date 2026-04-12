import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDebtors() {
    const members = await this.prisma.member.findMany({
      include: {
        charges: { include: { billingPeriod: true } },
      },
    });

    return members
      .map((m) => {
        const totalCharged = m.charges.reduce((s, c) => s + Number(c.amount), 0);
        const totalPaid = m.charges.reduce((s, c) => s + Number(c.paidAmount), 0);
        const debt = totalCharged - totalPaid;
        return {
          id: m.id,
          matricula: m.matricula,
          firstName: m.firstName,
          lastName: m.lastName,
          category: m.category,
          status: m.status,
          phone: m.phone,
          debt,
          periodsOwed: m.charges.filter(
            (c) => Number(c.paidAmount) < Number(c.amount)
          ).length,
        };
      })
      .filter((m) => m.debt > 0)
      .sort((a, b) => b.debt - a.debt);
  }

  async getMonthlyCollection() {
    const payments = await this.prisma.payment.findMany({
      where: { status: 'REGISTERED' },
      orderBy: { paidAt: 'asc' },
    });

    const grouped: Record<string, number> = {};
    for (const p of payments) {
      const key = `${p.paidAt.getFullYear()}-${String(p.paidAt.getMonth() + 1).padStart(2, '0')}`;
      grouped[key] = (grouped[key] ?? 0) + Number(p.amount);
    }

    return Object.entries(grouped).map(([month, total]) => ({ month, total }));
  }

  async getCashSummary() {
    const transactions = await this.prisma.cashTransaction.findMany({
      orderBy: { occurredAt: 'desc' },
    });

    const totalIn = transactions
      .filter((t) => t.direction === 'IN')
      .reduce((s, t) => s + Number(t.amount), 0);

    const totalOut = transactions
      .filter((t) => t.direction === 'OUT')
      .reduce((s, t) => s + Number(t.amount), 0);

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

    const grouped: Record<string, { active: number; inactive: number }> = {};
    for (const m of members) {
      if (!grouped[m.category]) {
        grouped[m.category] = { active: 0, inactive: 0 };
      }
      if (m.status === 'ACTIVE') {
        grouped[m.category].active++;
      } else {
        grouped[m.category].inactive++;
      }
    }

    return Object.entries(grouped).map(([category, counts]) => ({
      category,
      ...counts,
      total: counts.active + counts.inactive,
    }));
  }
}
