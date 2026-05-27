import { Injectable } from '@nestjs/common';
import {
  CashTransactionStatus,
  MemberCategory,
  MemberStatus,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildCurrentRatesMap,
  buildDebtSnapshot,
} from '../members/member-debt.utils';

type DashboardMember = Prisma.MemberGetPayload<{
  include: {
    payments: true;
    statusHistory: true;
    categoryHistory: true;
  };
}>;

const MONTHS_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getExecutiveDashboard() {
    const today = new Date();
    const monthStart = startOfMonth(today);
    const nextMonthStart = addMonths(monthStart, 1);
    const lastYearStart = addMonths(monthStart, -11);

    const [members, rates, payments, cashTransactions, dispatches] =
      await Promise.all([
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
        this.prisma.cashTransaction.findMany({
          where: {
            status: CashTransactionStatus.REGISTERED,
          },
        }),
        this.prisma.messageDispatch.findMany({
          orderBy: [{ createdAt: 'desc' }],
          take: 500,
        }),
      ]);

    const currentRates = buildCurrentRatesMap(rates, today);

    const activeMembers = members.filter((member) => member.status === MemberStatus.ACTIVE);
    const inactiveMembers = members.filter(
      (member) => member.status === MemberStatus.INACTIVE,
    );

    const membersByCategoryMap = new Map<MemberCategory, number>();
    const membersByGradeMap = new Map<string, number>();

    let ageSum = 0;
    let ageCount = 0;

    for (const member of members) {
      membersByCategoryMap.set(
        member.category,
        (membersByCategoryMap.get(member.category) ?? 0) + 1,
      );

      const gradeKey = member.grade ?? 'SIN_GRADO';
      membersByGradeMap.set(gradeKey, (membersByGradeMap.get(gradeKey) ?? 0) + 1);

      if (member.birthDate) {
        ageSum += calculateAge(member.birthDate, today);
        ageCount += 1;
      }
    }

    const birthdaysThisMonth = members
      .filter(
        (member) =>
          member.birthDate && member.birthDate.getUTCMonth() === today.getUTCMonth(),
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

    const debtSnapshots = members.map((member) => {
      const snapshot = buildDebtSnapshot(member, currentRates, today);
      const realDebt = Number(snapshot.debt);

      return {
        member,
        snapshot: {
          ...snapshot,
          debt: realDebt,
          months: snapshot.months.filter((month) => Number(month.amount) > 0),
        },
      };
    });

    const debtors = debtSnapshots
      .filter((item) => item.member.status === MemberStatus.ACTIVE)
      .filter((item) => Number(item.snapshot.debt) > 0)
      .map((item) => ({
        id: item.member.id,
        fullName: `${item.member.lastName}, ${item.member.firstName}`,
        matricula: item.member.matricula,
        category: item.member.category,
        grade: item.member.grade,
        phone: item.member.phone,
        totalDebt: Number(item.snapshot.debt),
        monthsOwed: item.snapshot.months.filter((month) => Number(month.amount) > 0)
          .length,
        overdueMonthsCount: item.snapshot.months.filter(
          (month) => month.overdue && Number(month.amount) > 0,
        ).length,
        overdueMonthLabels: item.snapshot.overdueMonthLabels,
      }))
      .sort((a, b) => {
        if (b.totalDebt !== a.totalDebt) {
          return b.totalDebt - a.totalDebt;
        }

        return b.monthsOwed - a.monthsOwed;
      });

    const totalDebtToDate = debtors.reduce(
      (sum, debtor) => sum + Number(debtor.totalDebt),
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

    const expectedByCategoryMap = new Map<
      MemberCategory,
      {
        category: MemberCategory;
        activeMembers: number;
        unitAmount: number;
        expectedTotal: number;
      }
    >();

    for (const member of members) {
      if (!isActiveInMonth(member, monthStart, nextMonthStart)) {
        continue;
      }

      const monthCategory =
        resolveCategoryForMonth(member, monthStart, nextMonthStart) ?? member.category;
      const expectedAmount = currentRates.get(monthCategory) ?? 0;

      if (expectedAmount <= 0) {
        continue;
      }

      activeContributionBase += 1;
      currentMonthExpected += expectedAmount;

      const expectedByCategory = expectedByCategoryMap.get(monthCategory) ?? {
        category: monthCategory,
        activeMembers: 0,
        unitAmount: expectedAmount,
        expectedTotal: 0,
      };

      expectedByCategory.activeMembers += 1;
      expectedByCategory.unitAmount = expectedAmount;
      expectedByCategory.expectedTotal += expectedAmount;
      expectedByCategoryMap.set(monthCategory, expectedByCategory);

      const snapshot = debtSnapshots.find((item) => item.member.id === member.id)?.snapshot;
      const owesCurrentMonthWithAmount = snapshot?.months.some(
        (month) => month.isCurrentMonth && Number(month.amount) > 0,
      );

      if (owesCurrentMonthWithAmount) {
        currentMonthUncollected += expectedAmount;
      }
    }

    const delinquencyIndex =
      today.getUTCDate() > 5 && currentMonthExpected > 0
        ? (currentMonthUncollected / currentMonthExpected) * 100
        : 0;

    const averageMonthlyContribution =
      activeContributionBase > 0 ? currentMonthCollection / activeContributionBase : 0;

    const collectionEffectiveness =
      currentMonthExpected > 0
        ? (currentMonthCollection / currentMonthExpected) * 100
        : 0;

    const currentMonthCollectionGap = Math.max(
      0,
      currentMonthExpected - currentMonthCollection,
    );

    const monthlyCashHistory = buildMonthlyCashHistory(
      cashTransactions.filter((transaction) => transaction.occurredAt >= lastYearStart),
      monthStart,
      12,
    );

    const averageIncomeLast12 =
      monthlyCashHistory.length > 0
        ? monthlyCashHistory.reduce((sum, item) => sum + item.income, 0) /
          monthlyCashHistory.length
        : 0;

    const averageExpenseLast12 =
      monthlyCashHistory.length > 0
        ? monthlyCashHistory.reduce((sum, item) => sum + item.expense, 0) /
          monthlyCashHistory.length
        : 0;

    const monthlyNet = currentMonthCashIn - currentMonthCashOut;
    const averageNetLast12 = averageIncomeLast12 - averageExpenseLast12;
    const cashBalance = totalCashIn - totalCashOut;
    const monthsOfCoverage =
      averageExpenseLast12 > 0 ? cashBalance / averageExpenseLast12 : null;

    const membersWithPhone = members.filter(
      (member) => member.phone && member.phone.replace(/\D/g, '').length > 0,
    ).length;

    const membersWithEmail = members.filter(
      (member) => member.email && member.email.trim().length > 0,
    ).length;

    const recentDispatchesThisMonth = dispatches.filter(
      (dispatch) => dispatch.createdAt >= monthStart && dispatch.createdAt < nextMonthStart,
    );

    const categoriesStrategic = Array.from(expectedByCategoryMap.values()).sort(
      (a, b) => b.expectedTotal - a.expectedTotal,
    );

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
        activeMembers: activeMembers.length,
        inactiveMembers: inactiveMembers.length,
        averageAge: ageCount > 0 ? ageSum / ageCount : 0,
        birthdaysThisMonth,
        publicManagement: {
          membersWithPhone,
          membersWithoutPhone: members.length - membersWithPhone,
          membersWithEmail,
          membersWithoutEmail: members.length - membersWithEmail,
          contactCoveragePercentage:
            members.length > 0 ? (membersWithPhone / members.length) * 100 : 0,
        },
      },
      accounting: {
        cashBalance,
        currentMonth: monthLabel(
          today.getUTCFullYear(),
          today.getUTCMonth() + 1,
        ),
        currentMonthCollection,
        currentMonthExpected,
        currentMonthCollectionGap,
        collectionEffectiveness,
        operatingCashFlow: monthlyNet,
        debtors,
        debtorsCount: debtors.length,
        debtorsPercentage:
          activeMembers.length > 0 ? (debtors.length / activeMembers.length) * 100 : 0,
        totalDebtToDate,
        delinquencyIndex,
        averageMonthlyContribution,
        averageIncomeLast12,
        averageExpenseLast12,
        averageNetLast12,
        monthsOfCoverage,
        monthlyCashHistory,
        expectedByCategory: categoriesStrategic,
        publicManagement: {
          messagesRegisteredThisMonth: recentDispatchesThisMonth.length,
          activeContributionBase,
          collectionRisk:
            collectionEffectiveness >= 85
              ? 'LOW'
              : collectionEffectiveness >= 65
                ? 'MEDIUM'
                : 'HIGH',
          liquidityRisk:
            monthsOfCoverage === null
              ? 'UNKNOWN'
              : monthsOfCoverage >= 3
                ? 'LOW'
                : monthsOfCoverage >= 1
                  ? 'MEDIUM'
                  : 'HIGH',
          concentrationRisk:
            debtors.length > 0 && totalDebtToDate > 0
              ? (debtors.slice(0, 5).reduce((sum, debtor) => sum + debtor.totalDebt, 0) /
                  totalDebtToDate) *
                100
              : 0,
        },
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

  return (
    from.getTime() < monthEnd.getTime() &&
    effectiveTo.getTime() > monthStart.getTime()
  );
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
    .filter((item) => overlaps(item.effectiveFrom, item.effectiveTo, monthStart, monthEnd))
    .sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime());

  if (overlapping.length > 0) {
    return overlapping[0].category;
  }

  return member.category ?? null;
}

function buildMonthlyCashHistory(
  transactions: Array<{
    occurredAt: Date;
    direction: string;
    amount: Prisma.Decimal | number;
  }>,
  currentMonthStart: Date,
  monthsCount: number,
) {
  const periods = Array.from({ length: monthsCount }, (_, index) => {
    const date = addMonths(currentMonthStart, index - (monthsCount - 1));
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const period = `${year}-${String(month).padStart(2, '0')}`;

    return {
      period,
      label: monthLabel(year, month),
      income: 0,
      expense: 0,
      net: 0,
    };
  });

  const map = new Map(periods.map((period) => [period.period, period]));

  for (const transaction of transactions) {
    const year = transaction.occurredAt.getUTCFullYear();
    const month = transaction.occurredAt.getUTCMonth() + 1;
    const period = `${year}-${String(month).padStart(2, '0')}`;
    const current = map.get(period);

    if (!current) {
      continue;
    }

    if (transaction.direction === 'IN') {
      current.income += Number(transaction.amount);
    } else {
      current.expense += Number(transaction.amount);
    }

    current.net = current.income - current.expense;
  }

  return periods;
}

function monthLabel(year: number, month: number) {
  return `${MONTHS_ES[month - 1]} ${year}`;
}
