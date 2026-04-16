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

function gaugeTone(value: number) {
  if (value >= 50) {
    return {
      color: '#dc2626',
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      label: 'Alta',
    };
  }

  if (value >= 25) {
    return {
      color: '#d97706',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      label: 'Media',
    };
  }

  return {
    color: '#059669',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    label: 'Baja',
  };
}

function Gauge({ value }: { value: number }) {
  const safeValue = Math.max(0, Math.min(100, value));
  const tone = gaugeTone(safeValue);

  const centerX = 110;
  const centerY = 120;
  const radius = 82;

  const pointerAngle = -180 + (safeValue / 100) * 180;
  const pointerRadians = (pointerAngle * Math.PI) / 180;

  const pointerX = centerX + radius * 0.78 * Math.cos(pointerRadians);
  const pointerY = centerY + radius * 0.78 * Math.sin(pointerRadians);

  const progressLength = 100;
  const dash = safeValue;
  const arcPath = `
    M ${centerX - radius} ${centerY}
    A ${radius} ${radius} 0 0 1 ${centerX + radius} ${centerY}
  `;

  return (
    <div className="rounded-3xl border border-ink/10 bg-white p-5 shadow-sm">
      <svg viewBox="0 0 220 145" className="mx-auto h-48 w-full max-w-sm">
        <defs>
          <linearGradient id="gaugeBase" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>

        <path
          d={arcPath}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="18"
          strokeLinecap="round"
          pathLength={progressLength}
        />

        <path
          d={arcPath}
          fill="none"
          stroke="url(#gaugeBase)"
          strokeWidth="18"
          strokeLinecap="round"
          pathLength={progressLength}
          strokeDasharray={`${dash} ${progressLength}`}
        />

        <line
          x1={centerX}
          y1={centerY}
          x2={pointerX}
          y2={pointerY}
          stroke="#111827"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <circle cx={centerX} cy={centerY} r="8" fill="#111827" />

        <text
          x={centerX}
          y="64"
          textAnchor="middle"
          fontSize="26"
          fontWeight="700"
          fill={tone.color}
        >
          {safeValue.toFixed(1)}%
        </text>

        <text
          x={centerX}
          y="84"
          textAnchor="middle"
          fontSize="12"
          fontWeight="600"
          fill="#6b7280"
        >
          Índice actual
        </text>

        <text x="22" y="128" textAnchor="start" fontSize="11" fill="#059669">
          0%
        </text>
        <text x={centerX} y="18" textAnchor="middle" fontSize="11" fill="#d97706">
          50%
        </text>
        <text x="198" y="128" textAnchor="end" fontSize="11" fill="#dc2626">
          100%
        </text>
      </svg>

      <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs font-semibold">
        <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-emerald-700">
          0–25% Baja
        </div>
        <div className="rounded-2xl bg-amber-50 px-3 py-2 text-amber-700">
          25–50% Media
        </div>
        <div className="rounded-2xl bg-rose-50 px-3 py-2 text-rose-700">
          50–100% Alta
        </div>
      </div>

      <div
        className={`mt-3 rounded-2xl px-3 py-2 text-center text-sm font-semibold ${tone.bg} ${tone.text}`}
      >
        Morosidad {tone.label}
      </div>
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
              <div>
                <div className="mb-2 text-lg font-semibold text-ink">
                  Índice de Morosidad
                </div>
                <div className="text-sm text-ink/60">
                  Porcentaje de cuotas del mes actual no cobradas después del día 5.
                </div>
                <div className="mt-4">
                  <Gauge value={data.accounting.delinquencyIndex} />
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
