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

type CashHistoryItem = {
  period: string;
  label: string;
  income: number;
  expense: number;
  net: number;
  projected?: boolean;
};

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
      .filter((member) => member.debt > 0)
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
        period: key,
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
    const currentPeriod = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
    const currentMonthStart = new Date(Date.UTC(currentYear, currentMonth - 1, 1));
    const nextMonthStart = new Date(Date.UTC(currentYear, currentMonth, 1));
    const twelveMonthsAgoStart = new Date(Date.UTC(currentYear, currentMonth - 11, 1));

    const [cashTransactions, debtors, members, monthlyCollection, rates] =
      await Promise.all([
        this.prisma.cashTransaction.findMany({
          where: {
            status: CashTransactionStatus.REGISTERED,
          },
          orderBy: [{ occurredAt: 'asc' }],
        }),
        this.getDebtors(),
        this.prisma.member.findMany(),
        this.getMonthlyCollection(),
        this.prisma.monthlyRate.findMany({
          where: {
            validFrom: { lte: queryDate },
            OR: [{ validTo: null }, { validTo: { gt: queryDate } }],
          },
          orderBy: [{ category: 'asc' }, { validFrom: 'desc' }],
        }),
      ]);

    const currentRates = this.buildCurrentRatesMap(rates, queryDate);

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

    const lastTwelveMonthTransactions = cashTransactions.filter(
      (transaction) => transaction.occurredAt >= twelveMonthsAgoStart,
    );

    const historicalCashHistory = this.buildCompleteCashHistory(
      lastTwelveMonthTransactions,
      twelveMonthsAgoStart,
      12,
    );

    const monthlyComparison = this.buildHistoryWithForecast(historicalCashHistory, 3);

    const collectionHistory = historicalCashHistory.map((item) => ({
      period: item.period,
      label: item.label,
      total: item.income,
    }));

    const expenseHistory = historicalCashHistory.map((item) => ({
      period: item.period,
      label: item.label,
      total: item.expense,
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
      cashTransactions.filter(
        (transaction) => transaction.direction === CashDirection.IN,
      ),
    );

    const categoryExpense = this.groupCashByCategory(
      cashTransactions.filter(
        (transaction) => transaction.direction === CashDirection.OUT,
      ),
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
      return sum + (currentRates.get(member.category) ?? 0);
    }, 0);

    const currentMonthCollection =
      monthlyCollection.find((item) => item.period === currentPeriod)?.total ?? 0;

    const collectionEffectiveness =
      expectedCurrentMonthCollection > 0
        ? (currentMonthCollection / expectedCurrentMonthCollection) * 100
        : 0;

    const categoryExpectedCollection = this.buildExpectedCollectionByCategory(
      activeMembers,
      currentRates,
    );

    const averageDebtPerDebtor =
      debtorsCount > 0 ? accountsReceivable / debtorsCount : 0;

    const monthlyBurnRate = averageExpense;
    const monthsOfCoverage =
      monthlyBurnRate > 0 ? cashBalance / monthlyBurnRate : null;

    const liabilities = monthlyExpenses;

    const currentMonthMembershipIncome = currentMonthTransactions
      .filter(
        (transaction) =>
          transaction.direction === CashDirection.IN &&
          transaction.incomeType === 'MEMBERSHIP',
      )
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

    const feeDependencyPercentage =
      monthlyIncome > 0 ? (currentMonthMembershipIncome / monthlyIncome) * 100 : 0;

    const activeWithoutPhone = activeMembers.filter(
      (member) => !member.phone || member.phone.trim() === '',
    ).length;

    const activeWithoutEmail = activeMembers.filter(
      (member) => !member.email || member.email.trim() === '',
    ).length;

    const phoneCoveragePercentage =
      activeMemberCount > 0
        ? ((activeMemberCount - activeWithoutPhone) / activeMemberCount) * 100
        : 0;

    const emailCoveragePercentage =
      activeMemberCount > 0
        ? ((activeMemberCount - activeWithoutEmail) / activeMemberCount) * 100
        : 0;

    const topFiveDebt = debtors
      .slice(0, 5)
      .reduce((sum, debtor) => sum + Number(debtor.debt), 0);

    const debtConcentrationTopFivePercentage =
      accountsReceivable > 0 ? (topFiveDebt / accountsReceivable) * 100 : 0;

    const recentRealMonths = historicalCashHistory.slice(-3);
    const previousRealMonths = historicalCashHistory.slice(-6, -3);
    const recentNet = recentRealMonths.reduce((sum, item) => sum + item.net, 0);
    const previousNet = previousRealMonths.reduce((sum, item) => sum + item.net, 0);
    const netTrend = recentNet - previousNet;

    const collectionScore = Math.min(100, Math.max(0, collectionEffectiveness));
    const debtorScore = Math.min(
      100,
      Math.max(0, 100 - (activeMemberCount > 0 ? (debtorsCount / activeMemberCount) * 100 : 0)),
    );
    const coverageScore = Math.min(
      100,
      Math.max(0, monthsOfCoverage === null ? 100 : monthsOfCoverage * 25),
    );
    const contactScore = Math.min(100, Math.max(0, phoneCoveragePercentage));

    const financialHealthScore = Math.round(
      collectionScore * 0.35 + debtorScore * 0.25 + coverageScore * 0.25 + contactScore * 0.15,
    );

    const liquidityRisk =
      monthsOfCoverage === null || monthsOfCoverage >= 3
        ? 'LOW'
        : monthsOfCoverage >= 1.5
          ? 'MEDIUM'
          : 'HIGH';

    const collectionRisk =
      collectionEffectiveness >= 85
        ? 'LOW'
        : collectionEffectiveness >= 60
          ? 'MEDIUM'
          : 'HIGH';

    const debtRisk =
      activeMemberCount === 0 || debtorsCount / activeMemberCount <= 0.15
        ? 'LOW'
        : debtorsCount / activeMemberCount <= 0.35
          ? 'MEDIUM'
          : 'HIGH';

    const strategicAlerts = [
      ...(collectionRisk === 'HIGH'
        ? ['La cobranza efectiva del mes está por debajo del umbral sano.']
        : []),
      ...(liquidityRisk === 'HIGH'
        ? ['La cobertura de caja es baja frente al egreso promedio mensual.']
        : []),
      ...(debtRisk === 'HIGH'
        ? ['El porcentaje de HH.·. deudores es alto para una gestión estable.']
        : []),
      ...(debtConcentrationTopFivePercentage >= 50
        ? ['La deuda está concentrada en pocos HH.·.; conviene priorizar gestión individual.']
        : []),
      ...(phoneCoveragePercentage < 90
        ? ['La cobertura telefónica de HH.·. activos es insuficiente para gestión rápida.']
        : []),
    ];

    const strategicRecommendations = [
      ...(collectionEffectiveness < 85
        ? ['Priorizar campaña de cobranza sobre HH.·. con deuda real mayor a cero.']
        : []),
      ...(monthsOfCoverage !== null && monthsOfCoverage < 3
        ? ['Reducir egresos no esenciales o reforzar recaudación para ampliar cobertura de caja.']
        : []),
      ...(debtConcentrationTopFivePercentage >= 40
        ? ['Gestionar personalmente los principales deudores antes de campañas masivas.']
        : []),
      ...(activeWithoutPhone > 0
        ? ['Completar teléfonos de HH.·. activos para mejorar alcance de tesorería.']
        : []),
      ...(netTrend < 0
        ? ['Revisar tendencia de flujo: los últimos 3 meses empeoraron contra los 3 anteriores.']
        : []),
    ];


    const strategicActionPlan = [
      ...(collectionEffectiveness < 85
        ? [
            {
              priority: collectionEffectiveness < 60 ? 'ALTA' : 'MEDIA',
              area: 'Tesorería',
              action: 'Ejecutar gestión de cobranza sobre HH.·. con deuda real mayor a cero.',
              impact: 'Mejora de recaudación mensual y reducción de activos por cobrar.',
              urgency: collectionEffectiveness < 60 ? 'Esta semana' : 'Este mes',
              metric: `Cobranza efectiva actual: ${collectionEffectiveness.toFixed(1)}%`,
            },
          ]
        : []),
      ...(debtConcentrationTopFivePercentage >= 40
        ? [
            {
              priority: debtConcentrationTopFivePercentage >= 60 ? 'ALTA' : 'MEDIA',
              area: 'Tesorería / Secretaría',
              action: 'Contactar individualmente a los cinco principales deudores antes de enviar campañas generales.',
              impact: 'Reduce concentración de deuda y acelera recuperación de caja.',
              urgency: 'Próximos 7 días',
              metric: `Top 5 concentra ${debtConcentrationTopFivePercentage.toFixed(1)}% de la deuda`,
            },
          ]
        : []),
      ...(monthsOfCoverage !== null && monthsOfCoverage < 3
        ? [
            {
              priority: monthsOfCoverage < 1.5 ? 'ALTA' : 'MEDIA',
              area: 'Tesorería / Comisión',
              action: 'Revisar egresos no esenciales y definir mínimo operativo de caja.',
              impact: 'Aumenta resistencia financiera ante retrasos de cobranza.',
              urgency: monthsOfCoverage < 1.5 ? 'Inmediata' : 'Este mes',
              metric: `Cobertura actual: ${monthsOfCoverage.toFixed(1)} meses`,
            },
          ]
        : []),
      ...(activeWithoutPhone > 0
        ? [
            {
              priority: activeWithoutPhone >= Math.max(3, activeMemberCount * 0.1) ? 'MEDIA' : 'BAJA',
              area: 'Secretaría',
              action: 'Actualizar teléfonos de HH.·. activos sin contacto registrado.',
              impact: 'Mejora velocidad de comunicación y gestión de cobranza.',
              urgency: 'Próximo ciclo administrativo',
              metric: `${activeWithoutPhone} HH.·. activos sin teléfono`,
            },
          ]
        : []),
      ...(netTrend < 0
        ? [
            {
              priority: 'MEDIA',
              area: 'Tesorería',
              action: 'Comparar rubros de egresos de los últimos 3 meses contra los 3 anteriores.',
              impact: 'Detecta deterioro del flujo operativo antes de que afecte caja.',
              urgency: 'Antes del próximo cierre mensual',
              metric: `Tendencia neta: ${netTrend.toFixed(0)}`,
            },
          ]
        : []),
    ];

    if (strategicActionPlan.length === 0) {
      strategicActionPlan.push({
        priority: 'BAJA',
        area: 'Gestión general',
        action: 'Mantener control mensual de caja, cobranza, padrón activo y cobertura de contacto.',
        impact: 'Sostiene estabilidad operativa y evita deterioro silencioso.',
        urgency: 'Mensual',
        metric: `Salud financiera: ${financialHealthScore}/100`,
      });
    }

    return {
      generatedAt: queryDate.toISOString(),
      currentMonth: this.monthLabel(currentYear, currentMonth),
      currentPeriod,

      cashBalance,
      monthlyIncome,
      monthlyExpenses,
      monthlyNet: monthlyIncome - monthlyExpenses,

      liabilities,
      accountsReceivable,
      debtorsCount,
      debtorsPercentage:
        activeMemberCount > 0 ? (debtorsCount / activeMemberCount) * 100 : 0,
      averageDebtPerDebtor,

      activeMembers: activeMemberCount,
      inactiveMembers: inactiveMembers.length,
      totalMembers: members.length,

      averageMonthlyCollection,
      averageExpense,
      monthlyBurnRate,
      monthsOfCoverage,

      collectionHistory,
      expenseHistory,

      debtAging,

      categoryIncome,
      categoryExpense,
      categoryExpectedCollection,

      topDebtors,
      monthlyComparison,

      expectedCurrentMonthCollection,
      currentMonthCollection,
      collectionEffectiveness,

      strategic: {
        financialHealthScore,
        liquidityRisk,
        collectionRisk,
        debtRisk,
        feeDependencyPercentage,
        currentMonthMembershipIncome,
        debtConcentrationTopFivePercentage,
        phoneCoveragePercentage,
        emailCoveragePercentage,
        activeWithoutPhone,
        activeWithoutEmail,
        netTrend,
        recentNet,
        previousNet,
        strategicAlerts,
        strategicRecommendations,
        strategicActionPlan,
      },
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

  private buildCompleteCashHistory(
    transactions: Array<{
      occurredAt: Date;
      direction: CashDirection;
      amount: Prisma.Decimal | number;
    }>,
    startMonth: Date,
    monthsCount: number,
  ): CashHistoryItem[] {
    const map = new Map<string, CashHistoryItem>();

    for (let index = 0; index < monthsCount; index += 1) {
      const date = this.addMonths(startMonth, index);
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth() + 1;
      const period = this.periodKey(year, month);

      map.set(period, {
        period,
        label: this.monthLabel(year, month),
        income: 0,
        expense: 0,
        net: 0,
        projected: false,
      });
    }

    for (const transaction of transactions) {
      const year = transaction.occurredAt.getUTCFullYear();
      const month = transaction.occurredAt.getUTCMonth() + 1;
      const period = this.periodKey(year, month);
      const current = map.get(period);

      if (!current) continue;

      if (transaction.direction === CashDirection.IN) {
        current.income += Number(transaction.amount);
      } else {
        current.expense += Number(transaction.amount);
      }

      current.net = current.income - current.expense;
      map.set(period, current);
    }

    return Array.from(map.values()).sort((a, b) =>
      a.period.localeCompare(b.period),
    );
  }

  private buildHistoryWithForecast(
    history: CashHistoryItem[],
    forecastMonths: number,
  ): CashHistoryItem[] {
    if (history.length === 0) return [];

    const lastRealMonth = history[history.length - 1];
    const [lastYear, lastMonth] = lastRealMonth.period.split('-').map(Number);
    const lastDate = new Date(Date.UTC(lastYear, lastMonth - 1, 1));
    const forecastBase = history.slice(-3);

    const averageIncome = this.average(
      forecastBase.map((item) => Number(item.income || 0)),
    );
    const averageExpense = this.average(
      forecastBase.map((item) => Number(item.expense || 0)),
    );

    const forecast: CashHistoryItem[] = [];

    for (let index = 1; index <= forecastMonths; index += 1) {
      const date = this.addMonths(lastDate, index);
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth() + 1;
      const income = averageIncome;
      const expense = averageExpense;

      forecast.push({
        period: this.periodKey(year, month),
        label: this.monthLabel(year, month),
        income,
        expense,
        net: income - expense,
        projected: true,
      });
    }

    return [...history, ...forecast];
  }

  private average(values: number[]) {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
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

  private buildExpectedCollectionByCategory(
    members: Array<{
      category: MemberCategory;
      status: MemberStatus;
    }>,
    currentRates: Map<MemberCategory, number>,
  ) {
    const map = new Map<
      MemberCategory,
      {
        category: MemberCategory;
        activeMembers: number;
        unitAmount: number;
        expectedTotal: number;
      }
    >();

    for (const member of members) {
      const unitAmount = currentRates.get(member.category) ?? 0;

      const current = map.get(member.category) ?? {
        category: member.category,
        activeMembers: 0,
        unitAmount,
        expectedTotal: 0,
      };

      current.activeMembers += 1;
      current.unitAmount = unitAmount;
      current.expectedTotal += unitAmount;

      map.set(member.category, current);
    }

    return Array.from(map.values()).sort((a, b) =>
      String(a.category).localeCompare(String(b.category)),
    );
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

      const amount = currentRates.get(category) ?? 0;

      if (amount <= 0) {
        continue;
      }

      months.push({
        periodYear,
        periodMonth,
        label: this.monthLabel(periodYear, periodMonth),
        category,
        amount,
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
