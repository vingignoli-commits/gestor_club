import { Injectable } from '@nestjs/common';
import {
  MemberCategory,
  MemberStatus,
  PaymentStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildCurrentRatesMap,
  buildDebtSnapshot,
} from '../members/member-debt.utils';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getExecutiveDashboard() {
    const today = new Date();
    const monthStart = startOfMonth(today);
    const nextMonthStart = addMonths(monthStart, 1);

    const [members, rates, payments, cashTransactions] = await Promise.all([
      this.prisma.member.findMany({
        include: {
          payments: {
            where: { status: PaymentStatus.REGISTERED },
            orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
          },
          statusHistory: {
            orderBy: { effectiveFrom: 'desc' },
          },
          categoryHistory: {
            orderBy: { effectiveFrom: 'desc' },
          },
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      }),
      this.prisma.monthlyRate.findMany({
        where: {
          validFrom: { lte: today },
          OR: [{ validTo: null }, { validTo: { gt: today } }],
        },
        orderBy: [{ category: 'asc' }, { validFrom: 'desc' }],
      }),
      this.prisma.payment.findMany({
        where: {
          status: PaymentStatus.REGISTERED,
        },
      }),
      this.prisma.cashTransaction.findMany(),
    ]);

    const currentRates = buildCurrentRatesMap(rates, today);

    const membersByCategoryMap = new Map<string, number>();
    const membersByGradeMap = new Map<string, number>();

    let activeMembers = 0;
    let ageSum = 0;
    let ageCount = 0;

    const birthdaysThisMonth = members
      .filter(
        (member) =>
          member.birthDate &&
          member.birthDate.getUTCMonth() === today.getUTCMonth(),
      )
      .sort(
        (a, b) =>
          (a.birthDate?.getUTCDate() ?? 0) - (b.birthDate?.getUTCDate() ?? 0),
      )
      .map((member) => ({
        id: member.id,
        fullName: `${member.lastName}, ${member.firstName}`,
        date: member.birthDate!.toISOString(),
        day: member.birthDate!.getUTCDate(),
      }));

    const debtSnapshots = members.map((member) => ({
      member,
      snapshot: buildDebtSnapshot(member, currentRates, today),
    }));

    const debtors = debtSnapshots
      .filter((item) => item.snapshot.overdueMonthsCount > 0)
      .map((item) => ({
        id: item.member.id,
        fullName: `${item.member.lastName}, ${item.member.firstName}`,
        matricula: item.member.matricula,
        totalDebt: item.snapshot.debt,
        overdueMonthsCount: item.snapshot.overdueMonthsCount,
      }))
      .sort((a, b) => {
        if (b.totalDebt !== a.totalDebt) {
          return b.totalDebt - a.totalDebt;
        }
        return b.overdueMonthsCount - a.overdueMonthsCount;
      });

    const totalDebtToDate = debtSnapshots.reduce(
      (sum, item) => sum + item.snapshot.debt,
      0,
    );

    const totalCashIn = cashTransactions
      .filter((transaction) => transaction.direction === 'IN')
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

    const totalCashOut = cashTransactions
      .filter((transaction) => transaction.direction === 'OUT')
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

    const currentMonthCollection = payments
      .filter(
        (payment) =>
          payment.paidAt >= monthStart &&
          payment.paidAt < nextMonthStart &&
          payment.status === PaymentStatus.REGISTERED,
      )
      .reduce((sum, payment) => sum + Number(payment.amount), 0);

    const currentMonthCashIn = cashTransactions
      .filter(
        (transaction) =>
          transaction.direction === 'IN' &&
          transaction.occurredAt >= monthStart &&
          transaction.occurredAt < nextMonthStart,
      )
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

    const currentMonthCashOut = cashTransactions
      .filter(
        (transaction) =>
          transaction.direction === 'OUT' &&
          transaction.occurredAt >= monthStart &&
          transaction.occurredAt < nextMonthStart,
      )
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

    let currentMonthExpected = 0;
    let currentMonthUncollected = 0;
    let activeContributionBase = 0;

    for (const member of members) {
      membersByCategoryMap.set(
        member.category,
        (membersByCategoryMap.get(member.category) ?? 0) + 1,
      );

      const gradeKey = member.grade ?? 'SIN_GRADO';
      membersByGradeMap.set(
        gradeKey,
        (membersByGradeMap.get(gradeKey) ?? 0) + 1,
      );

      if (member.status === MemberStatus.ACTIVE) {
        activeMembers += 1;
      }

      if (member.birthDate) {
        ageSum += calculateAge(member.birthDate, today);
        ageCount += 1;
      }

      if (!isActiveInMonth(member, monthStart, nextMonthStart)) {
        continue;
      }

      activeContributionBase += 1;

      const monthCategory =
        resolveCategoryForMonth(member, monthStart, nextMonthStart) ??
        member.category;

      const expectedAmount = currentRates.get(monthCategory) ?? 0;
      currentMonthExpected += expectedAmount;

      const snapshot = debtSnapshots.find((item) => item.member.id === member.id)?.snapshot;
      if (snapshot?.owesCurrentMonth) {
        currentMonthUncollected += expectedAmount;
      }
    }

    const delinquencyIndex =
      today.getUTCDate() > 5 && currentMonthExpected > 0
        ? (currentMonthUncollected / currentMonthExpected) * 100
        : 0;

    const averageMonthlyContribution =
      activeContributionBase > 0
        ? currentMonthCollection / activeContributionBase
        : 0;

    return {
      people: {
        totalMembers: members.length,
        byCategory: Array.from(membersByCategoryMap.entries()).map(
          ([category, count]) => ({
            category,
            count,
          }),
        ),
        byGrade: Array.from(membersByGradeMap.entries()).map(([grade, count]) => ({
          grade,
          count,
        })),
        activeMembers,
        averageAge: ageCount > 0 ? ageSum / ageCount : 0,
        birthdaysThisMonth,
      },
      accounting: {
        cashBalance: totalCashIn - totalCashOut,
        currentMonthCollection,
        operatingCashFlow: currentMonthCashIn - currentMonthCashOut,
        debtors,
        totalDebtToDate,
        delinquencyIndex,
        averageMonthlyContribution,
      },
    };
  }
}

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function calculateAge(birthDate: Date, today: Date): number {
  let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDiff = today.getUTCMonth() - birthDate.getUTCMonth();
  const dayDiff = today.getUTCDate() - birthDate.getUTCDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }

  return age;
}

function overlaps(
  from: Date,
  to: Date | null,
  monthStart: Date,
  monthEnd: Date,
): boolean {
  const effectiveTo = to ?? new Date('2999-12-31T00:00:00.000Z');
  return from.getTime() < monthEnd.getTime() && effectiveTo.getTime() > monthStart.getTime();
}

function isActiveInMonth(
  member: {
    status: MemberStatus;
    joinedAt: Date;
    statusHistory: Array<{
      status: MemberStatus;
      effectiveFrom: Date;
      effectiveTo: Date | null;
    }>;
  },
  monthStart: Date,
  monthEnd: Date,
): boolean {
  if (member.statusHistory.length > 0) {
    return member.statusHistory.some(
      (item) =>
        item.status === MemberStatus.ACTIVE &&
        overlaps(item.effectiveFrom, item.effectiveTo, monthStart, monthEnd),
    );
  }

  return (
    member.status === MemberStatus.ACTIVE &&
    member.joinedAt.getTime() < monthEnd.getTime()
  );
}

function resolveCategoryForMonth(
  member: {
    category: MemberCategory;
    categoryHistory: Array<{
      category: MemberCategory;
      effectiveFrom: Date;
      effectiveTo: Date | null;
    }>;
  },
  monthStart: Date,
  monthEnd: Date,
): MemberCategory | null {
  const overlapping = member.categoryHistory
    .filter((item) =>
      overlaps(item.effectiveFrom, item.effectiveTo, monthStart, monthEnd),
    )
    .sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime());

  if (overlapping.length > 0) {
    return overlapping[0].category;
  }

  return member.category ?? null;
}
