import { Injectable } from '@nestjs/common';
import {
  CashDirection,
  CashTransactionStatus,
  MemberCategory,
  MemberStatus,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

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

type MemberWithDebtData = Prisma.MemberGetPayload<{
  include: {
    payments: true;
    statusHistory: true;
    categoryHistory: true;
  };
}>;

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDebtors() {
    const queryDate = new Date();

    const [members, rates] = await Promise.all([
      this.prisma.member.findMany({
        include: {
          payments: {
            where: { status: PaymentStatus.REGISTERED },
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
          validFrom: { lte: queryDate },
          OR: [{ validTo: null }, { validTo: { gt: queryDate } }],
        },
        orderBy: [{ category: 'asc' }, { validFrom: 'desc' }],
      }),
    ]);

    const currentRates = this.buildCurrentRatesMap(rates, queryDate);

    return members
      .map((member) => {
        const snapshot = this.buildDebtSnapshot(member, currentRates, queryDate);

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
          debtLevel: this.debtLevel(snapshot.monthsOwed),
          debtLevelLabel: this.debtLevelLabel(snapshot.monthsOwed),
          debtColor: this.debtColor(snapshot.monthsOwed),
          months: snapshot.months,
        };
      })
      .filter((member) => member.monthsOwed > 0)
      .sort((a, b) => {
        if (b.debt !== a.debt) return b.debt - a.debt;
        return b.monthsOwed - a.monthsOwed;
      });
  }

  async getMonthlyCollection() {
    const payments = await this.prisma.payment.findMany({
      where: { status: PaymentStatus.REGISTERED },
      orderBy: [{ periodYear: 'asc' }, { periodMonth: 'asc' }],
    });

    const grouped = new Map<string, number>();

    for (const payment of payments) {
      const key = `${payment.periodYear}-${String(payment.periodMonth).padStart(2, '0')}`;
      grouped.set(key, (grouped.get(key) ?? 0) + Number(payment.amount));
    }

    return Array.from(grouped.entries()).map(([key, total]) => {
      const [year, month] = key.split('-').map(Number);

      return {
        month: this.monthLabel(year, month),
        total,
      };
    });
  }

  async getMembersByCategory() {
    const members = await this.prisma.member.findMany();

    const map = new Map<
      MemberCategory,
      {
        category: MemberCategory;
        active: number;
        inactive: number;
        total: number;
      }
    >();

    for (const member of members) {
      const current = map.get(member.category) ?? {
        category: member.category,
        active: 0,
        inactive: 0,
        total: 0,
      };

      if (member.status === MemberStatus.ACTIVE) {
        current.active += 1;
      } else {
        current.inactive += 1;
      }

      current.total += 1;
      map.set(member.category, current);
    }

    return Array.from(map.values()).sort((a, b) =>
      String(a.category).localeCompare(String(b.category)),
    );
  }

  async getFinancialSummary() {
    const queryDate = new Date();
    const currentYear = queryDate.getUTCFullYear();
    const currentMonth = queryDate.getUTCMonth() + 1;
    const currentMonthStart = new Date(Date.UTC(currentYear, currentMonth - 1, 1));
    const nextMonthStart = new Date(Date.UTC(currentYear, currentMonth, 1));
    const sixMonthsAgoStart = new Date(Date.UTC(currentYear, currentMonth - 6, 1));

    const [
      cashTransactions,
      debtors,
      members,
      monthlyCollection,
    ] = await Promise.all([
      this.prisma.cashTransaction.findMany({
        where: {
          status: CashTransactionStatus.REGISTERED,
        },
        orderBy: [{ occurredAt: 'asc' }],
      }),
      this.getDebtors(),
      this.prisma.member.findMany(),
      this.getMonthlyCollection(),
    ]);

    const activeMembers = members.filter(
      (member) => member.status === MemberStatus.ACTIVE,
    );
    const inactiveMembers = members.filter(
      (member) => member.status === MemberStatus.INACTIVE,
    );

    const activeMemberCount = activeMembers.length;
    const debtorsCount = debtors.filter((debtor) => {
      const member = members.find((item) => item.id === debtor.id);
      return member?.status === MemberStatus.ACTIVE;
    }).length;

    const accountsReceivable = debtors.reduce(
      (sum, debtor) => sum + Number(debtor.debt),
      0,
    );

    const currentMonthTransactions = cashTransactions.filter(
      (transaction) =>
        transaction.occurredAt >= currentMonthStart &&
        transaction.occurredAt < nextMonthStart,
    );

    const monthlyIncome = this.sumCash(currentMonthTransactions, CashDirection.IN);
    const monthlyExpenses = this.sumCash(
      currentMonthTransactions,
      CashDirection.OUT,
    );

    const totalIncome = this.sumCash(cashTransactions, CashDirection.IN);
    const totalExpenses = this.sumCash(cashTransactions, CashDirection.OUT);
    const cashBalance = totalIncome - totalExpenses;

    const lastSixMonthTransactions = cashTransactions.filter(
      (transaction) => transaction.occurredAt >= sixMonthsAgoStart,
    );

    const monthlyCashHistory = this.buildCashHistory(lastSixMonthTransactions);

    const collectionHistory = monthlyCashHistory.map((item) => ({
      period: item.period,
      label: item.label,
      total: item.income,
    }));

    const expenseHistory = monthlyCashHistory.map((item) => ({
      period: item.period,
      label: item.label,
      total: item.expense,
    }));

    const monthlyComparison = monthlyCashHistory.map((item) => ({
      period: item.period,
      label: item.label,
      income: item.income,
      expense: item.expense,
      net: item.income - item.expense,
    }));

    const averageMonthlyCollection =
      collectionHistory.length > 0
        ? collectionHistory.reduce((sum, item) => sum + item.total, 0) /
          collectionHistory.length
        : 0;

    const averageExpense =
      expenseHistory.length > 0
        ? expenseHistory.reduce((sum, item) => sum + item.total, 0) /
          expenseHistory.length
        : 0;

    const debtAging = {
      oneMonth: debtors
        .filter((debtor) => debtor.monthsOwed === 1)
        .reduce((sum, debtor) => sum + debtor.debt, 0),
      twoToThree: debtors
        .filter((debtor) => debtor.monthsOwed >= 2 && debtor.monthsOwed <= 3)
        .reduce((sum, debtor) => sum + debtor.debt, 0),
      fourToSix: debtors
        .filter((debtor) => debtor.monthsOwed >= 4 && debtor.monthsOwed <= 6)
        .reduce((sum, debtor) => sum + debtor.debt, 0),
      overSix: debtors
        .filter((debtor) => debtor.monthsOwed > 6)
        .reduce((sum, debtor) => sum + debtor.debt, 0),
    };

    const categoryIncome = this.groupCashByCategory(
      cashTransactions.filter((transaction) => transaction.direction === CashDirection.IN),
    );

    const categoryExpense = this.groupCashByCategory(
      cashTransactions.filter((transaction) => transaction.direction === CashDirection.OUT),
    );

    const topDebtors = debtors.slice(0, 10).map((debtor) => ({
      id: debtor.id,
      fullName: `${debtor.lastName}, ${debtor.firstName}`,
      matricula: debtor.matricula,
      category: debtor.category,
      status: debtor.status,
      totalDebt: debtor.debt,
      monthsOwed: debtor.monthsOwed,
      overdueMonthsCount: debtor.overdueMonthsCount,
      debtLevel: debtor.debtLevel,
      debtLevelLabel: debtor.debtLevelLabel,
    }));

    const expectedCurrentMonthCollection = activeMembers.reduce((sum, member) => {
      const rate = this.currentRateForCategory(member.category);
      return sum + rate;
    }, 0);

    const currentMonthCollection =
      monthlyCollection.find((item) => item.month === this.monthLabel(currentYear, currentMonth))
        ?.total ?? 0;

    const collectionEffectiveness =
      expectedCurrentMonthCollection > 0
        ? (currentMonthCollection / expectedCurrentMonthCollection) * 100
        : 0;

    return {
      generatedAt: queryDate.toISOString(),
      currentMonth: this.monthLabel(currentYear, currentMonth),

      cashBalance,
      monthlyIncome,
      monthlyExpenses,
      monthlyNet: monthlyIncome - monthlyExpenses,

      accountsReceivable,
      debtorsCount,
      debtorsPercentage:
        activeMemberCount > 0 ? (debtorsCount / activeMemberCount) * 100 : 0,

      activeMembers: activeMemberCount,
      inactiveMembers: inactiveMembers.length,
      totalMembers: members.length,

      averageMonthlyCollection,
      averageExpense,

      collectionHistory,
      expenseHistory,

      debtAging,

      categoryIncome,
      categoryExpense,

      topDebtors,
      monthlyComparison,

      expectedCurrentMonthCollection,
      currentMonthCollection,
      collectionEffectiveness,
    };
  }

  private sumCash(
    transactions: Array<{
      direction: CashDirection;
      amount: Prisma.Decimal | number;
    }>,
    direction: CashDirection,
  ) {
    return transactions
      .filter((transaction) => transaction.direction === direction)
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  }

  private buildCashHistory(
    transactions: Array<{
      occurredAt: Date;
      direction: CashDirection;
      amount: Prisma.Decimal | number;
    }>,
  ) {
    const map = new Map<
      string,
      {
        period: string;
        label: string;
        income: number;
        expense: number;
      }
    >();

    for (const transaction of transactions) {
      const year = transaction.occurredAt.getUTCFullYear();
      const month = transaction.occurredAt.getUTCMonth() + 1;
      const period = `${year}-${String(month).padStart(2, '0')}`;

      const current = map.get(period) ?? {
        period,
        label: this.monthLabel(year, month),
        income: 0,
        expense: 0,
      };

      if (transaction.direction === CashDirection.IN) {
        current.income += Number(transaction.amount);
      } else {
        current.expense += Number(transaction.amount);
      }

      map.set(period, current);
    }

    return Array.from(map.values()).sort((a, b) =>
      a.period.localeCompare(b.period),
    );
  }

  private groupCashByCategory(
    transactions: Array<{
      direction: CashDirection;
      amount: Prisma.Decimal | number;
      incomeType: string | null;
      expenseType: string | null;
    }>,
  ) {
    const map = new Map<string, number>();

    for (const transaction of transactions) {
      const key =
        transaction.direction === CashDirection.IN
          ? transaction.incomeType ?? 'OTHER'
          : transaction.expenseType ?? 'OTHER';

      map.set(key, (map.get(key) ?? 0) + Number(transaction.amount));
    }

    return Array.from(map.entries())
      .map(([category, total]) => ({
        category,
        total,
      }))
      .sort((a, b) => b.total - a.total);
  }

  private currentRateForCategory(_category: MemberCategory) {
    return 0;
  }

  private buildCurrentRatesMap(
    rates: Array<{
      category: MemberCategory;
      amount: Prisma.Decimal | number;
      validFrom: Date;
      validTo: Date | null;
    }>,
    queryDate: Date,
  ) {
    const map = new Map<MemberCategory, number>();
    const sorted = [...rates].sort((a, b) => {
      if (a.category !== b.category) {
        return String(a.category).localeCompare(String(b.category));
      }

      return b.validFrom.getTime() - a.validFrom.getTime();
    });

    for (const rate of sorted) {
      const isValid =
        rate.validFrom.getTime() <= queryDate.getTime() &&
        (rate.validTo === null || rate.validTo.getTime() > queryDate.getTime());

      if (!isValid) continue;
      if (map.has(rate.category)) continue;

      map.set(rate.category, Number(rate.amount));
    }

    return map;
  }

  private buildDebtSnapshot(
    member: MemberWithDebtData,
    currentRates: Map<MemberCategory, number>,
    queryDate: Date,
  ) {
    const queryMonthStart = this.startOfMonth(queryDate);
    const joinedMonthStart = this.startOfMonth(member.joinedAt);

    const paidPeriods = new Set(
      member.payments
        .filter((payment) => payment.status === PaymentStatus.REGISTERED)
        .map((payment) => this.periodKey(payment.periodYear, payment.periodMonth)),
    );

    const months: Array<{
      periodYear: number;
      periodMonth: number;
      label: string;
      category: MemberCategory;
      amount: number;
      overdue: boolean;
      isCurrentMonth: boolean;
    }> = [];

    for (
      let cursor = new Date(joinedMonthStart);
      cursor.getTime() <= queryMonthStart.getTime();
      cursor = this.addMonths(cursor, 1)
    ) {
      const monthStart = this.startOfMonth(cursor);
      const monthEnd = this.addMonths(monthStart, 1);
      const isCurrentMonth = monthStart.getTime() === queryMonthStart.getTime();

      if (!this.isActiveInMonth(member, monthStart, monthEnd)) {
        continue;
      }

      const category = this.resolveCategoryForMonth(member, monthStart, monthEnd);

      if (!category) {
        continue;
      }

      const periodYear = monthStart.getUTCFullYear();
      const periodMonth = monthStart.getUTCMonth() + 1;
      const key = this.periodKey(periodYear, periodMonth);

      if (paidPeriods.has(key)) {
        continue;
      }

      months.push({
        periodYear,
        periodMonth,
        label: this.monthLabel(periodYear, periodMonth),
        category,
        amount: currentRates.get(category) ?? 0,
        overdue: monthStart.getTime() < queryMonthStart.getTime(),
        isCurrentMonth,
      });
    }

    return {
      debt: months.reduce((sum, month) => sum + month.amount, 0),
      monthsOwed: months.length,
      owesCurrentMonth: months.some((month) => month.isCurrentMonth),
      overdueMonthsCount: months.filter((month) => month.overdue).length,
      overdueMonthLabels: months
        .filter((month) => month.overdue)
        .map((month) => month.label),
      months,
    };
  }

  private resolveCategoryForMonth(
    member: MemberWithDebtData,
    monthStart: Date,
    monthEnd: Date,
  ) {
    const overlapping = member.categoryHistory
      .filter((item) =>
        this.overlaps(item.effectiveFrom, item.effectiveTo, monthStart, monthEnd),
      )
      .sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime());

    if (overlapping.length > 0) {
      return overlapping[0].category;
    }

    return member.category;
  }

  private isActiveInMonth(
    member: MemberWithDebtData,
    monthStart: Date,
    monthEnd: Date,
  ) {
    if (member.statusHistory.length > 0) {
      return member.statusHistory.some(
        (item) =>
          item.status === MemberStatus.ACTIVE &&
          this.overlaps(item.effectiveFrom, item.effectiveTo, monthStart, monthEnd),
      );
    }

    return (
      member.status === MemberStatus.ACTIVE &&
      member.joinedAt.getTime() < monthEnd.getTime()
    );
  }

  private overlaps(
    from: Date,
    to: Date | null,
    monthStart: Date,
    monthEnd: Date,
  ) {
    const effectiveTo = to ?? new Date('2999-12-31T00:00:00.000Z');

    return (
      from.getTime() < monthEnd.getTime() &&
      effectiveTo.getTime() > monthStart.getTime()
    );
  }

  private debtLevel(monthsOwed: number) {
    if (monthsOwed <= 0) return 'NONE';
    if (monthsOwed === 1) return 'LOW';
    if (monthsOwed <= 3) return 'MEDIUM';
    return 'HIGH';
  }

  private debtLevelLabel(monthsOwed: number) {
    if (monthsOwed <= 0) return 'Sin deuda';
    if (monthsOwed === 1) return 'Baja';
    if (monthsOwed <= 3) return 'Media';
    return 'Alta';
  }

  private debtColor(monthsOwed: number) {
    if (monthsOwed <= 0) return 'gray';
    if (monthsOwed === 1) return 'green';
    if (monthsOwed <= 3) return 'yellow';
    return 'red';
  }

  private startOfMonth(date: Date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  }

  private addMonths(date: Date, months: number) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  }

  private periodKey(year: number, month: number) {
    return `${year}-${String(month).padStart(2, '0')}`;
  }

  private monthLabel(year: number, month: number) {
    return `${MONTHS_ES[month - 1]} ${year}`;
  }
}
