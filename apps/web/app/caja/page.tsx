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
  updatedAt?: string;
  methodCode: string | null;
  incomeType: string | null;
  expenseType: string | null;
  receiptUrl: string | null;
  receiptNote: string | null;
  notes: string | null;
  status: 'REGISTERED' | 'VOID';
  voidedAt: string | null;
  voidReason: string | null;
};

type CashPeriodClose = {
  id: string;
  period: string;
  initialBalance: number;
  finalBalance: number;
  closedAt: string;
  notes: string | null;
  createdAt: string;
};

type CashSummary = {
  totalIn: number;
  totalOut: number;
  balance: number;
  transactions: CashTransaction[];
  periodCloses: CashPeriodClose[];
};

type GroupMode = 'month' | 'year' | 'category';

type CashForm = {
  direction: 'IN' | 'OUT';
  amount: string;
  description: string;
  occurredAt: string;
  incomeType: string;
  expenseType: string;
  receiptUrl: string;
  receiptNote: string;
  methodCode: string;
  notes: string;
};

const INCOME_TYPE_LABELS: Record<string, string> = {
  MEMBERSHIP: 'Cuotas',
  SALE: 'Ventas',
  DONATION: 'Donaciones',
  TRAINING: 'Capacitaciones',
  OTHER: 'Otros ingresos',
};

const EXPENSE_TYPE_LABELS: Record<string, string> = {
  GRAN_LOGIA: 'Cuota GRAN LOGIA',
  CIVIL_ARMONIA: 'Cuota Civil Armonía',
  SUPPLIES: 'Insumos',
  SERVICES: 'Servicios',
  SALARY: 'Salarios',
  MAINTENANCE: 'Mantenimiento',
  OTHER: 'Otros egresos',
};

function emptyCashForm(): CashForm {
  return {
    direction: 'IN',
    amount: '',
    description: '',
    occurredAt: new Date().toISOString().split('T')[0],
    incomeType: 'OTHER',
    expenseType: 'OTHER',
    receiptUrl: '',
    receiptNote: '',
    methodCode: 'EFECTIVO',
    notes: '',
  };
}

function fmtMoney(value: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-');

  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

function signedAmount(transaction: CashTransaction) {
  if (transaction.status === 'VOID') return 0;

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
  const [year, month] = transaction.occurredAt.slice(0, 10).split('-');

  if (mode === 'month') {
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1));

    return new Intl.DateTimeFormat('es-AR', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(date);
  }

  if (mode === 'year') {
    return year;
  }

  return categoryLabel(transaction);
}

function isWithinDateRange(
  transaction: CashTransaction,
  dateFrom: string,
  dateTo: string,
) {
  const occurredDate = transaction.occurredAt.slice(0, 10);

  if (dateFrom && occurredDate < dateFrom) return false;
  if (dateTo && occurredDate > dateTo) return false;

  return true;
}

function periodFromDate(value: string) {
  return value.slice(0, 7);
}

export default function CajaPage() {
  const { canEdit } = useAuth();

  const [summary, setSummary] = useState<CashSummary | null>(null);
  const [groupMode, setGroupMode] = useState<GroupMode>('month');
  const [loading, setLoading] = useState(true);
  const [savingCash, setSavingCash] = useState(false);
  const [savingCorrection, setSavingCorrection] = useState(false);
  const [savingClose, setSavingClose] = useState(false);
  const [error, setError] = useState('');

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [cashForm, setCashForm] = useState<CashForm>(emptyCashForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCashForm, setShowCashForm] = useState(false);

  const [voidForm, setVoidForm] = useState({
    transactionId: '',
    reason: '',
  });

  const [correctionForm, setCorrectionForm] = useState({
    actualBalance: '',
    occurredAt: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [periodCloseForm, setPeriodCloseForm] = useState({
    period: new Date().toISOString().slice(0, 7),
    initialBalance: '',
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

  const closedPeriods = useMemo(() => {
    return new Set((summary?.periodCloses ?? []).map((item) => item.period));
  }, [summary]);

  const filteredTransactions = useMemo(() => {
    const transactions = summary?.transactions ?? [];

    return transactions.filter((transaction) =>
      isWithinDateRange(transaction, dateFrom, dateTo),
    );
  }, [summary, dateFrom, dateTo]);

  const filteredTotals = useMemo(() => {
    const activeTransactions = filteredTransactions.filter(
      (transaction) => transaction.status === 'REGISTERED',
    );

    const totalIn = activeTransactions
      .filter((transaction) => transaction.direction === 'IN')
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

    const totalOut = activeTransactions
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

      if (transaction.status === 'REGISTERED') {
        if (transaction.direction === 'IN') {
          current.totalIn += Number(transaction.amount);
        } else {
          current.totalOut += Number(transaction.amount);
        }

        current.balance += signedAmount(transaction);
      }

      current.items.push(transaction);
      groups.set(label, current);
    }

    return Array.from(groups.values()).sort((a, b) =>
      a.label.localeCompare(b.label, 'es', { numeric: true, sensitivity: 'base' }),
    );
  }, [filteredTransactions, groupMode]);

  function openCreateForm() {
    if (!canEdit) return;
    setEditingId(null);
    setCashForm(emptyCashForm());
    setError('');
    setShowCashForm(true);
  }

  function openEditForm(transaction: CashTransaction) {
    if (!canEdit || transaction.status === 'VOID') return;

    setEditingId(transaction.id);
    setCashForm({
      direction: transaction.direction,
      amount: String(transaction.amount),
      description: transaction.description,
      occurredAt: transaction.occurredAt.slice(0, 10),
      incomeType: transaction.incomeType ?? 'OTHER',
      expenseType: transaction.expenseType ?? 'OTHER',
      receiptUrl: transaction.receiptUrl ?? '',
      receiptNote: transaction.receiptNote ?? '',
      methodCode: transaction.methodCode ?? 'EFECTIVO',
      notes: transaction.notes ?? '',
    });
    setError('');
    setShowCashForm(true);
  }

  function closeCashForm() {
    setShowCashForm(false);
    setEditingId(null);
    setCashForm(emptyCashForm());
    setError('');
  }

  async function handleCashSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;

    setError('');
    setSavingCash(true);

    try {
      const payload = {
        direction: cashForm.direction,
        amount: Number(cashForm.amount),
        description: cashForm.description,
        occurredAt: cashForm.occurredAt,
        methodCode: cashForm.methodCode,
        incomeType: cashForm.direction === 'IN' ? cashForm.incomeType : undefined,
        expenseType: cashForm.direction === 'OUT' ? cashForm.expenseType : undefined,
        receiptUrl: cashForm.receiptUrl || undefined,
        receiptNote: cashForm.receiptNote || undefined,
        notes: cashForm.notes || undefined,
      };

      if (editingId) {
        await api.patch(`/cash/${editingId}`, payload);
      } else {
        await api.post('/cash', payload);
      }

      closeCashForm();
      await loadData();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Error al guardar movimiento',
      );
    } finally {
      setSavingCash(false);
    }
  }

  async function handleVoidTransaction(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit || !voidForm.transactionId) return;

    setError('');

    try {
      await api.post(`/cash/${voidForm.transactionId}/void`, {
        reason: voidForm.reason || undefined,
      });

      setVoidForm({
        transactionId: '',
        reason: '',
      });

      await loadData();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Error al anular movimiento',
      );
    }
  }

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

  async function handleClosePeriod(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;

    setError('');
    setSavingClose(true);

    try {
      await api.post('/cash/period-close', {
        period: periodCloseForm.period,
        initialBalance: Number(periodCloseForm.initialBalance),
        notes: periodCloseForm.notes || undefined,
      });

      setPeriodCloseForm({
        period: new Date().toISOString().slice(0, 7),
        initialBalance: '',
        notes: '',
      });

      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cerrar período');
    } finally {
      setSavingClose(false);
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
        description="Control de ingresos, egresos, comprobantes, anulaciones, correcciones y cierres mensuales."
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

            {error && (
              <div className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              {canEdit && (
                <button
                  type="button"
                  onClick={openCreateForm}
                  className="rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-white"
                >
                  + Nuevo movimiento
                </button>
              )}

              <button
                type="button"
                onClick={() => setGroupMode('month')}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
                  groupMode === 'month'
                    ? 'bg-ink text-white'
                    : 'bg-ink/10 text-ink/70'
                }`}
              >
                Mensual
              </button>

              <button
                type="button"
                onClick={() => setGroupMode('year')}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
                  groupMode === 'year'
                    ? 'bg-ink text-white'
                    : 'bg-ink/10 text-ink/70'
                }`}
              >
                Anual
              </button>

              <button
                type="button"
                onClick={() => setGroupMode('category')}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
                  groupMode === 'category'
                    ? 'bg-ink text-white'
                    : 'bg-ink/10 text-ink/70'
                }`}
              >
                Categoría
              </button>
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

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
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
                              <th className="px-3 py-2">Comprobante</th>
                              <th className="px-3 py-2">Estado</th>
                              <th className="px-3 py-2">Monto</th>
                              {canEdit && <th className="px-3 py-2">Acciones</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {group.items.map((transaction) => {
                              const isClosed = closedPeriods.has(
                                periodFromDate(transaction.occurredAt),
                              );
                              const isVoid = transaction.status === 'VOID';

                              return (
                                <tr
                                  key={transaction.id}
                                  className={`rounded-2xl text-sm ${
                                    isVoid ? 'bg-rose-50/70 text-ink/50' : 'bg-ink/5'
                                  }`}
                                >
                                  <td className="rounded-l-2xl px-3 py-3 text-ink">
                                    {formatDate(transaction.occurredAt)}
                                  </td>
                                  <td className="px-3 py-3 text-ink">
                                    <div className={isVoid ? 'line-through' : ''}>
                                      {transaction.description}
                                    </div>
                                    {transaction.notes && (
                                      <div className="mt-1 text-xs text-ink/50">
                                        {transaction.notes}
                                      </div>
                                    )}
                                    {transaction.voidReason && (
                                      <div className="mt-1 text-xs font-semibold text-rose-700">
                                        Motivo anulación: {transaction.voidReason}
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-3 py-3 text-ink/80">
                                    {categoryLabel(transaction)}
                                  </td>
                                  <td className="px-3 py-3 text-ink/80">
                                    {transaction.receiptUrl ? (
                                      <a
                                        href={transaction.receiptUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="font-semibold text-accent underline underline-offset-4"
                                      >
                                        Ver
                                      </a>
                                    ) : transaction.receiptNote ? (
                                      transaction.receiptNote
                                    ) : (
                                      '-'
                                    )}
                                  </td>
                                  <td className="px-3 py-3">
                                    {isVoid ? (
                                      <span className="rounded-xl border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700">
                                        Anulado
                                      </span>
                                    ) : isClosed ? (
                                      <span className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700">
                                        Cerrado
                                      </span>
                                    ) : (
                                      <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                                        Registrado
                                      </span>
                                    )}
                                  </td>
                                  <td
                                    className={`px-3 py-3 font-semibold ${
                                      transaction.direction === 'IN'
                                        ? 'text-emerald-700'
                                        : 'text-rose-700'
                                    } ${isVoid ? 'line-through' : ''}`}
                                  >
                                    {transaction.direction === 'IN' ? '+' : '-'}
                                    {fmtMoney(Number(transaction.amount))}
                                  </td>
                                  {canEdit && (
                                    <td className="rounded-r-2xl px-3 py-3">
                                      <div className="flex flex-col gap-2">
                                        <button
                                          type="button"
                                          onClick={() => openEditForm(transaction)}
                                          disabled={isVoid || isClosed}
                                          className="rounded-xl border border-ink/10 px-3 py-2 text-xs font-semibold disabled:opacity-40"
                                        >
                                          Editar
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setVoidForm({
                                              transactionId: transaction.id,
                                              reason: '',
                                            })
                                          }
                                          disabled={isVoid || isClosed}
                                          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 disabled:opacity-40"
                                        >
                                          Anular
                                        </button>
                                      </div>
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {canEdit && (
                <div className="space-y-6">
                  <SectionCard
                    title="Corrección de caja"
                    description="Ingresá el valor real para agregar automáticamente un ajuste."
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
                          rows={3}
                          className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={savingCorrection}
                        className="w-full rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        {savingCorrection ? 'Registrando...' : 'Registrar corrección'}
                      </button>
                    </form>
                  </SectionCard>

                  <SectionCard
                    title="Cierre mensual"
                    description="Cierra un período e impide nuevas modificaciones sobre ese mes."
                  >
                    <form onSubmit={handleClosePeriod} className="space-y-4">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-ink/80">
                          Período
                        </label>
                        <input
                          type="month"
                          value={periodCloseForm.period}
                          onChange={(e) =>
                            setPeriodCloseForm((prev) => ({
                              ...prev,
                              period: e.target.value,
                            }))
                          }
                          required
                          className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-ink/80">
                          Saldo inicial
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={periodCloseForm.initialBalance}
                          onChange={(e) =>
                            setPeriodCloseForm((prev) => ({
                              ...prev,
                              initialBalance: e.target.value,
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
                          value={periodCloseForm.notes}
                          onChange={(e) =>
                            setPeriodCloseForm((prev) => ({
                              ...prev,
                              notes: e.target.value,
                            }))
                          }
                          rows={3}
                          className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={savingClose}
                        className="w-full rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        {savingClose ? 'Cerrando...' : 'Cerrar período'}
                      </button>
                    </form>

                    <div className="mt-6 space-y-3">
                      <div className="text-sm font-semibold text-ink">
                        Períodos cerrados
                      </div>

                      {(summary.periodCloses ?? []).length === 0 ? (
                        <div className="text-sm text-ink/60">
                          No hay períodos cerrados.
                        </div>
                      ) : (
                        summary.periodCloses.map((close) => (
                          <div
                            key={close.id}
                            className="rounded-2xl border border-ink/10 bg-ink/5 p-3 text-sm"
                          >
                            <div className="font-semibold text-ink">
                              {close.period}
                            </div>
                            <div className="text-ink/70">
                              Inicial: {fmtMoney(Number(close.initialBalance))}
                            </div>
                            <div className="text-ink/70">
                              Final: {fmtMoney(Number(close.finalBalance))}
                            </div>
                            <div className="text-xs text-ink/50">
                              Cerrado: {formatDate(close.closedAt)}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </SectionCard>
                </div>
              )}
            </div>
          </>
        )}
      </SectionCard>

      {canEdit && showCashForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3 py-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-4 shadow-2xl sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-ink/10 pb-4">
              <div>
                <h2 className="text-xl font-bold text-ink sm:text-2xl">
                  {editingId ? 'Editar movimiento' : 'Nuevo movimiento'}
                </h2>
                <p className="mt-1 text-sm text-ink/60">
                  Los movimientos de períodos cerrados no pueden modificarse.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCashForm}
                className="rounded-2xl border border-ink/10 px-4 py-2 text-sm font-semibold text-ink/70 hover:bg-ink/5"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleCashSubmit} className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-ink/80">
                  Tipo
                </label>
                <select
                  value={cashForm.direction}
                  onChange={(e) =>
                    setCashForm((prev) => ({
                      ...prev,
                      direction: e.target.value as 'IN' | 'OUT',
                    }))
                  }
                  className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
                >
                  <option value="IN">Ingreso</option>
                  <option value="OUT">Egreso</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-ink/80">
                  Monto
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={cashForm.amount}
                  onChange={(e) =>
                    setCashForm((prev) => ({ ...prev, amount: e.target.value }))
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
                  value={cashForm.occurredAt}
                  onChange={(e) =>
                    setCashForm((prev) => ({
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
                  Forma de pago
                </label>
                <select
                  value={cashForm.methodCode}
                  onChange={(e) =>
                    setCashForm((prev) => ({
                      ...prev,
                      methodCode: e.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
                >
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                  <option value="DEBITO">Débito</option>
                  <option value="CREDITO">Crédito</option>
                  <option value="AJUSTE">Ajuste</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-ink/80">
                  Categoría
                </label>
                {cashForm.direction === 'IN' ? (
                  <select
                    value={cashForm.incomeType}
                    onChange={(e) =>
                      setCashForm((prev) => ({
                        ...prev,
                        incomeType: e.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
                  >
                    <option value="MEMBERSHIP">Cuota</option>
                    <option value="SALE">Venta</option>
                    <option value="DONATION">Donación</option>
                    <option value="TRAINING">Capacitación</option>
                    <option value="OTHER">Otro</option>
                  </select>
                ) : (
                  <select
                    value={cashForm.expenseType}
                    onChange={(e) =>
                      setCashForm((prev) => ({
                        ...prev,
                        expenseType: e.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
                  >
                    <option value="GRAN_LOGIA">Cuota GRAN LOGIA</option>
                    <option value="CIVIL_ARMONIA">Cuota Civil Armonía</option>
                    <option value="SUPPLIES">Insumos</option>
                    <option value="SERVICES">Servicios</option>
                    <option value="SALARY">Salario</option>
                    <option value="MAINTENANCE">Mantenimiento</option>
                    <option value="OTHER">Otro</option>
                  </select>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-ink/80">
                  URL comprobante
                </label>
                <input
                  value={cashForm.receiptUrl}
                  onChange={(e) =>
                    setCashForm((prev) => ({
                      ...prev,
                      receiptUrl: e.target.value,
                    }))
                  }
                  placeholder="https://..."
                  className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-ink/80">
                  Descripción
                </label>
                <input
                  value={cashForm.description}
                  onChange={(e) =>
                    setCashForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  required
                  className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-ink/80">
                  Nota comprobante
                </label>
                <input
                  value={cashForm.receiptNote}
                  onChange={(e) =>
                    setCashForm((prev) => ({
                      ...prev,
                      receiptNote: e.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-ink/80">
                  Notas internas
                </label>
                <textarea
                  value={cashForm.notes}
                  onChange={(e) =>
                    setCashForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  rows={3}
                  className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
                />
              </div>

              <div className="sticky bottom-0 -mx-4 flex gap-3 border-t border-ink/10 bg-white px-4 py-4 md:col-span-2 sm:-mx-6 sm:px-6">
                <button
                  type="button"
                  onClick={closeCashForm}
                  className="flex-1 rounded-2xl border border-ink/10 px-4 py-3 text-sm font-semibold"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={savingCash}
                  className="flex-1 rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {savingCash
                    ? 'Guardando...'
                    : editingId
                      ? 'Guardar cambios'
                      : 'Guardar movimiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {canEdit && voidForm.transactionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3 py-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl">
            <h2 className="text-xl font-bold text-ink">Anular movimiento</h2>
            <p className="mt-1 text-sm text-ink/60">
              El movimiento no se elimina: queda marcado como anulado y deja de afectar el saldo.
            </p>

            <form onSubmit={handleVoidTransaction} className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-ink/80">
                  Motivo
                </label>
                <textarea
                  value={voidForm.reason}
                  onChange={(e) =>
                    setVoidForm((prev) => ({
                      ...prev,
                      reason: e.target.value,
                    }))
                  }
                  rows={4}
                  className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
                  placeholder="Ej: carga duplicada, error de monto, comprobante incorrecto..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setVoidForm({ transactionId: '', reason: '' })}
                  className="flex-1 rounded-2xl border border-ink/10 px-4 py-3 text-sm font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white"
                >
                  Confirmar anulación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
