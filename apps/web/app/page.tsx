'use client';

import { useEffect, useMemo, useState } from 'react';
import { SectionCard } from '../components/section-card';
import { api } from '../lib/api';

type DashboardData = {
  people: {
    totalMembers: number;
    byCategory: Array<{
      category: string;
      count: number;
    }>;
    byGrade: Array<{
      grade: string;
      count: number;
    }>;
    activeMembers: number;
    inactiveMembers: number;
    averageAge: number;
    birthdaysThisMonth: Array<{
      id: string;
      fullName: string;
      date: string;
      day: number;
    }>;
    publicManagement: {
      membersWithPhone: number;
      membersWithoutPhone: number;
      membersWithEmail: number;
      membersWithoutEmail: number;
      contactCoveragePercentage: number;
    };
  };
  accounting: {
    cashBalance: number;
    currentMonth: string;
    currentMonthCollection: number;
    currentMonthExpected: number;
    currentMonthCollectionGap: number;
    collectionEffectiveness: number;
    operatingCashFlow: number;
    debtors: Array<{
      id: string;
      fullName: string;
      matricula: string;
      category: string;
      grade: string | null;
      phone: string | null;
      totalDebt: number;
      monthsOwed: number;
      overdueMonthsCount: number;
      overdueMonthLabels: string[];
    }>;
    debtorsCount: number;
    debtorsPercentage: number;
    totalDebtToDate: number;
    delinquencyIndex: number;
    averageMonthlyContribution: number;
    averageIncomeLast12: number;
    averageExpenseLast12: number;
    averageNetLast12: number;
    monthsOfCoverage: number | null;
    monthlyCashHistory: Array<{
      period: string;
      label: string;
      income: number;
      expense: number;
      net: number;
    }>;
    expectedByCategory: Array<{
      category: string;
      activeMembers: number;
      unitAmount: number;
      expectedTotal: number;
    }>;
    publicManagement: {
      messagesRegisteredThisMonth: number;
      activeContributionBase: number;
      collectionRisk: 'LOW' | 'MEDIUM' | 'HIGH';
      liquidityRisk: 'UNKNOWN' | 'LOW' | 'MEDIUM' | 'HIGH';
      concentrationRisk: number;
    };
  };
};

const CATEGORY_LABELS: Record<string, string> = {
  SIMPLE: 'Simple',
  DOBLE: 'Doble',
  ESTUDIANTE: 'Estudiante',
  SOCIAL: 'Social',
  MENOR: 'Menor',
  HONOR: 'Honor',
};

const GRADE_LABELS: Record<string, string> = {
  APRENDIZ: 'Aprendiz',
  COMPANERO: 'Compañero',
  MAESTRO: 'Maestro',
  SIN_GRADO: 'Sin grado',
};

const RISK_LABELS: Record<string, string> = {
  LOW: 'Bajo',
  MEDIUM: 'Medio',
  HIGH: 'Alto',
  UNKNOWN: 'Sin datos',
};

function fmtMoney(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(Number(n || 0));
}

function fmtPercent(n: number) {
  return `${Number(n || 0).toFixed(1)}%`;
}

function categoryLabel(value: string) {
  return CATEGORY_LABELS[value] ?? value;
}

function gradeLabel(value: string | null) {
  if (!value) return 'Sin grado';
  return GRADE_LABELS[value] ?? value;
}

function signedTone(value: number) {
  if (value > 0) return 'text-emerald-700';
  if (value < 0) return 'text-rose-700';
  return 'text-ink';
}

function riskClasses(risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN') {
  if (risk === 'LOW') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (risk === 'MEDIUM') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (risk === 'HIGH') return 'border-rose-200 bg-rose-50 text-rose-700';
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function InfoHint({ text }: { text: string }) {
  return (
    <span
      title={text}
      className="ml-2 inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full border border-ink/20 text-xs font-bold text-ink/50"
    >
      ?
    </span>
  );
}

function MetricCard({
  label,
  value,
  description,
  tone = 'neutral',
}: {
  label: string;
  value: string | number;
  description?: string;
  tone?: 'neutral' | 'accent' | 'green' | 'red' | 'amber';
}) {
  const classes = {
    neutral: 'border-ink/10 bg-ink/5 text-ink',
    accent: 'border-accent/20 bg-accent/10 text-accent',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    red: 'border-rose-200 bg-rose-50 text-rose-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
  }[tone];

  return (
    <div className={`rounded-2xl border p-4 ${classes}`}>
      <div className="text-xs uppercase tracking-wide opacity-70">
        {label}
        {description && <InfoHint text={description} />}
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}

function Gauge({ value }: { value: number }) {
  const safeValue = Math.max(0, Math.min(100, Number(value || 0)));
  const tone =
    safeValue >= 50
      ? {
          color: '#dc2626',
          bg: 'bg-rose-50',
          text: 'text-rose-700',
          label: 'Alta',
        }
      : safeValue >= 25
        ? {
            color: '#d97706',
            bg: 'bg-amber-50',
            text: 'text-amber-700',
            label: 'Media',
          }
        : {
            color: '#059669',
            bg: 'bg-emerald-50',
            text: 'text-emerald-700',
            label: 'Baja',
          };

  const centerX = 110;
  const centerY = 116;
  const radius = 82;
  const pointerAngle = 180 + (safeValue / 100) * 180;
  const pointerRadians = (pointerAngle * Math.PI) / 180;
  const pointerX = centerX + radius * 0.72 * Math.cos(pointerRadians);
  const pointerY = centerY + radius * 0.72 * Math.sin(pointerRadians);

  return (
    <div className={`rounded-2xl border border-ink/10 p-4 ${tone.bg}`}>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-ink/50">
            Índice de Morosidad
            <InfoHint text="Porcentaje de cuotas del mes actual que siguen impagas después del día 5. Se calcula solo con cuotas de monto mayor a $0." />
          </div>
          <div className={`mt-1 text-sm font-semibold ${tone.text}`}>
            Morosidad {tone.label}
          </div>
        </div>
        <div className={`text-2xl font-bold ${tone.text}`}>
          {safeValue.toFixed(1)}%
        </div>
      </div>

      <svg viewBox="0 0 220 140" className="h-36 w-full">
        <path
          d={`M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 0 1 ${
            centerX + radius
          } ${centerY}`}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="16"
          strokeLinecap="round"
        />
        <path
          d={`M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 0 1 ${
            centerX + radius
          } ${centerY}`}
          fill="none"
          stroke={tone.color}
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={`${(safeValue / 100) * 258} 258`}
        />
        <line
          x1={centerX}
          y1={centerY}
          x2={pointerX}
          y2={pointerY}
          stroke="#111827"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx={centerX} cy={centerY} r="7" fill="#111827" />
        <text x="26" y="134" fontSize="11" fill="#6b7280">
          0%
        </text>
        <text x="101" y="34" fontSize="11" fill="#6b7280">
          50%
        </text>
        <text x="176" y="134" fontSize="11" fill="#6b7280">
          100%
        </text>
      </svg>

      <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-xl bg-emerald-100 px-2 py-2 text-emerald-700">
          0–25% Baja
        </div>
        <div className="rounded-xl bg-amber-100 px-2 py-2 text-amber-700">
          25–50% Media
        </div>
        <div className="rounded-xl bg-rose-100 px-2 py-2 text-rose-700">
          50–100% Alta
        </div>
      </div>
    </div>
  );
}

function MiniColumnChart({
  rows,
}: {
  rows: Array<{
    period: string;
    label: string;
    income: number;
    expense: number;
    net: number;
  }>;
}) {
  const maxValue = Math.max(
    ...rows.map((row) => Math.max(Number(row.income), Number(row.expense))),
    1,
  );

  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-4">
      <div className="mb-4 text-lg font-semibold text-ink">
        Ingresos vs egresos últimos 12 meses
        <InfoHint text="Muestra movimientos de caja registrados y no anulados. Sirve para ver tendencia, no promesa futura." />
      </div>

      {rows.length === 0 ? (
        <div className="py-8 text-sm text-ink/60">Sin movimientos registrados.</div>
      ) : (
        <div className="overflow-x-auto">
          <div className="flex min-w-[760px] items-end gap-4 border-b border-ink/10 pb-4">
            {rows.map((row) => {
              const incomeHeight = Math.max(4, (row.income / maxValue) * 160);
              const expenseHeight = Math.max(4, (row.expense / maxValue) * 160);

              return (
                <div key={row.period} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-44 items-end gap-1">
                    <div
                      title={`Ingresos ${fmtMoney(row.income)}`}
                      className="w-4 rounded-t-lg bg-emerald-600"
                      style={{ height: `${incomeHeight}px` }}
                    />
                    <div
                      title={`Egresos ${fmtMoney(row.expense)}`}
                      className="w-4 rounded-t-lg bg-rose-600"
                      style={{ height: `${expenseHeight}px` }}
                    />
                  </div>
                  <div className="max-w-20 text-center text-[10px] font-semibold text-ink/70">
                    {row.label.split(' ')[0].slice(0, 3)} {row.label.split(' ')[1]}
                  </div>
                  <div className={`text-[10px] font-bold ${signedTone(row.net)}`}>
                    {fmtMoney(row.net)}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex gap-4 text-xs text-ink/60">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-emerald-600" />
              Ingresos
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-rose-600" />
              Egresos
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<DashboardData>('/dashboard/executive')
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const sortedCategories = useMemo(
    () => [...(data?.people.byCategory ?? [])].sort((a, b) => b.count - a.count),
    [data],
  );

  const sortedGrades = useMemo(
    () => [...(data?.people.byGrade ?? [])].sort((a, b) => b.count - a.count),
    [data],
  );

  const debtors = data?.accounting.debtors ?? [];
  const birthdays = data?.people.birthdaysThisMonth ?? [];
  const expectedByCategory = data?.accounting.expectedByCategory ?? [];
  const monthlyCashHistory = data?.accounting.monthlyCashHistory ?? [];

  return (
    <div className="space-y-6">
      {loading || !data ? (
        <SectionCard title="Dashboard" description="Cargando información">
          <div className="py-8 text-sm text-ink/60">Cargando dashboard...</div>
        </SectionCard>
      ) : (
        <>
          <SectionCard
            title="Gestión de HH.·."
            description="Información pública de gestión del Cuadro del Taller."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Cantidad total"
                value={data.people.totalMembers}
                description="Total de HH.·. registrados, activos e inactivos."
              />
              <MetricCard
                label="HH.·. activos"
                value={data.people.activeMembers}
                description="HH.·. con estado activo actual."
                tone="accent"
              />
              <MetricCard
                label="HH.·. inactivos"
                value={data.people.inactiveMembers}
                description="HH.·. con estado inactivo actual."
              />
              <MetricCard
                label="Edad promedio"
                value={data.people.averageAge > 0 ? data.people.averageAge.toFixed(1) : '-'}
                description="Promedio calculado solo sobre HH.·. con fecha de nacimiento cargada."
              />
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-ink/10 bg-white p-4">
                <div className="mb-4 text-lg font-semibold text-ink">
                  Cantidad de HH.·. por categoría
                </div>
                <div className="space-y-3">
                  {sortedCategories.map((item) => (
                    <div
                      key={item.category}
                      className="flex items-center justify-between rounded-2xl bg-ink/5 px-4 py-3 text-sm"
                    >
                      <span>{categoryLabel(item.category)}</span>
                      <span className="font-bold">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-ink/10 bg-white p-4">
                <div className="mb-4 text-lg font-semibold text-ink">
                  Cantidad de HH.·. por grado
                </div>
                <div className="space-y-3">
                  {sortedGrades.map((item) => (
                    <div
                      key={item.grade}
                      className="flex items-center justify-between rounded-2xl bg-ink/5 px-4 py-3 text-sm"
                    >
                      <span>{gradeLabel(item.grade)}</span>
                      <span className="font-bold">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-ink/10 bg-white p-4">
                <div className="mb-4 text-lg font-semibold text-ink">
                  Cumpleaños de HH.·.
                </div>
                {birthdays.length === 0 ? (
                  <div className="text-sm text-ink/60">
                    No hay HH.·. con cumpleaños este mes.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {birthdays.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-2xl bg-ink/5 px-4 py-3 text-sm"
                      >
                        <span>{item.fullName}</span>
                        <span className="font-semibold">
                          {String(item.day).padStart(2, '0')}/
                          {String(new Date(item.date).getUTCMonth() + 1).padStart(2, '0')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-ink/10 bg-white p-4">
                <div className="mb-4 text-lg font-semibold text-ink">
                  Información pública de gestión
                  <InfoHint text="Datos de calidad operativa para decidir campañas, actualización de padrón y comunicación." />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl bg-ink/5 p-4">
                    <div className="text-xs uppercase tracking-wide text-ink/50">
                      Cobertura celular
                    </div>
                    <div className="mt-2 text-xl font-bold text-ink">
                      {fmtPercent(data.people.publicManagement.contactCoveragePercentage)}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-ink/5 p-4">
                    <div className="text-xs uppercase tracking-wide text-ink/50">
                      Sin celular
                    </div>
                    <div className="mt-2 text-xl font-bold text-ink">
                      {data.people.publicManagement.membersWithoutPhone}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-ink/5 p-4">
                    <div className="text-xs uppercase tracking-wide text-ink/50">
                      Con email
                    </div>
                    <div className="mt-2 text-xl font-bold text-ink">
                      {data.people.publicManagement.membersWithEmail}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-ink/5 p-4">
                    <div className="text-xs uppercase tracking-wide text-ink/50">
                      Sin email
                    </div>
                    <div className="mt-2 text-xl font-bold text-ink">
                      {data.people.publicManagement.membersWithoutEmail}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Contabilidad"
            description="Indicadores públicos para gestión financiera y decisiones estratégicas."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Saldo Caja"
                value={fmtMoney(data.accounting.cashBalance)}
                description="Ingresos registrados menos egresos registrados, excluyendo movimientos anulados."
                tone="accent"
              />
              <MetricCard
                label={`Recaudación ${data.accounting.currentMonth}`}
                value={fmtMoney(data.accounting.currentMonthCollection)}
                description="Pagos registrados durante el mes actual."
                tone="green"
              />
              <MetricCard
                label="Esperado del mes"
                value={fmtMoney(data.accounting.currentMonthExpected)}
                description="Suma de cuotas esperadas del mes para HH.·. activos con cuota mayor a $0."
              />
              <MetricCard
                label="Brecha de cobranza"
                value={fmtMoney(data.accounting.currentMonthCollectionGap)}
                description="Diferencia entre lo esperado del mes y lo cobrado. Nunca baja de cero."
                tone={data.accounting.currentMonthCollectionGap > 0 ? 'amber' : 'green'}
              />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Flujo de caja operativo"
                value={fmtMoney(data.accounting.operatingCashFlow)}
                description="Ingresos de caja del mes menos egresos de caja del mes."
                tone={data.accounting.operatingCashFlow >= 0 ? 'green' : 'red'}
              />
              <MetricCard
                label="Total de deudas"
                value={fmtMoney(data.accounting.totalDebtToDate)}
                description="Total de deuda monetaria real. No incluye meses con cuota $0."
                tone={data.accounting.totalDebtToDate > 0 ? 'amber' : 'green'}
              />
              <MetricCard
                label="Aporte promedio mensual"
                value={fmtMoney(data.accounting.averageMonthlyContribution)}
                description="Recaudación del mes dividida por HH.·. activos con cuota esperada mayor a $0."
              />
              <MetricCard
                label="Cobranza efectiva"
                value={fmtPercent(data.accounting.collectionEffectiveness)}
                description="Recaudación real del mes dividida por recaudación esperada del mes."
                tone={
                  data.accounting.collectionEffectiveness >= 85
                    ? 'green'
                    : data.accounting.collectionEffectiveness >= 65
                      ? 'amber'
                      : 'red'
                }
              />
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <Gauge value={data.accounting.delinquencyIndex} />

              <div className="rounded-2xl border border-ink/10 bg-white p-4">
                <div className="mb-4 text-lg font-semibold text-ink">
                  Riesgos públicos de gestión
                  <InfoHint text="Indicadores de lectura rápida para evaluar cobranza, liquidez, concentración de deuda y actividad de mensajería." />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div
                    className={`rounded-2xl border p-4 ${riskClasses(
                      data.accounting.publicManagement.collectionRisk,
                    )}`}
                  >
                    <div className="text-xs uppercase tracking-wide opacity-70">
                      Riesgo de cobranza
                    </div>
                    <div className="mt-2 text-xl font-bold">
                      {RISK_LABELS[data.accounting.publicManagement.collectionRisk]}
                    </div>
                  </div>

                  <div
                    className={`rounded-2xl border p-4 ${riskClasses(
                      data.accounting.publicManagement.liquidityRisk,
                    )}`}
                  >
                    <div className="text-xs uppercase tracking-wide opacity-70">
                      Riesgo de liquidez
                    </div>
                    <div className="mt-2 text-xl font-bold">
                      {RISK_LABELS[data.accounting.publicManagement.liquidityRisk]}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-ink/10 bg-ink/5 p-4">
                    <div className="text-xs uppercase tracking-wide text-ink/50">
                      Concentración deuda top 5
                    </div>
                    <div className="mt-2 text-xl font-bold text-ink">
                      {fmtPercent(data.accounting.publicManagement.concentrationRisk)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-ink/10 bg-ink/5 p-4">
                    <div className="text-xs uppercase tracking-wide text-ink/50">
                      Mensajes registrados este mes
                    </div>
                    <div className="mt-2 text-xl font-bold text-ink">
                      {data.accounting.publicManagement.messagesRegisteredThisMonth}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-ink/10 bg-ink/5 p-4 md:col-span-2">
                    <div className="text-xs uppercase tracking-wide text-ink/50">
                      Cobertura de caja
                      <InfoHint text="Saldo de caja dividido por egreso promedio de los últimos 12 meses." />
                    </div>
                    <div className="mt-2 text-xl font-bold text-ink">
                      {data.accounting.monthsOfCoverage === null
                        ? 'Sin egresos de referencia'
                        : `${data.accounting.monthsOfCoverage.toFixed(1)} meses`}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <MiniColumnChart rows={monthlyCashHistory} />
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-ink/10 bg-white p-4">
                <div className="mb-4 text-lg font-semibold text-ink">
                  Recaudación esperada por categoría
                </div>

                {expectedByCategory.length === 0 ? (
                  <div className="text-sm text-ink/60">
                    No hay categorías con cuota esperada mayor a $0.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {expectedByCategory.map((item) => (
                      <div
                        key={item.category}
                        className="rounded-2xl bg-ink/5 px-4 py-3 text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-ink">
                            {categoryLabel(item.category)}
                          </span>
                          <span className="font-bold text-ink">
                            {fmtMoney(item.expectedTotal)}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-ink/60">
                          {item.activeMembers} HH.·. × {fmtMoney(item.unitAmount)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-ink/10 bg-white p-4">
                <div className="mb-4 text-lg font-semibold text-ink">
                  HH.·. con deuda real
                  <InfoHint text="Solo se muestran HH.·. activos con deuda monetaria mayor a $0. No cuenta categorías o meses con cuota $0." />
                </div>

                {debtors.length === 0 ? (
                  <div className="text-sm text-ink/60">
                    No hay HH.·. con deuda monetaria real.
                  </div>
                ) : (
                  <div className="max-h-[520px] space-y-3 overflow-y-auto pr-2">
                    {debtors.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-ink/10 bg-white p-4 text-sm"
                      >
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="font-semibold text-ink">{item.fullName}</div>
                            <div className="mt-1 text-xs text-ink/60">
                              Matrícula {item.matricula} · {categoryLabel(item.category)} ·{' '}
                              {gradeLabel(item.grade)}
                            </div>
                            <div className="mt-1 text-xs text-ink/60">
                              {item.phone ?? 'Sin celular'}
                            </div>
                            {item.overdueMonthLabels.length > 0 && (
                              <div className="mt-2 text-xs text-ink/70">
                                Vencidos: {item.overdueMonthLabels.join(', ')}
                              </div>
                            )}
                          </div>

                          <div className="rounded-2xl bg-amber-50 px-4 py-3 text-right">
                            <div className="text-lg font-bold text-amber-700">
                              {fmtMoney(item.totalDebt)}
                            </div>
                            <div className="text-xs text-amber-700">
                              {item.monthsOwed} mes
                              {item.monthsOwed !== 1 ? 'es' : ''} con deuda
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}
