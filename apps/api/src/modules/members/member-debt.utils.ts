import {
  MemberCategory,
  MemberStatus,
  PaymentStatus,
  Prisma,
} from '@prisma/client';

type MemberWithDebtData = Prisma.MemberGetPayload<{
  include: {
    payments: true;
    statusHistory: true;
    categoryHistory: true;
  };
}>;

export type DebtLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';

export type MemberDebtMonth = {
  periodYear: number;
  periodMonth: number;
  label: string;
  category: MemberCategory;
  amount: number;
  overdue: boolean;
  isCurrentMonth: boolean;
};

export type MemberDebtSnapshot = {
  debt: number;
  monthsOwed: number;
  owesCurrentMonth: boolean;
  overdueMonthsCount: number;
  overdueMonthLabels: string[];
  currentMonthLabel: string;
  debtLevel: DebtLevel;
  debtLevelLabel: string;
  debtColor: 'gray' | 'green' | 'yellow' | 'red';
  months: MemberDebtMonth[];
};

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

export function buildCurrentRatesMap(
  rates: Array<{
    category: MemberCategory;
    amount: Prisma.Decimal | number;
    validFrom: Date;
    validTo: Date | null;
  }>,
  queryDate: Date,
): Map<MemberCategory, number> {
  const map = new Map<MemberCategory, number>();
  const sorted = [...rates].sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
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

export function buildDebtSnapshot(
  member: MemberWithDebtData,
  currentRates: Map<MemberCategory, number>,
  queryDate: Date = new Date(),
): MemberDebtSnapshot {
  const queryMonthStart = startOfMonth(queryDate);
  const joinedMonthStart = startOfMonth(member.joinedAt);

  const paidPeriods = new Set(
    member.payments
      .filter((payment) => payment.status === PaymentStatus.REGISTERED)
      .map((payment) => periodKey(payment.periodYear, payment.periodMonth)),
  );

  const months: MemberDebtMonth[] = [];

  for (
    let cursor = new Date(joinedMonthStart);
    cursor.getTime() <= queryMonthStart.getTime();
    cursor = addMonths(cursor, 1)
  ) {
    const monthStart = startOfMonth(cursor);
    const monthEnd = addMonths(monthStart, 1);
    const isCurrentMonth = monthStart.getTime() === queryMonthStart.getTime();

    if (!isActiveInMonth(member, monthStart, monthEnd)) {
      continue;
    }

    const category = resolveCategoryForMonth(member, monthStart, monthEnd);
    if (!category) {
      continue;
    }

    const key = periodKey(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1);
    if (paidPeriods.has(key)) {
      continue;
    }

    const amount = currentRates.get(category) ?? 0;

    months.push({
      periodYear: monthStart.getUTCFullYear(),
      periodMonth: monthStart.getUTCMonth() + 1,
      label: monthLabel(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1),
      category,
      amount,
      overdue: monthStart.getTime() < queryMonthStart.getTime(),
      isCurrentMonth,
    });
  }

  const debt = months.reduce((sum, month) => sum + month.amount, 0);
  const owesCurrentMonth = months.some((month) => month.isCurrentMonth);
  const overdueMonths = months.filter((month) => month.overdue);
  const overdueMonthLabels = overdueMonths.map((month) => month.label);

  const { level, label, color } = classifyDebt(months.length, owesCurrentMonth);

  return {
    debt,
    monthsOwed: months.length,
    owesCurrentMonth,
    overdueMonthsCount: overdueMonths.length,
    overdueMonthLabels,
    currentMonthLabel: monthLabel(
      queryMonthStart.getUTCFullYear(),
      queryMonthStart.getUTCMonth() + 1,
    ),
    debtLevel: level,
    debtLevelLabel: label,
    debtColor: color,
    months,
  };
}

function classifyDebt(
  monthsOwed: number,
  owesCurrentMonth: boolean,
): {
  level: DebtLevel;
  label: string;
  color: 'gray' | 'green' | 'yellow' | 'red';
} {
  if (monthsOwed === 0) {
    return {
      level: 'NONE',
      label: 'Sin deuda',
      color: 'gray',
    };
  }

  if (monthsOwed === 1 && owesCurrentMonth) {
    return {
      level: 'LOW',
      label: 'Socio deuda leve',
      color: 'green',
    };
  }

  if (monthsOwed <= 3) {
    return {
      level: 'MEDIUM',
      label: 'Socio deuda media',
      color: 'yellow',
    };
  }

  return {
    level: 'HIGH',
    label: 'Socio deuda alta',
    color: 'red',
  };
}

function resolveCategoryForMonth(
  member: MemberWithDebtData,
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

function isActiveInMonth(
  member: MemberWithDebtData,
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

function overlaps(
  from: Date,
  to: Date | null,
  monthStart: Date,
  monthEnd: Date,
): boolean {
  const effectiveTo = to ?? new Date('2999-12-31T00:00:00.000Z');
  return from.getTime() < monthEnd.getTime() && effectiveTo.getTime() > monthStart.getTime();
}

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function periodKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function monthLabel(year: number, month: number): string {
  return `${MONTHS_ES[month - 1]} ${year}`;
}
