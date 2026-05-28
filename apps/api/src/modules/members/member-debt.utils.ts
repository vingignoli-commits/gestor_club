import {
  MemberCategory,
  MemberStatus,
  PaymentStatus,
  Prisma,
} from "@prisma/client";

const MONTHS_ES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

type RateLike = {
  category: MemberCategory;
  amount: Prisma.Decimal | number;
  validFrom: Date;
  validTo: Date | null;
};

type PaymentLike = {
  status: PaymentStatus;
  periodYear: number;
  periodMonth: number;
};

type StatusHistoryLike = {
  status: MemberStatus;
  effectiveFrom: Date;
  effectiveTo: Date | null;
};

type CategoryHistoryLike = {
  category: MemberCategory;
  effectiveFrom: Date;
  effectiveTo: Date | null;
};

type MemberDebtInput = {
  id: string;
  joinedAt: Date;
  status: MemberStatus;
  category: MemberCategory;
  payments: PaymentLike[];
  statusHistory: StatusHistoryLike[];
  categoryHistory: CategoryHistoryLike[];
};

type DebtMonth = {
  periodYear: number;
  periodMonth: number;
  label: string;
  category: MemberCategory;
  amount: number;
  overdue: boolean;
  isCurrentMonth: boolean;
};

type StatusPeriod = {
  status: MemberStatus;
  from: Date;
  to: Date | null;
};

type CategoryPeriod = {
  category: MemberCategory;
  from: Date;
  to: Date | null;
};

export function buildCurrentRatesMap(
  rates: RateLike[],
  queryDate: Date,
): Map<MemberCategory, number> {
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

export function buildDebtSnapshot(
  member: MemberDebtInput,
  currentRates: Map<MemberCategory, number>,
  queryDate: Date,
) {
  const queryMonthStart = startOfMonth(queryDate);
  const joinedMonthStart = startOfMonth(member.joinedAt);

  const paidPeriods = new Set(
    member.payments
      .filter((payment) => payment.status === PaymentStatus.REGISTERED)
      .map((payment) => periodKey(payment.periodYear, payment.periodMonth)),
  );

  const statusPeriods = buildStatusPeriods(member);
  const categoryPeriods = buildCategoryPeriods(member);

  const months: DebtMonth[] = [];

  for (
    let cursor = new Date(joinedMonthStart);
    cursor.getTime() <= queryMonthStart.getTime();
    cursor = addMonths(cursor, 1)
  ) {
    const monthStart = startOfMonth(cursor);
    const monthEnd = addMonths(monthStart, 1);
    const periodYear = monthStart.getUTCFullYear();
    const periodMonth = monthStart.getUTCMonth() + 1;
    const key = periodKey(periodYear, periodMonth);
    const isCurrentMonth = monthStart.getTime() === queryMonthStart.getTime();

    if (paidPeriods.has(key)) {
      continue;
    }

    const wasActiveThatMonth = statusPeriods.some(
      (period) =>
        period.status === MemberStatus.ACTIVE &&
        overlaps(period.from, period.to, monthStart, monthEnd),
    );

    if (!wasActiveThatMonth) {
      continue;
    }

    const category =
      resolveCategoryForMonth(categoryPeriods, monthStart, monthEnd) ??
      member.category;

    const amount = currentRates.get(category) ?? 0;

    if (amount <= 0) {
      continue;
    }

    months.push({
      periodYear,
      periodMonth,
      label: monthLabel(periodYear, periodMonth),
      category,
      amount,
      overdue: monthStart.getTime() < queryMonthStart.getTime(),
      isCurrentMonth,
    });
  }

  const debt = months.reduce((sum, month) => sum + Number(month.amount), 0);
  const overdueMonths = months.filter((month) => month.overdue);

  return {
    debt,
    monthsOwed: months.length,
    owesCurrentMonth: months.some((month) => month.isCurrentMonth),
    overdueMonthsCount: overdueMonths.length,
    overdueMonthLabels: overdueMonths.map((month) => month.label),
    months,
  };
}

function buildStatusPeriods(member: MemberDebtInput): StatusPeriod[] {
  const history = [...member.statusHistory].sort(
    (a, b) => a.effectiveFrom.getTime() - b.effectiveFrom.getTime(),
  );

  if (history.length === 0) {
    return [
      {
        status: member.status,
        from: member.joinedAt,
        to: null,
      },
    ];
  }

  const periods: StatusPeriod[] = [];

  const first = history[0];

  if (first.effectiveFrom.getTime() > member.joinedAt.getTime()) {
    periods.push({
      status: MemberStatus.ACTIVE,
      from: member.joinedAt,
      to: first.effectiveFrom,
    });
  }

  for (let index = 0; index < history.length; index += 1) {
    const item = history[index];
    const next = history[index + 1];

    periods.push({
      status: item.status,
      from: item.effectiveFrom,
      to: item.effectiveTo ?? next?.effectiveFrom ?? null,
    });
  }

  return periods;
}

function buildCategoryPeriods(member: MemberDebtInput): CategoryPeriod[] {
  const history = [...member.categoryHistory].sort(
    (a, b) => a.effectiveFrom.getTime() - b.effectiveFrom.getTime(),
  );

  if (history.length === 0) {
    return [
      {
        category: member.category,
        from: member.joinedAt,
        to: null,
      },
    ];
  }

  const periods: CategoryPeriod[] = [];

  const first = history[0];

  if (first.effectiveFrom.getTime() > member.joinedAt.getTime()) {
    periods.push({
      category: member.category,
      from: member.joinedAt,
      to: first.effectiveFrom,
    });
  }

  for (let index = 0; index < history.length; index += 1) {
    const item = history[index];
    const next = history[index + 1];

    periods.push({
      category: item.category,
      from: item.effectiveFrom,
      to: item.effectiveTo ?? next?.effectiveFrom ?? null,
    });
  }

  return periods;
}

function resolveCategoryForMonth(
  categoryPeriods: CategoryPeriod[],
  monthStart: Date,
  monthEnd: Date,
): MemberCategory | null {
  const overlapping = categoryPeriods
    .filter((period) => overlaps(period.from, period.to, monthStart, monthEnd))
    .sort((a, b) => b.from.getTime() - a.from.getTime());

  return overlapping[0]?.category ?? null;
}

function overlaps(
  from: Date,
  to: Date | null,
  monthStart: Date,
  monthEnd: Date,
): boolean {
  const effectiveTo = to ?? new Date("2999-12-31T00:00:00.000Z");

  return (
    from.getTime() < monthEnd.getTime() &&
    effectiveTo.getTime() > monthStart.getTime()
  );
}

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonths(date: Date, months: number): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1),
  );
}

function periodKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function monthLabel(year: number, month: number): string {
  return `${MONTHS_ES[month - 1]} ${year}`;
}
