'use client';

import { useEffect, useMemo, useState } from 'react';
import { SectionCard } from '../../components/section-card';
import { useAuth } from '../../context/auth';
import { api } from '../../lib/api';

type CashTransaction = {
  id: string;
  direction: 'IN' | 'OUT';
  amount: number;
  description: string;
  occurredAt: string;
  createdAt: string;
  methodCode: string | null;
  incomeType: string | null;
  expenseType: string | null;
  receiptNote: string | null;
  notes: string | null;
};

type CashSummary = {
  totalIn: number;
  totalOut: number;
  balance: number;
  transactions: CashTransaction[];
};

type GroupMode = 'month' | 'year' | 'category';

const INCOME_TYPE_LABELS: Record<string, string> = {
  MEMBERSHIP: 'Cuotas',
  SALE: 'Ventas',
  DONATION: 'Donaciones',
  TRAINING: 'Capacitaciones',
  OTHER: 'Otros ingresos',
};

const EXPENSE_TYPE_LABELS: Record<string, string> = {
  SUPPLIES: 'Insumos',
  SERVICES: 'Servicios',
  SALARY: 'Salarios',
  MAINTENANCE: 'Mantenimiento',
  OTHER: 'Otros egresos',
};

function fmtMoney(value: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es-AR');
}

function signedAmount(transaction: CashTransaction) {
  return transaction.direction === 'IN'
    ? Number(transaction.amount)
    : -Number(transaction.amount);
}

function categoryLabel(transaction: CashTransaction) {
  if (transaction.direction === 'IN') {
    return INCOME_TYPE_LABELS[transaction.incomeType ?? 'OTHER'] ?? 'Otros ingresos';
  }

  return EXPENSE_TYPE_LABELS[transaction.expenseType ?? 'OTHER'] ?? 'Otros egresos';
}

function groupLabel(transaction: CashTransaction, mode: GroupMode) {
  const date = new Date(transaction.occurredAt);

  if (mode === 'month') {
    return new Intl.DateTimeFormat('es-AR', {
      month: 'long',
      year: 'numeric',
    }).format(date);
  }

  if (mode === 'year') {
    return String(date.getFullYear());
  }

  return categoryLabel(transaction);
}

function isWithinDateRange(
  transaction: CashTransaction,
  dateFrom: string,
  dateTo: string,
) {
  const occurredDate = transaction.occurredAt.slice(0, 10);

  if (dateFrom && occurredDate < dateFrom) {
    return false;
  }

  if (dateTo && occurredDate > dateTo) {
    return false;
  }

  return true;
}

export default function CajaPage() {
  const { canEdit } = useAuth();

  const [summary, setSummary] = useState<CashSummary | null>(null);
  const [groupMode, setGroupMode] = useState<GroupMode>('month');
  const [loading, setLoading] = useState(true);
  const [savingCorrection, setSavingCorrection] = useState(false);
  const [error, setError] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [correctionForm, setCorrectionForm] = useState({
    actualBalance: '',
    occurredAt: new Date().toISOString().split('T')[0],
    notes: '',
  });

  async function loadData() {
    const data = await api.get<CashSummary>('/cash/summary');
    setSummary(data);
  }

  useEffect(() => {
    loadData()
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Error al cargar caja');
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredTransactions = useMemo(() => {
    const transactions = summary?.transactions ?? [];

    return transactions.filter((transaction) =>
      isWithinDateRange(transaction, dateFrom, dateTo),
    );
  }, [summary, dateFrom, dateTo]);

  const filteredTotals = useMemo(() => {
    const totalIn = filteredTransactions
      .filter((transaction) => transaction.direction === 'IN')
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

    const totalOut = filteredTransactions
      .filter((transaction) => transaction.direction === 'OUT')
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

    return {
      totalIn,
      totalOut,
      balance: totalIn - totalOut,
    };
  }, [filteredTransactions]);

  const groupedTransactions = useMemo(() => {
    const groups = new Map<
      string,
      {
        label: string;
        totalIn: number;
        totalOut: number;
        balance: number;
        items: CashTransaction[];
      }
    >();

    for (const transaction of filteredTransactions) {
      const label = groupLabel(transaction, groupMode);
      const current = groups.get(label) ?? {
        label,
        totalIn: 0,
        totalOut: 0,
        balance: 0,
        items: [],
      };

      if (transaction.direction === 'IN') {
        current.totalIn += Number(transaction.amount);
      } else {
        current.totalOut += Number(transaction.amount);
      }

      current.balance += signedAmount(transaction);
      current.items.push(transaction);
      groups.set(label, current);
    }

    return Array.from(groups.values()).sort((a, b) =>
      a.label.localeCompare(b.label, 'es', { numeric: true, sensitivity: 'base' }),
    );
  }, [filteredTransactions, groupMode]);

  async function handleCorrection(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;

    setError('');
    setSavingCorrection(true);

    try {
      await api.post('/cash/correction', {
        actualBalance: Number(correctionForm.actualBalance),
        occurredAt: correctionForm.occurredAt,
        notes: correctionForm.notes || undefined,
      });

      setCorrectionForm({
        actualBalance: '',
        occurredAt: new Date().toISOString().split('T')[0],
        notes: '',
      });

      await loadData();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Error al registrar corrección',
      );
    } finally {
      setSavingCorrection(false);
    }
  }

  function clearDateFilters() {
    setDateFrom('');
    setDateTo('');
  }

  const hasDateFilters = Boolean(dateFrom || dateTo);

  return (
    <div className="space-y-6">
      <SectionCard
        title="Caja"
        description="Control de ingresos y egresos con saldo resaltado, agrupaciones, filtro por fecha y ajuste por valor real."
      >
        {loading || !summary ? (
          <div className="py-8 text-sm text-ink/60">Cargando caja...</div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-ink/10 bg-ink/5 p-4">
                <div className="text-xs uppercase tracking-wide text-ink/50">
                  Ingresos
                </div>
                <div className="mt-2 text-2xl font-bold text-emerald-700">
                  {fmtMoney(filteredTotals.totalIn)}
                </div>
              </div>

              <div className="rounded-2xl border border-ink/10 bg-ink/5 p-4">
                <div className="text-xs uppercase tracking-wide text-ink/50">
                  Egresos
                </div>
                <div className="mt-2 text-2xl font-bold text-rose-700">
                  {fmtMoney(filteredTotals.totalOut)}
                </div>
              </div>

              <div className="rounded-2xl border border-accent/20 bg-accent/10 p-4">
                <div className="text-xs uppercase tracking-wide text-ink/60">
                  Saldo
                </div>
                <div
                  className={`mt-2 text-3xl font-bold ${
                    filteredTotals.balance >= 0 ? 'text-accent' : 'text-rose-700'
                  }`}
                >
                  {fmtMoney(filteredTotals.balance)}
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-ink/10 bg-white p-4">
              <div className="mb-4 text-sm font-semibold text-ink">
                Filtro por fecha
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
                <div>
                  <label className="mb-2 block text-sm font-medium text-ink/80">
                    Desde
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-ink/80">
                    Hasta
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={clearDateFilters}
                    className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm font-semibold text-ink/80"
                  >
                    Limpiar filtro
                  </button>
                </div>
              </div>

              {hasDateFilters && (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Filtro activo:{' '}
                  <span className="font-semibold">
                    {dateFrom ? `desde ${formatDate(dateFrom)}` : ''}
                    {dateFrom && dateTo ? ' ' : ''}
                    {dateTo ? `hasta ${formatDate(dateTo)}` : ''}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold text-ink">Agrupar por:</span>

              <button
                type="button"
                onClick={() => setGroupMode('month')}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                  groupMode === 'month'
                    ? 'bg-accent text-white'
                    : 'bg-ink/10 text-ink/70'
                }`}
              >
                Mensual
              </button>

              <button
                type="button"
                onClick={() => setGroupMode('year')}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                  groupMode === 'year'
                    ? 'bg-accent text-white'
                    : 'bg-ink/10 text-ink/70'
                }`}
              >
                Anual
              </button>

              <button
                type="button"
                onClick={() => setGroupMode('category')}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                  groupMode === 'category'
                    ? 'bg-accent text-white'
                    : 'bg-ink/10 text-ink/70'
                }`}
              >
                Categoría
              </button>
            </div>

            {error && (
              <div className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className={`mt-6 grid gap-6 ${canEdit ? 'xl:grid-cols-[1.3fr_0.7fr]' : ''}`}>
              <div className="space-y-4">
                {groupedTransactions.length === 0 ? (
                  <div className="rounded-2xl border border-ink/10 bg-white p-6 text-sm text-ink/60">
                    No hay movimientos de caja para el filtro actual.
                  </div>
                ) : (
                  groupedTransactions.map((group) => (
                    <div
                      key={group.label}
                      className="rounded-2xl border border-ink/10 bg-white p-4"
                    >
                      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                        <div className="text-lg font-semibold text-ink">
                          {group.label}
                        </div>

                        <div className="flex flex-wrap gap-3 text-sm">
                          <span className="rounded-xl bg-emerald-50 px-3 py-2 font-semibold text-emerald-700">
                            Ingresos: {fmtMoney(group.totalIn)}
                          </span>
                          <span className="rounded-xl bg-rose-50 px-3 py-2 font-semibold text-rose-700">
                            Egresos: {fmtMoney(group.totalOut)}
                          </span>
                          <span className="rounded-xl bg-accent/10 px-3 py-2 font-semibold text-accent">
                            Saldo: {fmtMoney(group.balance)}
                          </span>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="min-w-full border-separate border-spacing-y-2">
                          <thead>
                            <tr className="text-left text-xs uppercase tracking-wide text-ink/50">
                              <th className="px-3 py-2">Fecha</th>
                              <th className="px-3 py-2">Descripción</th>
                              <th className="px-3 py-2">Categoría</th>
                              <th className="px-3 py-2">Monto</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.items.map((transaction) => (
                              <tr
                                key={transaction.id}
                                className="rounded-2xl bg-ink/5 text-sm"
                              >
                                <td className="rounded-l-2xl px-3 py-3 text-ink">
                                  {formatDate(transaction.occurredAt)}
                                </td>
                                <td className="px-3 py-3 text-ink">
                                  {transaction.description}
                                </td>
                                <td className="px-3 py-3 text-ink/80">
                                  {categoryLabel(transaction)}
                                </td>
                                <td
                                  className={`rounded-r-2xl px-3 py-3 font-semibold ${
                                    transaction.direction === 'IN'
                                      ? 'text-emerald-700'
                                      : 'text-rose-700'
                                  }`}
                                >
                                  {transaction.direction === 'IN' ? '+' : '-'}
                                  {fmtMoney(Number(transaction.amount))}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {canEdit && (
                <SectionCard
                  title="Corrección de caja"
                  description="Ingresá el valor real para que el sistema agregue automáticamente un movimiento de corrección de caja."
                >
                  <form onSubmit={handleCorrection} className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-ink/80">
                        Saldo teórico actual
                      </label>
                      <input
                        value={summary ? fmtMoney(summary.balance) : ''}
                        readOnly
                        className="w-full rounded-2xl border border-ink/10 bg-ink/5 px-4 py-3 text-sm"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-ink/80">
                        Valor real
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={correctionForm.actualBalance}
                        onChange={(e) =>
                          setCorrectionForm((prev) => ({
                            ...prev,
                            actualBalance: e.target.value,
                          }))
                        }
                        required
                        className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-ink/80">
                        Fecha
                      </label>
                      <input
                        type="date"
                        value={correctionForm.occurredAt}
                        onChange={(e) =>
                          setCorrectionForm((prev) => ({
                            ...prev,
                            occurredAt: e.target.value,
                          }))
                        }
                        required
                        className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-ink/80">
                        Nota
                      </label>
                      <textarea
                        value={correctionForm.notes}
                        onChange={(e) =>
                          setCorrectionForm((prev) => ({
                            ...prev,
                            notes: e.target.value,
                          }))
                        }
                        rows={4}
                        className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
                        placeholder="Observación opcional"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={savingCorrection}
                      className="w-full rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {savingCorrection
                        ? 'Registrando...'
                        : 'Registrar corrección de caja'}
                    </button>
                  </form>
                </SectionCard>
              )}
            </div>
          </>
        )}
      </SectionCard>
    </div>
  );
}
