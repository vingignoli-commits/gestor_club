'use client';

import { useEffect, useMemo, useState } from 'react';
import { SectionCard } from '../../components/section-card';
import { api } from '../../lib/api';

type DebtorMonth = {
  periodYear: number;
  periodMonth: number;
  label: string;
  category: string;
  amount: number;
  overdue: boolean;
  isCurrentMonth: boolean;
};

type Debtor = {
  id: string;
  matricula: string;
  firstName: string;
  lastName: string;
  category: string;
  status: string;
  phone: string | null;
  debt: number;
  monthsOwed: number;
  owesCurrentMonth: boolean;
  overdueMonthsCount: number;
  overdueMonthLabels: string[];
  debtLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
  debtLevelLabel: string;
  debtColor: 'gray' | 'green' | 'yellow' | 'red';
  months: DebtorMonth[];
};

type MonthlyCollection = {
  month: string;
  total: number;
};

type CategorySummary = {
  category: string;
  active: number;
  inactive: number;
  total: number;
};

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n);
}

const CATEGORY_LABELS: Record<string, string> = {
  SIMPLE: 'Simple',
  DOBLE: 'Doble',
  ESTUDIANTE: 'Estudiante',
  SOCIAL: 'Social',
  MENOR: 'Menor',
  HONOR: 'Honor',
};

const DEBT_BADGE_STYLES: Record<Debtor['debtColor'], string> = {
  gray: 'bg-slate-100 text-slate-700 border-slate-200',
  green: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  yellow: 'bg-amber-100 text-amber-700 border-amber-200',
  red: 'bg-rose-100 text-rose-700 border-rose-200',
};

export default function ReportsPage() {
  const [tab, setTab] = useState<'deudores' | 'recaudacion' | 'categorias'>(
    'deudores',
  );
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [monthly, setMonthly] = useState<MonthlyCollection[]>([]);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryValues, setCategoryValues] = useState<Record<string, string>>(
    {},
  );

  useEffect(() => {
    setLoading(true);

    Promise.all([
      api.get<Debtor[]>('/reports/debtors'),
      api.get<MonthlyCollection[]>('/reports/monthly-collection'),
      api.get<CategorySummary[]>('/reports/members-by-category'),
    ])
      .then(([d, m, c]) => {
        setDebtors(d);
        setMonthly(m);
        setCategories(c);

        setCategoryValues((prev) => {
          const next = { ...prev };
          for (const category of c) {
            if (next[category.category] === undefined) {
              next[category.category] = '';
            }
          }
          return next;
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const totalDebt = debtors.reduce((sum, debtor) => sum + debtor.debt, 0);
  const totalCollected = monthly.reduce((sum, item) => sum + item.total, 0);

  const categoryCalculationRows = useMemo(() => {
    return categories.map((category) => {
      const unitValue = Number(categoryValues[category.category] || 0);
      const totalValue = unitValue * category.total;

      return {
        category: category.category,
        totalMembers: category.total,
        unitValue,
        totalValue,
      };
    });
  }, [categories, categoryValues]);

  const totalCategoryProjection = useMemo(() => {
    return categoryCalculationRows.reduce(
      (sum, row) => sum + row.totalValue,
      0,
    );
  }, [categoryCalculationRows]);

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        {(['deudores', 'recaudacion', 'categorias'] as const).map((tabKey) => (
          <button
            key={tabKey}
            type="button"
            onClick={() => setTab(tabKey)}
            className={`rounded-2xl px-5 py-3 text-sm font-semibold capitalize transition ${
              tab === tabKey
                ? 'bg-accent text-white'
                : 'bg-ink/10 text-ink/70 hover:bg-ink/20'
            }`}
          >
            {tabKey === 'deudores'
              ? 'Socios deudores'
              : tabKey === 'recaudacion'
                ? 'Recaudación'
                : 'Por categoría'}
          </button>
        ))}
      </div>

      {loading ? (
        <SectionCard title="Reportes" description="Cargando información">
          <div className="py-8 text-sm text-ink/60">Cargando reportes...</div>
        </SectionCard>
      ) : (
        <>
          {tab === 'deudores' && (
            <SectionCard
              title="Socios deudores"
              description="La deuda se recalcula con el valor vigente actual de la categoría que correspondía en cada mes adeudado."
            >
              <div className="mb-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-ink/10 bg-ink/5 p-4">
                  <div className="text-xs uppercase tracking-wide text-ink/50">
                    Total socios deudores
                  </div>
                  <div className="mt-2 text-2xl font-bold text-ink">
                    {debtors.length}
                  </div>
                </div>
                <div className="rounded-2xl border border-ink/10 bg-ink/5 p-4">
                  <div className="text-xs uppercase tracking-wide text-ink/50">
                    Deuda total estimada
                  </div>
                  <div className="mt-2 text-2xl font-bold text-ink">
                    {fmt(totalDebt)}
                  </div>
                </div>
              </div>

              {debtors.length === 0 ? (
                <div className="py-8 text-sm text-ink/60">
                  No hay socios deudores.
                </div>
              ) : (
                <div className="space-y-4">
                  {debtors.map((debtor) => (
                    <div
                      key={debtor.id}
                      className="rounded-2xl border border-ink/10 p-4"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-lg font-semibold text-ink">
                              {debtor.lastName}, {debtor.firstName}
                            </div>
                            <span className="rounded-xl border border-ink/10 px-2 py-1 text-xs font-semibold text-ink/70">
                              {debtor.matricula}
                            </span>
                            <span
                              className={`rounded-xl border px-2 py-1 text-xs font-semibold ${DEBT_BADGE_STYLES[debtor.debtColor]}`}
                            >
                              {debtor.debtLevelLabel}
                            </span>
                          </div>

                          <div className="text-sm text-ink/70">
                            Categoría actual:{' '}
                            <span className="font-medium text-ink">
                              {CATEGORY_LABELS[debtor.category] ?? debtor.category}
                            </span>
                          </div>

                          <div className="text-sm text-ink/70">
                            Celular:{' '}
                            <span className="font-medium text-ink">
                              {debtor.phone ?? '-'}
                            </span>
                          </div>

                          <div className="text-sm text-ink/70">
                            Mes actual adeudado:{' '}
                            <span className="font-medium text-ink">
                              {debtor.owesCurrentMonth ? 'Sí' : 'No'}
                            </span>
                          </div>

                          <div className="text-sm text-ink/70">
                            Meses vencidos impagos:{' '}
                            <span className="font-medium text-ink">
                              {debtor.overdueMonthsCount === 0
                                ? 'Ninguno'
                                : `${debtor.overdueMonthsCount} — ${debtor.overdueMonthLabels.join(', ')}`}
                            </span>
                          </div>
                        </div>

                        <div className="rounded-2xl bg-ink/5 px-4 py-3 text-right">
                          <div className="text-xs uppercase tracking-wide text-ink/50">
                            Deuda total
                          </div>
                          <div className="mt-1 text-2xl font-bold text-ink">
                            {fmt(debtor.debt)}
                          </div>
                          <div className="mt-1 text-sm text-ink/60">
                            {debtor.monthsOwed} mes
                            {debtor.monthsOwed !== 1 ? 'es' : ''} adeudado
                            {debtor.monthsOwed !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 overflow-x-auto">
                        <table className="min-w-full border-separate border-spacing-y-2">
                          <thead>
                            <tr className="text-left text-xs uppercase tracking-wide text-ink/50">
                              <th className="px-3 py-2">Mes</th>
                              <th className="px-3 py-2">Categoría del mes</th>
                              <th className="px-3 py-2">Situación</th>
                              <th className="px-3 py-2">Monto actualizado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {debtor.months.map((month) => (
                              <tr
                                key={`${debtor.id}-${month.periodYear}-${month.periodMonth}`}
                                className="rounded-2xl bg-ink/5 text-sm"
                              >
                                <td className="rounded-l-2xl px-3 py-3 text-ink">
                                  {month.label}
                                </td>
                                <td className="px-3 py-3 text-ink/80">
                                  {CATEGORY_LABELS[month.category] ?? month.category}
                                </td>
                                <td className="px-3 py-3 text-ink/80">
                                  {month.isCurrentMonth
                                    ? 'Debe mes actual'
                                    : 'Mes vencido impago'}
                                </td>
                                <td className="rounded-r-2xl px-3 py-3 font-semibold text-ink">
                                  {fmt(month.amount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          )}

          {tab === 'recaudacion' && (
            <SectionCard
              title="Recaudación mensual"
              description="Totales agrupados por período imputado de cobro."
            >
              <div className="mb-6 rounded-2xl border border-ink/10 bg-ink/5 p-4">
                <div className="text-xs uppercase tracking-wide text-ink/50">
                  Total recaudado
                </div>
                <div className="mt-2 text-2xl font-bold text-ink">
                  {fmt(totalCollected)}
                </div>
              </div>

              {monthly.length === 0 ? (
                <div className="py-8 text-sm text-ink/60">
                  Sin pagos registrados todavía.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-y-2">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-ink/50">
                        <th className="px-3 py-2">Mes</th>
                        <th className="px-3 py-2">Total recaudado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthly.map((item) => (
                        <tr
                          key={item.month}
                          className="rounded-2xl bg-ink/5 text-sm"
                        >
                          <td className="rounded-l-2xl px-3 py-3 text-ink">
                            {item.month}
                          </td>
                          <td className="rounded-r-2xl px-3 py-3 font-semibold text-ink">
                            {fmt(item.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          )}

          {tab === 'categorias' && (
            <SectionCard
              title="Socios por categoría"
              description="Distribución actual de socios activos e inactivos, más cálculo de proyección por valor unitario."
            >
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-2">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-ink/50">
                      <th className="px-3 py-2">Categoría</th>
                      <th className="px-3 py-2">Activos</th>
                      <th className="px-3 py-2">Inactivos</th>
                      <th className="px-3 py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((category) => (
                      <tr
                        key={category.category}
                        className="rounded-2xl bg-ink/5 text-sm"
                      >
                        <td className="rounded-l-2xl px-3 py-3 text-ink">
                          {CATEGORY_LABELS[category.category] ?? category.category}
                        </td>
                        <td className="px-3 py-3 text-ink/80">
                          {category.active}
                        </td>
                        <td className="px-3 py-3 text-ink/80">
                          {category.inactive}
                        </td>
                        <td className="rounded-r-2xl px-3 py-3 font-semibold text-ink">
                          {category.total}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-8 rounded-2xl border border-ink/10 bg-white p-4">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-ink">
                    Cálculo por valor unitario
                  </h3>
                  <p className="mt-1 text-sm text-ink/60">
                    Ingresá un valor por categoría y el sistema calculará el
                    producto de ese valor por la cantidad total de socios de la
                    categoría.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-y-2">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-ink/50">
                        <th className="px-3 py-2">Categoría</th>
                        <th className="px-3 py-2">Socios</th>
                        <th className="px-3 py-2">Valor unitario</th>
                        <th className="px-3 py-2">Resultado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryCalculationRows.map((row) => (
                        <tr
                          key={`calc-${row.category}`}
                          className="rounded-2xl bg-ink/5 text-sm"
                        >
                          <td className="rounded-l-2xl px-3 py-3 text-ink">
                            {CATEGORY_LABELS[row.category] ?? row.category}
                          </td>
                          <td className="px-3 py-3 text-ink/80">
                            {row.totalMembers}
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={categoryValues[row.category] ?? ''}
                              onChange={(e) =>
                                setCategoryValues((prev) => ({
                                  ...prev,
                                  [row.category]: e.target.value,
                                }))
                              }
                              className="w-full rounded-xl border border-ink/10 px-3 py-2 text-sm"
                              placeholder="0"
                            />
                          </td>
                          <td className="rounded-r-2xl px-3 py-3 font-semibold text-ink">
                            {fmt(row.totalValue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="text-sm">
                        <td
                          colSpan={3}
                          className="px-3 py-4 text-right font-semibold text-ink"
                        >
                          Total general
                        </td>
                        <td className="px-3 py-4 text-left text-lg font-bold text-accent">
                          {fmt(totalCategoryProjection)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </SectionCard>
          )}
        </>
      )}
    </div>
  );
}
