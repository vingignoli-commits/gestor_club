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
  direction: string;
  amount: number;
  description: string;
  occurredAt: string;
  incomeType: string | null;
  expenseType: string | null;
  receiptNote: string | null;
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

function debtBadgeClasses(color: 'gray' | 'green' | 'yellow' | 'red') {
  if (color === 'green') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (color === 'yellow') {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  if (color === 'red') {
    return 'border-rose-200 bg-rose-50 text-rose-700';
  }

  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function memberDisplayName(member: Member) {
  return `${member.lastName}, ${member.firstName} — ${member.matricula}`;
}

export default function TreasuryPage() {
  const [tab, setTab] = useState<'pagos' | 'caja'>('pagos');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [rates, setRates] = useState<MonthlyRate[]>([]);
  const [cashData, setCashData] = useState<{
    totalIn: number;
    totalOut: number;
    balance: number;
    transactions: CashTransaction[];
  } | null>(null);

  const [memberStatement, setMemberStatement] =
    useState<MemberAccountStatement | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    notes: '',
  });

  const [cashForm, setCashForm] = useState({
    direction: 'IN',
    amount: '',
    description: '',
    occurredAt: new Date().toISOString().split('T')[0],
    incomeType: 'OTHER',
    expenseType: 'OTHER',
    receiptNote: '',
    methodCode: 'EFECTIVO',
  });

  const [rateDrafts, setRateDrafts] = useState<Record<string, string>>({});

  async function loadAll() {
    const [p, m, c, r] = await Promise.all([
      api.get<Payment[]>('/payments'),
      api.get<Member[]>('/members'),
      api.get<{
        totalIn: number;
        totalOut: number;
        balance: number;
        transactions: CashTransaction[];
      }>('/reports/cash-summary'),
      api.get<MonthlyRate[]>('/monthly-rates'),
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
    setCashData(c);
    setRates(r);

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

    if (!query) {
      return members;
    }

    return members.filter((member) =>
      memberDisplayName(member).toLowerCase().includes(query),
    );
  }, [members, memberSearch]);

  useEffect(() => {
    if (!selectedMember) {
      setForm((prev) => ({
        ...prev,
        amount: '',
      }));
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
        `El mes ${String(duplicateMonthPayment.periodMonth).padStart(2, '0')}/${duplicateMonthPayment.periodYear} ya fue cargado para este socio.`,
      );
      return;
    }

    setSaving(true);

    try {
      const [year, month] = form.period.split('-').map(Number);

      await api.post('/payments', {
        memberId: form.memberId,
        amount: Number(form.amount),
        paidAt: form.paidAt,
        periodYear: year,
        periodMonth: month,
        methodCode: form.methodCode,
        notes: form.notes || undefined,
      });

      setForm({
        memberId: '',
        amount: '',
        paidAt: new Date().toISOString().split('T')[0],
        period: monthInputDefault(),
        methodCode: 'EFECTIVO',
        notes: '',
      });
      setMemberSearch('');
      setMemberStatement(null);

      const [p, c] = await Promise.all([
        api.get<Payment[]>('/payments'),
        api.get<{
          totalIn: number;
          totalOut: number;
          balance: number;
          transactions: CashTransaction[];
        }>('/reports/cash-summary'),
      ]);

      setPayments(p);
      setCashData(c);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar pago');
    } finally {
      setSaving(false);
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
        description: cashForm.description,
        occurredAt: cashForm.occurredAt,
        methodCode: cashForm.methodCode,
        incomeType:
          cashForm.direction === 'IN' ? cashForm.incomeType : undefined,
        expenseType:
          cashForm.direction === 'OUT' ? cashForm.expenseType : undefined,
        receiptNote: cashForm.receiptNote || undefined,
      });

      setCashForm({
        direction: 'IN',
        amount: '',
        description: '',
        occurredAt: new Date().toISOString().split('T')[0],
        incomeType: 'OTHER',
        expenseType: 'OTHER',
        receiptNote: '',
        methodCode: 'EFECTIVO',
      });

      const c = await api.get<{
        totalIn: number;
        totalOut: number;
        balance: number;
        transactions: CashTransaction[];
      }>('/reports/cash-summary');

      setCashData(c);
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

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        {(['pagos', 'caja'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-2xl px-5 py-3 text-sm font-semibold capitalize transition ${
              tab === t
                ? 'bg-accent text-white'
                : 'bg-ink/10 text-ink/70 hover:bg-ink/20'
            }`}
          >
            {t === 'pagos' ? 'Cobro de cuotas' : 'Control de caja'}
          </button>
        ))}
      </div>

      {tab === 'pagos' && (
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <SectionCard
            title="Registrar cobro de cuota"
            description="El monto se carga automáticamente según la categoría del socio, pero puede ajustarse manualmente para beneficios excepcionales."
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
                      Situación del socio:
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
                  ya fue cargado para este socio.
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-ink/80">
                  Categoría
                </label>
                <input
                  value={selectedMember?.category ?? ''}
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
                <p className="mt-2 text-xs text-ink/50">
                  Se completa automáticamente al elegir el socio, pero puede
                  modificarse manualmente si existe un beneficio excepcional.
                </p>
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
                  Nota
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
                  disabled={saving || Boolean(duplicateMonthPayment) || !form.memberId}
                  className="rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {saving ? 'Registrando...' : 'Registrar pago'}
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
                      {rate.category}
                    </div>
                    <div className="text-xs text-ink/60">
                      Vigente desde{' '}
                      {rate.validFrom
                        ? new Date(rate.validFrom).toLocaleDateString('es-AR')
                        : '-'}
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
            description="Historial reciente de cobros."
            className="xl:col-span-2"
          >
            {loading ? (
              <div className="py-8 text-sm text-ink/60">Cargando...</div>
            ) : payments.length === 0 ? (
              <div className="py-8 text-sm text-ink/60">
                Sin pagos registrados.
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-2xl border border-ink/10 px-4 py-3"
                  >
                    <div className="font-semibold text-ink">
                      {p.member?.lastName}, {p.member?.firstName}
                    </div>
                    <div className="text-sm text-ink/70">
                      {fmt(Number(p.amount))} —{' '}
                      {String(p.periodMonth).padStart(2, '0')}/{p.periodYear}
                    </div>
                    <div className="text-xs text-ink/50">
                      {new Date(p.paidAt).toLocaleDateString('es-AR')} —{' '}
                      {p.methodCode}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {tab === 'caja' && (
        <SectionCard
          title="Control de caja"
          description="Registro manual de otros ingresos y egresos."
        >
          <form onSubmit={handleCash} className="grid gap-4 md:grid-cols-2">
            <select
              value={cashForm.direction}
              onChange={(e) =>
                setCashForm((f) => ({ ...f, direction: e.target.value }))
              }
              className="rounded-2xl border border-ink/10 px-4 py-3 text-sm"
            >
              <option value="IN">Ingreso</option>
              <option value="OUT">Egreso</option>
            </select>

            <input
              type="number"
              value={cashForm.amount}
              onChange={(e) =>
                setCashForm((f) => ({ ...f, amount: e.target.value }))
              }
              required
              placeholder="Monto"
              className="rounded-2xl border border-ink/10 px-4 py-3 text-sm"
            />

            <input
              type="date"
              value={cashForm.occurredAt}
              onChange={(e) =>
                setCashForm((f) => ({ ...f, occurredAt: e.target.value }))
              }
              required
              className="rounded-2xl border border-ink/10 px-4 py-3 text-sm"
            />

            <select
              value={cashForm.methodCode}
              onChange={(e) =>
                setCashForm((f) => ({ ...f, methodCode: e.target.value }))
              }
              className="rounded-2xl border border-ink/10 px-4 py-3 text-sm"
            >
              <option value="EFECTIVO">Efectivo</option>
              <option value="TRANSFERENCIA">Transferencia</option>
            </select>

            {cashForm.direction === 'IN' ? (
              <select
                value={cashForm.incomeType}
                onChange={(e) =>
                  setCashForm((f) => ({ ...f, incomeType: e.target.value }))
                }
                className="rounded-2xl border border-ink/10 px-4 py-3 text-sm"
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
                  setCashForm((f) => ({ ...f, expenseType: e.target.value }))
                }
                className="rounded-2xl border border-ink/10 px-4 py-3 text-sm"
              >
                <option value="SUPPLIES">Insumos</option>
                <option value="SERVICES">Servicios</option>
                <option value="SALARY">Salario</option>
                <option value="MAINTENANCE">Mantenimiento</option>
                <option value="OTHER">Otro</option>
              </select>
            )}

            <input
              value={cashForm.description}
              onChange={(e) =>
                setCashForm((f) => ({ ...f, description: e.target.value }))
              }
              required
              placeholder="Descripción"
              className="rounded-2xl border border-ink/10 px-4 py-3 text-sm"
            />

            <input
              value={cashForm.receiptNote}
              onChange={(e) =>
                setCashForm((f) => ({ ...f, receiptNote: e.target.value }))
              }
              placeholder="Comprobante / nota"
              className="rounded-2xl border border-ink/10 px-4 py-3 text-sm"
            />

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

          {loading || !cashData ? (
            <div className="mt-6 text-sm text-ink/60">Cargando...</div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-ink/10 p-4">
                <div className="text-xs text-ink/60">Total ingresos</div>
                <div className="text-xl font-bold">{fmt(cashData.totalIn)}</div>
              </div>
              <div className="rounded-2xl border border-ink/10 p-4">
                <div className="text-xs text-ink/60">Total egresos</div>
                <div className="text-xl font-bold">{fmt(cashData.totalOut)}</div>
              </div>
              <div className="rounded-2xl border border-ink/10 p-4">
                <div className="text-xs text-ink/60">Balance</div>
                <div
                  className={`text-xl font-bold ${
                    cashData.balance >= 0 ? 'text-accent' : 'text-warn'
                  }`}
                >
                  {fmt(cashData.balance)}
                </div>
              </div>
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
}
