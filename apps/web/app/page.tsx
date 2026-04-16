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
    averageAge: number;
    birthdaysThisMonth: Array<{
      id: string;
      fullName: string;
      date: string;
      day: number;
    }>;
  };
  accounting: {
    cashBalance: number;
    currentMonthCollection: number;
    operatingCashFlow: number;
    debtors: Array<{
      id: string;
      fullName: string;
      matricula: string;
      totalDebt: number;
      overdueMonthsCount: number;
    }>;
    totalDebtToDate: number;
    delinquencyIndex: number;
    averageMonthlyContribution: number;
  };
};

function fmtMoney(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n);
}

function categoryLabel(value: string) {
  const labels: Record<string, string> = {
    SIMPLE: 'Simple',
    DOBLE: 'Doble',
    ESTUDIANTE: 'Estudiante',
    SOCIAL: 'Social',
    MENOR: 'Menor',
    HONOR: 'Honor',
  };

  return labels[value] ?? value;
}

function gradeLabel(value: string) {
  const labels: Record<string, string> = {
    APRENDIZ: 'Aprendiz',
    COMPANERO: 'Compañero',
    MAESTRO: 'Maestro',
    SIN_GRADO: 'Sin grado',
  };

  return labels[value] ?? value;
}

function gaugeColor(value: number) {
  if (value >= 50) return '#ef4444';
  if (value >= 25) return '#f59e0b';
  return '#10b981';
}

function Gauge({ value }: { value: number }) {
  const safeValue = Math.max(0, Math.min(100, value));
  const pointerAngle = -90 + (safeValue / 100) * 180;
  const radians = (pointerAngle * Math.PI) / 180;
  const pointerX = 100 + 60 * Math.cos(radians);
  const pointerY = 100 + 60 * Math.sin(radians);
  const valueColor = gaugeColor(safeValue);

  return (
    <svg viewBox="0 0 200 120" className="h-44 w-full">
      <path
        d="M 20 100 A 80 80 0 0 1 60 30"
        fill="none"
        stroke="#10b981"
        strokeWidth="18"
        strokeLinecap="round"
      />
      <path
        d="M 60 30 A 80 80 0 0 1 100 20"
        fill="none"
        stroke="#10b981"
        strokeWidth="18"
        strokeLinecap="round"
      />
      <path
        d="M 100 20 A 80 80 0 0 1 140 30"
        fill="none"
        stroke="#f59e0b"
        strokeWidth="18"
        strokeLinecap="round"
      />
      <path
        d="M 140 30 A 80 80 0 0 1 180 100"
        fill="none"
        stroke="#ef4444"
        strokeWidth="18"
        strokeLinecap="round"
      />

      <path
        d="M 20 100 A 80 80 0 0 1 180 100"
        fill="none"
        stroke={valueColor}
        strokeWidth="8"
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray={`${safeValue} 100`}
      />

      <line
        x1="100"
        y1="100"
        x2={pointerX}
        y2={pointerY}
        stroke="#111827"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <circle cx="100" cy="100" r="8" fill="#111827" />

      <text
        x="100"
        y="48"
        textAnchor="middle"
        fontSize="18"
        fontWeight="700"
        fill={valueColor}
      >
        {safeValue.toFixed(1)}%
      </text>

      <text
        x="20"
        y="114"
        textAnchor="start"
        fontSize="10"
        fill="#10b981"
      >
        0%
      </text>
      <text
        x="100"
        y="12"
        textAnchor="middle"
        fontSize="10"
        fill="#f59e0b"
      >
        50%
      </text>
      <text
        x="180"
        y="114"
        textAnchor="end"
        fontSize="10"
        fill="#ef4444"
      >
        100%
      </text>
    </svg>
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
    () =>
      [...(data?.people.byCategory ?? [])].sort((a, b) => b.count - a.count),
    [data],
  );

  const sortedGrades = useMemo(
    () => [...(data?.people.byGrade ?? [])].sort((a, b) => b.count - a.count),
    [data],
  );

  const debtors = data?.accounting.debtors ?? [];
  const birthdays = data?.people.birthdaysThisMonth ?? [];

  return (
    <div className="space-y-6">
      <SectionCard
        title="Gestion de HH.·."
        description="Indicadores principales de composición, actividad y cumpleaños."
      >
        {loading || !data ? (
          <div className="py-8 text-sm text-ink/60">Cargando dashboard...</div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-ink/10 bg-ink/5 p-4">
                <div className="text-xs uppercase tracking-wide text-ink/50">
                  Cantidad total
                </div>
                <div className="mt-2 text-3xl font-bold text-ink">
                  {data.people.totalMembers}
                </div>
              </div>

              <div className="rounded-2xl border border-ink/10 bg-ink/5 p-4">
                <div className="text-xs uppercase tracking-wide text-ink/50">
                  Cantidad de HH.·. activos
                </div>
                <div className="mt-2 text-3xl font-bold text-ink">
                  {data.people.activeMembers}
                </div>
              </div>

              <div className="rounded-2xl border border-ink/10 bg-ink/5 p-4">
                <div className="text-xs uppercase tracking-wide text-ink/50">
                  Edad promedio de HH.·.
                </div>
                <div className="mt-2 text-3xl font-bold text-ink">
                  {data.people.averageAge > 0
                    ? data.people.averageAge.toFixed(1)
                    : '-'}
                </div>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <div className="rounded-2xl border border-ink/10 bg-white p-4">
                <div className="mb-4 text-lg font-semibold text-ink">
                  Cantidad de HH.·. por categoria
                </div>
                <div className="space-y-3">
                  {sortedCategories.map((item) => (
                    <div
                      key={item.category}
                      className="flex items-center justify-between rounded-xl bg-ink/5 px-3 py-2 text-sm"
                    >
                      <span className="text-ink">
                        {categoryLabel(item.category)}
                      </span>
                      <span className="font-semibold text-ink">
                        {item.count}
                      </span>
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
                      className="flex items-center justify-between rounded-xl bg-ink/5 px-3 py-2 text-sm"
                    >
                      <span className="text-ink">{gradeLabel(item.grade)}</span>
                      <span className="font-semibold text-ink">
                        {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

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
                        className="flex items-center justify-between rounded-xl bg-ink/5 px-3 py-2 text-sm"
                      >
                        <span className="text-ink">{item.fullName}</span>
                        <span className="font-semibold text-ink">
                          {new Date(item.date).toLocaleDateString('es-AR', {
                            day: '2-digit',
                            month: '2-digit',
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Contabilidad"
        description="Resumen de caja, recaudación, flujo operativo, deuda y morosidad."
      >
        {loading || !data ? (
          <div className="py-8 text-sm text-ink/60">Cargando dashboard...</div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-2xl border border-ink/10 bg-ink/5 p-4">
                <div className="text-xs uppercase tracking-wide text-ink/50">
                  Saldo Caja
                </div>
                <div className="mt-2 text-2xl font-bold text-ink">
                  {fmtMoney(data.accounting.cashBalance)}
                </div>
              </div>

              <div className="rounded-2xl border border-ink/10 bg-ink/5 p-4">
                <div className="text-xs uppercase tracking-wide text-ink/50">
                  Recaudación del mes actual
                </div>
                <div className="mt-2 text-2xl font-bold text-ink">
                  {fmtMoney(data.accounting.currentMonthCollection)}
                </div>
              </div>

              <div className="rounded-2xl border border-ink/10 bg-ink/5 p-4">
                <div className="text-xs uppercase tracking-wide text-ink/50">
                  Flujo de caja operativo
                </div>
                <div className="mt-2 text-2xl font-bold text-ink">
                  {fmtMoney(data.accounting.operatingCashFlow)}
                </div>
              </div>

              <div className="rounded-2xl border border-ink/10 bg-ink/5 p-4">
                <div className="text-xs uppercase tracking-wide text-ink/50">
                  Total de deudas a la fecha
                </div>
                <div className="mt-2 text-2xl font-bold text-ink">
                  {fmtMoney(data.accounting.totalDebtToDate)}
                </div>
              </div>

              <div className="rounded-2xl border border-ink/10 bg-ink/5 p-4">
                <div className="text-xs uppercase tracking-wide text-ink/50">
                  Aporte promedio mensual por H.·.
                </div>
                <div className="mt-2 text-2xl font-bold text-ink">
                  {fmtMoney(data.accounting.averageMonthlyContribution)}
                </div>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
              <div className="rounded-2xl border border-ink/10 bg-white p-4">
                <div className="mb-2 text-lg font-semibold text-ink">
                  Índice de Morosidad
                </div>
                <div className="text-sm text-ink/60">
                  Porcentaje de cuotas del mes actual no cobradas después del día 5.
                </div>
                <Gauge value={data.accounting.delinquencyIndex} />
                <div className="mt-2 flex justify-between text-xs font-semibold">
                  <span className="text-emerald-600">0-25% verde</span>
                  <span className="text-amber-500">25-50% amarillo</span>
                  <span className="text-rose-600">50-100% rojo</span>
                </div>
              </div>

              <div className="rounded-2xl border border-ink/10 bg-white p-4">
                <div className="mb-4 text-lg font-semibold text-ink">
                  HH.·. con deuda
                </div>
                {debtors.length === 0 ? (
                  <div className="text-sm text-ink/60">
                    No hay HH.·. con meses vencidos adeudados.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {debtors.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col gap-2 rounded-xl bg-ink/5 px-3 py-3 text-sm lg:flex-row lg:items-center lg:justify-between"
                      >
                        <div>
                          <div className="font-semibold text-ink">
                            {item.fullName}
                          </div>
                          <div className="text-xs text-ink/60">
                            Matrícula {item.matricula}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-ink">
                            {fmtMoney(item.totalDebt)}
                          </div>
                          <div className="text-xs text-ink/60">
                            {item.overdueMonthsCount} mes
                            {item.overdueMonthsCount !== 1 ? 'es' : ''} vencido
                            {item.overdueMonthsCount !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
