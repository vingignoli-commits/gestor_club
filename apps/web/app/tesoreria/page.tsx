'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { SectionCard } from '../../components/section-card';
import { api } from '../../lib/api';

type Payment = {
  id: string;
  memberId: string;
  amount: number;
  paidAt: string;
  methodCode: string;
  status: string;
  periodYear: number;
  periodMonth: number;
  notes: string | null;
  receiptUrl: string | null;
  receiptNote: string | null;
  member: {
    firstName: string;
    lastName: string;
    matricula: string;
    category: string;
  };
};

type Member = {
  id: string;
  firstName: string;
  lastName: string;
  matricula: string;
  category: string;
};

type MonthlyRate = {
  category: string;
  amount: number;
  validFrom: string | null;
  validTo: string | null;
};

type CashTransaction = {
  id: string;
  direction: 'IN' | 'OUT';
  amount: number;
  description: string;
  occurredAt: string;
  methodCode: string | null;
  incomeType: string | null;
  expenseType: string | null;
  receiptUrl: string | null;
  receiptNote: string | null;
  notes: string | null;
  status: 'REGISTERED' | 'VOID';
};

type CashSummary = {
  totalIn: number;
  totalOut: number;
  balance: number;
  transactions: CashTransaction[];
};

type MemberDebtMonth = {
  periodYear: number;
  periodMonth: number;
  label: string;
  category: string;
  amount: number;
  overdue: boolean;
  isCurrentMonth: boolean;
};

type MemberAccountStatement = {
  member: {
    id: string;
    matricula: string;
    firstName: string;
    lastName: string;
    category: string;
    status: string;
  };
  summary: {
    totalDebt: number;
    monthsOwed: number;
    owesCurrentMonth: boolean;
    overdueMonthsCount: number;
    overdueMonthLabels: string[];
    debtLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
    debtLevelLabel: string;
    debtColor: 'gray' | 'green' | 'yellow' | 'red';
    months: MemberDebtMonth[];
  };
};

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n);
}

function monthInputDefault() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatDate(value: string) {
  return value.slice(0, 10).split('-').reverse().join('/');
}

function debtBadgeClasses(color: 'gray' | 'green' | 'yellow' | 'red') {
  if (color === 'green') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (color === 'yellow') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (color === 'red') return 'border-rose-200 bg-rose-50 text-rose-700';
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function memberDisplayName(member: Member) {
  return `${member.lastName}, ${member.firstName} — ${member.matricula}`;
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

function incomeLabel(value: string | null) {
  const labels: Record<string, string> = {
    MEMBERSHIP: 'Cuota',
    SALE: 'Venta',
    DONATION: 'Donación',
    TRAINING: 'Capacitación',
    OTHER: 'Otro ingreso',
  };

  return labels[value ?? 'OTHER'] ?? 'Otro ingreso';
}

function expenseLabel(value: string | null) {
  const labels: Record<string, string> = {
    GRAN_LOGIA: 'Cuota GRAN LOGIA',
    CIVIL_ARMONIA: 'Cuota Civil Armonía',
    SUPPLIES: 'Insumos',
    SERVICES: 'Servicios',
    SALARY: 'Salario',
    MAINTENANCE: 'Mantenimiento',
    OTHER: 'Otro egreso',
  };

  return labels[value ?? 'OTHER'] ?? 'Otro egreso';
}

export default function TreasuryPage() {
  const [tab, setTab] = useState<'pagos' | 'movimientos'>('pagos');

  const [payments, setPayments] = useState<Payment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [rates, setRates] = useState<MonthlyRate[]>([]);
  const [cashSummary, setCashSummary] = useState<CashSummary | null>(null);

  const [memberStatement, setMemberStatement] =
    useState<MemberAccountStatement | null>(null);

  const [loading, setLoading] = useState(true);
  const [savingPayment, setSavingPayment] = useState(false);
  const [savingCash, setSavingCash] = useState(false);
  const [savingRate, setSavingRate] = useState<string | null>(null);

  const [error, setError] = useState('');
  const [errorCash, setErrorCash] = useState('');
  const [errorRate, setErrorRate] = useState('');

  const [memberSearch, setMemberSearch] = useState('');
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);
  const memberDropdownRef = useRef<HTMLDivElement | null>(null);

  const [form, setForm] = useState({
    memberId: '',
    amount: '',
    paidAt: new Date().toISOString().split('T')[0],
    period: monthInputDefault(),
    methodCode: 'EFECTIVO',
    receiptUrl: '',
    receiptNote: '',
    notes: '',
  });

  const [cashForm, setCashForm] = useState({
    direction: 'IN' as 'IN' | 'OUT',
    amount: '',
    description: '',
    occurredAt: new Date().toISOString().split('T')[0],
    incomeType: 'OTHER',
    expenseType: 'OTHER',
    methodCode: 'EFECTIVO',
    receiptUrl: '',
    receiptNote: '',
    notes: '',
  });

  const [rateDrafts, setRateDrafts] = useState<Record<string, string>>({});

  async function loadAll() {
    const [p, m, r, c] = await Promise.all([
      api.get<Payment[]>('/payments'),
      api.get<Member[]>('/members'),
      api.get<MonthlyRate[]>('/monthly-rates'),
      api.get<CashSummary>('/cash/summary'),
    ]);

    setPayments(p);
    setMembers(
      [...m].sort((a, b) =>
        `${a.lastName} ${a.firstName}`.localeCompare(
          `${b.lastName} ${b.firstName}`,
          'es',
          { sensitivity: 'base' },
        ),
      ),
    );
    setRates(r);
    setCashSummary(c);

    const nextDrafts: Record<string, string> = {};
    for (const rate of r) {
      nextDrafts[rate.category] = String(rate.amount);
    }
    setRateDrafts(nextDrafts);
  }

  useEffect(() => {
    loadAll().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        memberDropdownRef.current &&
        !memberDropdownRef.current.contains(event.target as Node)
      ) {
        setMemberDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedMember = useMemo(
    () => members.find((m) => m.id === form.memberId) ?? null,
    [members, form.memberId],
  );

  const selectedRate = useMemo(() => {
    if (!selectedMember) return null;
    return rates.find((r) => r.category === selectedMember.category) ?? null;
  }, [rates, selectedMember]);

  const filteredMembers = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();
    if (!query) return members;

    return members.filter((member) =>
      memberDisplayName(member).toLowerCase().includes(query),
    );
  }, [members, memberSearch]);

  const duplicateMonthPayment = useMemo(() => {
    if (!form.memberId || !form.period) return null;

    const [year, month] = form.period.split('-').map(Number);

    return (
      payments.find(
        (payment) =>
          payment.memberId === form.memberId &&
          payment.status === 'REGISTERED' &&
          payment.periodYear === year &&
          payment.periodMonth === month,
      ) ?? null
    );
  }, [form.memberId, form.period, payments]);

  useEffect(() => {
    if (!selectedMember) {
      setForm((prev) => ({ ...prev, amount: '' }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      amount: selectedRate ? String(selectedRate.amount) : '',
    }));
  }, [selectedMember?.id, selectedMember?.category, selectedRate?.amount]);

  useEffect(() => {
    if (selectedMember) {
      setMemberSearch(memberDisplayName(selectedMember));
    }
  }, [selectedMember]);

  useEffect(() => {
    if (!form.memberId) {
      setMemberStatement(null);
      return;
    }

    api
      .get<MemberAccountStatement>(`/members/${form.memberId}/account-statement`)
      .then(setMemberStatement)
      .catch(() => setMemberStatement(null));
  }, [form.memberId, payments]);

  function handleSelectMember(member: Member) {
    setForm((prev) => ({ ...prev, memberId: member.id }));
    setMemberSearch(memberDisplayName(member));
    setMemberDropdownOpen(false);
  }

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (duplicateMonthPayment) {
      setError(
        `El mes ${String(duplicateMonthPayment.periodMonth).padStart(2, '0')}/${duplicateMonthPayment.periodYear} ya fue cargado para este H.·.`,
      );
      return;
    }

    setSavingPayment(true);

    try {
      const [year, month] = form.period.split('-').map(Number);

      await api.post('/payments', {
        memberId: form.memberId,
        amount: Number(form.amount),
        paidAt: form.paidAt,
        periodYear: year,
        periodMonth: month,
        methodCode: form.methodCode,
        receiptUrl: form.receiptUrl.trim() || undefined,
        receiptNote: form.receiptNote.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });

      setForm({
        memberId: '',
        amount: '',
        paidAt: new Date().toISOString().split('T')[0],
        period: monthInputDefault(),
        methodCode: 'EFECTIVO',
        receiptUrl: '',
        receiptNote: '',
        notes: '',
      });
      setMemberSearch('');
      setMemberStatement(null);

      const [p, c] = await Promise.all([
        api.get<Payment[]>('/payments'),
        api.get<CashSummary>('/cash/summary'),
      ]);

      setPayments(p);
      setCashSummary(c);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar pago');
    } finally {
      setSavingPayment(false);
    }
  }

  async function handleCash(e: React.FormEvent) {
    e.preventDefault();
    setErrorCash('');
    setSavingCash(true);

    try {
      await api.post('/cash', {
        direction: cashForm.direction,
        amount: Number(cashForm.amount),
        description: cashForm.description.trim(),
        occurredAt: cashForm.occurredAt,
        methodCode: cashForm.methodCode,
        incomeType: cashForm.direction === 'IN' ? cashForm.incomeType : undefined,
        expenseType: cashForm.direction === 'OUT' ? cashForm.expenseType : undefined,
        receiptUrl: cashForm.receiptUrl.trim() || undefined,
        receiptNote: cashForm.receiptNote.trim() || undefined,
        notes: cashForm.notes.trim() || undefined,
      });

      setCashForm({
        direction: 'IN',
        amount: '',
        description: '',
        occurredAt: new Date().toISOString().split('T')[0],
        incomeType: 'OTHER',
        expenseType: 'OTHER',
        methodCode: 'EFECTIVO',
        receiptUrl: '',
        receiptNote: '',
        notes: '',
      });

      const c = await api.get<CashSummary>('/cash/summary');
      setCashSummary(c);
    } catch (err: unknown) {
      setErrorCash(
        err instanceof Error ? err.message : 'Error al registrar movimiento',
      );
    } finally {
      setSavingCash(false);
    }
  }

  async function handleRateSave(category: string) {
    setErrorRate('');
    setSavingRate(category);

    try {
      await api.put('/monthly-rates', {
        category,
        amount: Number(rateDrafts[category] || 0),
        validFrom: new Date().toISOString(),
      });

      const updatedRates = await api.get<MonthlyRate[]>('/monthly-rates');
      setRates(updatedRates);

      const nextDrafts: Record<string, string> = {};
      for (const rate of updatedRates) {
        nextDrafts[rate.category] = String(rate.amount);
      }
      setRateDrafts(nextDrafts);
    } catch (err: unknown) {
      setErrorRate(
        err instanceof Error ? err.message : 'Error al actualizar tarifa',
      );
    } finally {
      setSavingRate(null);
    }
  }

  const recentCashTransactions = useMemo(() => {
    return (cashSummary?.transactions ?? []).slice(0, 12);
  }, [cashSummary]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setTab('pagos')}
          className={`rounded-2xl px-5 py-3 text-sm font-semibold ${
            tab === 'pagos'
              ? 'bg-accent text-white'
              : 'bg-ink/10 text-ink/70 hover:bg-ink/20'
          }`}
        >
          Cobro de cuotas
        </button>

        <button
          type="button"
          onClick={() => setTab('movimientos')}
          className={`rounded-2xl px-5 py-3 text-sm font-semibold ${
            tab === 'movimientos'
              ? 'bg-accent text-white'
              : 'bg-ink/10 text-ink/70 hover:bg-ink/20'
          }`}
        >
          Ingresos / Egresos
        </button>
      </div>

      {tab === 'pagos' && (
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <SectionCard
            title="Registrar cobro de cuota"
            description="El monto se carga automáticamente según la categoría del H.·., pero puede ajustarse manualmente. También permite cargar comprobante."
          >
            <form onSubmit={handlePayment} className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2" ref={memberDropdownRef}>
                <label className="mb-2 block text-sm font-medium text-ink/80">
                  H.·.
                </label>

                <div className="relative">
                  <input
                    value={memberSearch}
                    onChange={(e) => {
                      setMemberSearch(e.target.value);
                      setMemberDropdownOpen(true);
                      setForm((prev) => ({ ...prev, memberId: '' }));
                    }}
                    onFocus={() => setMemberDropdownOpen(true)}
                    placeholder="Buscar por apellido, nombre o matrícula"
                    required
                    className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
                  />

                  {memberDropdownOpen && (
                    <div className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-ink/10 bg-white shadow-lg">
                      {filteredMembers.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-ink/60">
                          Sin resultados.
                        </div>
                      ) : (
                        filteredMembers.map((member) => (
                          <button
                            key={member.id}
                            type="button"
                            onClick={() => handleSelectMember(member)}
                            className="block w-full border-b border-ink/5 px-4 py-3 text-left text-sm text-ink hover:bg-ink/5 last:border-b-0"
                          >
                            {memberDisplayName(member)}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {memberStatement && (
                <div className="md:col-span-2 space-y-3 rounded-2xl border border-ink/10 bg-ink/5 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-ink">
                      Situación del H.·.:
                    </span>
                    <span
                      className={`rounded-xl border px-2 py-1 text-xs font-semibold ${debtBadgeClasses(
                        memberStatement.summary.debtColor,
                      )}`}
                    >
                      {memberStatement.summary.debtLevelLabel}
                    </span>
                  </div>

                  <div className="text-sm text-ink/70">
                    {memberStatement.summary.monthsOwed === 0 ? (
                      'No registra meses adeudados.'
                    ) : (
                      <>
                        Meses que adeuda:{' '}
                        <span className="font-medium text-ink">
                          {memberStatement.summary.months
                            .map((month) => month.label)
                            .join(', ')}
                        </span>
                      </>
                    )}
                  </div>

                  {memberStatement.summary.monthsOwed > 0 && (
                    <div className="text-sm text-ink/70">
                      Deuda estimada actual:{' '}
                      <span className="font-medium text-ink">
                        {fmt(memberStatement.summary.totalDebt)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {duplicateMonthPayment && (
                <div className="md:col-span-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Atención: el mes{' '}
                  <span className="font-semibold">
                    {String(duplicateMonthPayment.periodMonth).padStart(2, '0')}/
                    {duplicateMonthPayment.periodYear}
                  </span>{' '}
                  ya fue cargado para este H.·.
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-ink/80">
                  Categoría
                </label>
                <input
                  value={selectedMember ? categoryLabel(selectedMember.category) : ''}
                  readOnly
                  className="w-full rounded-2xl border border-ink/10 bg-ink/5 px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-ink/80">
                  Monto
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, amount: e.target.value }))
                  }
                  required
                  className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-ink/80">
                  Fecha de cobro
                </label>
                <input
                  type="date"
                  value={form.paidAt}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, paidAt: e.target.value }))
                  }
                  required
                  className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-ink/80">
                  Mes al que corresponde
                </label>
                <input
                  type="month"
                  value={form.period}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, period: e.target.value }))
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
                  value={form.methodCode}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, methodCode: e.target.value }))
                  }
                  className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
                >
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                  <option value="DEBITO">Débito</option>
                  <option value="CREDITO">Crédito</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-ink/80">
                  URL comprobante
                </label>
                <input
                  value={form.receiptUrl}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, receiptUrl: e.target.value }))
                  }
                  placeholder="https://..."
                  className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-ink/80">
                  Nota comprobante
                </label>
                <input
                  value={form.receiptNote}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, receiptNote: e.target.value }))
                  }
                  placeholder="Ej: transferencia enviada por WhatsApp"
                  className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-ink/80">
                  Nota interna
                </label>
                <input
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
                  placeholder="Observaciones"
                />
              </div>

              {error && (
                <div className="md:col-span-2 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={
                    savingPayment || Boolean(duplicateMonthPayment) || !form.memberId
                  }
                  className="rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {savingPayment ? 'Registrando...' : 'Registrar pago'}
                </button>
              </div>
            </form>
          </SectionCard>

          <SectionCard
            title="Valores por categoría"
            description="Cada actualización genera una nueva vigencia histórica."
          >
            <div className="space-y-4">
              {rates.map((rate) => (
                <div
                  key={rate.category}
                  className="grid gap-3 rounded-2xl border border-ink/10 p-4 md:grid-cols-[1fr_1fr_auto]"
                >
                  <div>
                    <div className="text-sm font-semibold text-ink">
                      {categoryLabel(rate.category)}
                    </div>
                    <div className="text-xs text-ink/60">
                      Vigente desde{' '}
                      {rate.validFrom ? formatDate(rate.validFrom) : '-'}
                    </div>
                  </div>

                  <input
                    type="number"
                    value={rateDrafts[rate.category] ?? ''}
                    onChange={(e) =>
                      setRateDrafts((prev) => ({
                        ...prev,
                        [rate.category]: e.target.value,
                      }))
                    }
                    className="rounded-2xl border border-ink/10 px-4 py-3 text-sm"
                  />

                  <button
                    type="button"
                    onClick={() => handleRateSave(rate.category)}
                    disabled={savingRate === rate.category}
                    className="rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {savingRate === rate.category ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              ))}

              {errorRate && (
                <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorRate}
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Pagos registrados"
            description="Historial reciente de cobros, con comprobantes asociados."
            className="xl:col-span-2"
          >
            {loading ? (
              <div className="py-8 text-sm text-ink/60">Cargando...</div>
            ) : payments.length === 0 ? (
              <div className="py-8 text-sm text-ink/60">
                Sin pagos registrados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-2">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-ink/50">
                      <th className="px-3 py-2">Fecha</th>
                      <th className="px-3 py-2">H.·.</th>
                      <th className="px-3 py-2">Período</th>
                      <th className="px-3 py-2">Monto</th>
                      <th className="px-3 py-2">Método</th>
                      <th className="px-3 py-2">Comprobante</th>
                      <th className="px-3 py-2">Estado</th>
                    </tr>
                  </thead>

                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id} className="rounded-2xl bg-ink/5 text-sm">
                        <td className="rounded-l-2xl px-3 py-3 text-ink">
                          {formatDate(payment.paidAt)}
                        </td>
                        <td className="px-3 py-3 text-ink">
                          <div className="font-semibold">
                            {payment.member?.lastName}, {payment.member?.firstName}
                          </div>
                          <div className="text-xs text-ink/50">
                            {payment.member?.matricula}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-ink/80">
                          {String(payment.periodMonth).padStart(2, '0')}/
                          {payment.periodYear}
                        </td>
                        <td className="px-3 py-3 font-semibold text-ink">
                          {fmt(Number(payment.amount))}
                        </td>
                        <td className="px-3 py-3 text-ink/80">
                          {payment.methodCode}
                        </td>
                        <td className="px-3 py-3 text-ink/80">
                          {payment.receiptUrl ? (
                            <a
                              href={payment.receiptUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="font-semibold text-accent underline underline-offset-4"
                            >
                              Ver
                            </a>
                          ) : payment.receiptNote ? (
                            payment.receiptNote
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="rounded-r-2xl px-3 py-3">
                          {payment.status === 'REGISTERED' ? (
                            <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                              Registrado
                            </span>
                          ) : (
                            <span className="rounded-xl border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700">
                              Anulado
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {tab === 'movimientos' && (
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <SectionCard
            title="Registrar ingreso / egreso"
            description="Carga manual de movimientos de caja no asociados directamente al cobro de cuotas."
          >
            <form onSubmit={handleCash} className="grid gap-4 md:grid-cols-2">
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
                  Nota interna
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

              {errorCash && (
                <div className="md:col-span-2 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorCash}
                </div>
              )}

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={savingCash}
                  className="rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {savingCash ? 'Registrando...' : 'Registrar movimiento'}
                </button>
              </div>
            </form>
          </SectionCard>

          <SectionCard
            title="Resumen y últimos movimientos"
            description="Vista rápida de caja desde Tesorería."
          >
            {loading || !cashSummary ? (
              <div className="py-8 text-sm text-ink/60">Cargando caja...</div>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-ink/10 bg-ink/5 p-4">
                    <div className="text-xs uppercase tracking-wide text-ink/50">
                      Ingresos
                    </div>
                    <div className="mt-2 text-xl font-bold text-emerald-700">
                      {fmt(cashSummary.totalIn)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-ink/10 bg-ink/5 p-4">
                    <div className="text-xs uppercase tracking-wide text-ink/50">
                      Egresos
                    </div>
                    <div className="mt-2 text-xl font-bold text-rose-700">
                      {fmt(cashSummary.totalOut)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-accent/20 bg-accent/10 p-4">
                    <div className="text-xs uppercase tracking-wide text-ink/50">
                      Saldo
                    </div>
                    <div className="mt-2 text-xl font-bold text-accent">
                      {fmt(cashSummary.balance)}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {recentCashTransactions.length === 0 ? (
                    <div className="text-sm text-ink/60">
                      Sin movimientos registrados.
                    </div>
                  ) : (
                    recentCashTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className={`rounded-2xl border border-ink/10 p-4 text-sm ${
                          transaction.status === 'VOID'
                            ? 'bg-rose-50 text-ink/50'
                            : 'bg-white'
                        }`}
                      >
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="font-semibold text-ink">
                              {transaction.description}
                            </div>
                            <div className="text-xs text-ink/60">
                              {formatDate(transaction.occurredAt)} ·{' '}
                              {transaction.direction === 'IN'
                                ? incomeLabel(transaction.incomeType)
                                : expenseLabel(transaction.expenseType)}
                            </div>
                            {(transaction.receiptUrl || transaction.receiptNote) && (
                              <div className="mt-2 text-xs text-ink/70">
                                Comprobante:{' '}
                                {transaction.receiptUrl ? (
                                  <a
                                    href={transaction.receiptUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="font-semibold text-accent underline underline-offset-4"
                                  >
                                    Ver
                                  </a>
                                ) : (
                                  transaction.receiptNote
                                )}
                              </div>
                            )}
                          </div>

                          <div
                            className={`font-bold ${
                              transaction.direction === 'IN'
                                ? 'text-emerald-700'
                                : 'text-rose-700'
                            }`}
                          >
                            {transaction.direction === 'IN' ? '+' : '-'}
                            {fmt(Number(transaction.amount))}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      )}
    </div>
  );
}
