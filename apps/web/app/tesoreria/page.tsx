'use client';

import { useEffect, useState } from 'react';
import { SectionCard } from '../../components/section-card';
import { api } from '../../lib/api';

type Payment = {
  id: string;
  amount: number;
  paidAt: string;
  methodCode: string;
  status: string;
  member: { firstName: string; lastName: string; matricula: string };
};

type Member = { id: string; firstName: string; lastName: string; matricula: string };

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

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
}

export default function TreasuryPage() {
  const [tab, setTab] = useState<'pagos' | 'caja'>('pagos');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [cashData, setCashData] = useState<{ totalIn: number; totalOut: number; balance: number; transactions: CashTransaction[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingCash, setSavingCash] = useState(false);
  const [error, setError] = useState('');
  const [errorCash, setErrorCash] = useState('');
  const [form, setForm] = useState({ memberId: '', amount: '', paidAt: new Date().toISOString().split('T')[0], methodCode: 'EFECTIVO', notes: '' });
  const [cashForm, setCashForm] = useState({ direction: 'IN', amount: '', description: '', occurredAt: new Date().toISOString().split('T')[0], incomeType: 'OTHER', expenseType: 'OTHER', receiptNote: '', methodCode: 'EFECTIVO' });

  useEffect(() => {
    Promise.all([
      api.get<Payment[]>('/payments'),
      api.get<Member[]>('/members'),
      api.get<{ totalIn: number; totalOut: number; balance: number; transactions: CashTransaction[] }>('/reports/cash-summary'),
    ]).then(([p, m, c]) => {
      setPayments(p);
      setMembers(m);
      setCashData(c);
    }).finally(() => setLoading(false));
  }, []);

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.post('/payments', {
        memberId: form.memberId,
        amount: Number(form.amount),
        paidAt: form.paidAt,
        methodCode: form.methodCode,
        notes: form.notes,
      });
      setForm({ memberId: '', amount: '', paidAt: new Date().toISOString().split('T')[0], methodCode: 'EFECTIVO', notes: '' });
      const [p, c] = await Promise.all([
        api.get<Payment[]>('/payments'),
        api.get<{ totalIn: number; totalOut: number; balance: number; transactions: CashTransaction[] }>('/reports/cash-summary'),
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
        incomeType: cashForm.direction === 'IN' ? cashForm.incomeType : undefined,
        expenseType: cashForm.direction === 'OUT' ? cashForm.expenseType : undefined,
        receiptNote: cashForm.receiptNote || undefined,
      });
      setCashForm({ direction: 'IN', amount: '', description: '', occurredAt: new Date().toISOString().split('T')[0], incomeType: 'OTHER', expenseType: 'OTHER', receiptNote: '', methodCode: 'EFECTIVO' });
      const c = await api.get<{ totalIn: number; totalOut: number; balance: number; transactions: CashTransaction[] }>('/reports/cash-summary');
      setCashData(c);
    } catch (err: unknown) {
      setErrorCash(err instanceof Error ? err.message : 'Error al registrar movimiento');
    } finally {
      setSavingCash(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        {(['pagos', 'caja'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-2xl px-5 py-3 text-sm font-semibold capitalize transition ${tab === t ? 'bg-accent text-white' : 'bg-ink/10 text-ink/70 hover:bg-ink/20'}`}
          >
            {t === 'pagos' ? 'Cobro de cuotas' : 'Control de caja'}
          </button>
        ))}
      </div>

      {tab === 'pagos' && (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <SectionCard title="Registrar pago de cuota" description="Selecciona el socio y registra el pago.">
            <form onSubmit={handlePayment} className="space-y-3">
              <select className="w-full rounded-2xl border border-ink/10 px-4 py-3" value={form.memberId} onChange={e => setForm(f => ({ ...f, memberId: e.target.value }))} required>
                <option value="">Seleccionar socio</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.matricula} — {m.lastName}, {m.firstName}</option>
                ))}
              </select>
              <div className="grid gap-3 md:grid-cols-2">
                <input className="rounded-2xl border border-ink/10 px-4 py-3" placeholder="Importe" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
                <input className="rounded-2xl border border-ink/10 px-4 py-3" type="date" value={form.paidAt} onChange={e => setForm(f => ({ ...f, paidAt: e.target.value }))} required />
                <select className="rounded-2xl border border-ink/10 px-4 py-3" value={form.methodCode} onChange={e => setForm(f => ({ ...f, methodCode: e.target.value }))}>
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                  <option value="DEBITO">Debito</option>
                  <option value="CREDITO">Credito</option>
                </select>
                <input className="rounded-2xl border border-ink/10 px-4 py-3" placeholder="Notas (opcional)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              {error && <p className="rounded-2xl bg-warn/10 px-4 py-3 text-sm text-warn">{error}</p>}
              <button type="submit" disabled={saving} className="w-full rounded-2xl bg-accent px-5 py-3 font-semibold text-white disabled:opacity-60">
                {saving ? 'Registrando...' : 'Registrar pago'}
              </button>
            </form>
          </SectionCard>

          <SectionCard title="Ultimos pagos" description="Historial de cobros de cuotas.">
            {loading ? <p className="text-sm text-ink/50">Cargando...</p> : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {payments.length === 0 && <p className="text-sm text-ink/50">Sin pagos registrados.</p>}
                {payments.map(p => (
                  <div key={p.id} className="rounded-2xl border border-ink/10 bg-white p-3">
                    <div className="flex justify-between">
                      <p className="font-medium text-sm">{p.member?.lastName}, {p.member?.firstName}</p>
                      <p className="font-semibold text-accent text-sm">{fmt(Number(p.amount))}</p>
                    </div>
                    <p className="text-xs text-ink/50">{new Date(p.paidAt).toLocaleDateString('es-AR')} — {p.methodCode}</p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {tab === 'caja' && (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <SectionCard title="Registrar movimiento de caja" description="Ingresos y egresos de la tesoreria.">
            <form onSubmit={handleCash} className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <select className="rounded-2xl border border-ink/10 px-4 py-3" value={cashForm.direction} onChange={e => setCashForm(f => ({ ...f, direction: e.target.value }))}>
                  <option value="IN">Ingreso</option>
                  <option value="OUT">Egreso</option>
                </select>
                <input className="rounded-2xl border border-ink/10 px-4 py-3" placeholder="Importe" type="number" value={cashForm.amount} onChange={e => setCashForm(f => ({ ...f, amount: e.target.value }))} required />
                <input className="rounded-2xl border border-ink/10 px-4 py-3" type="date" value={cashForm.occurredAt} onChange={e => setCashForm(f => ({ ...f, occurredAt: e.target.value }))} required />
                <select className="rounded-2xl border border-ink/10 px-4 py-3" value={cashForm.methodCode} onChange={e => setCashForm(f => ({ ...f, methodCode: e.target.value }))}>
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                </select>
                {cashForm.direction === 'IN' ? (
                  <select className="rounded-2xl border border-ink/10 px-4 py-3" value={cashForm.incomeType} onChange={e => setCashForm(f => ({ ...f, incomeType: e.target.value }))}>
                    <option value="MEMBERSHIP">Cuota</option>
                    <option value="SALE">Venta</option>
                    <option value="DONATION">Donacion</option>
                    <option value="TRAINING">Capacitacion</option>
                    <option value="OTHER">Otro</option>
                  </select>
                ) : (
                  <select className="rounded-2xl border border-ink/10 px-4 py-3" value={cashForm.expenseType} onChange={e => setCashForm(f => ({ ...f, expenseType: e.target.value }))}>
                    <option value="SUPPLIES">Insumos</option>
                    <option value="SERVICES">Servicios</option>
                    <option value="SALARY">Salario</option>
                    <option value="MAINTENANCE">Mantenimiento</option>
                    <option value="OTHER">Otro</option>
                  </select>
                )}
              </div>
              <input className="w-full rounded-2xl border border-ink/10 px-4 py-3" placeholder="Descripcion *" value={cashForm.description} onChange={e => setCashForm(f => ({ ...f, description: e.target.value }))} required />
              <input className="w-full rounded-2xl border border-ink/10 px-4 py-3" placeholder="Nota de comprobante (opcional)" value={cashForm.receiptNote} onChange={e => setCashForm(f => ({ ...f, receiptNote: e.target.value }))} />
              {errorCash && <p className="rounded-2xl bg-warn/10 px-4 py-3 text-sm text-warn">{errorCash}</p>}
              <button type="submit" disabled={savingCash} className="w-full rounded-2xl bg-accent px-5 py-3 font-semibold text-white disabled:opacity-60">
                {savingCash ? 'Registrando...' : 'Registrar movimiento'}
              </button>
            </form>
          </SectionCard>

          <SectionCard title="Resumen de caja" description="Balance actual de la tesoreria.">
            {loading || !cashData ? <p className="text-sm text-ink/50">Cargando...</p> : (
              <div className="space-y-3">
                <div className="rounded-2xl bg-accent/10 p-4">
                  <p className="text-xs text-ink/50 uppercase tracking-wider">Total ingresos</p>
                  <p className="mt-1 text-2xl font-semibold text-accent">{fmt(cashData.totalIn)}</p>
                </div>
                <div className="rounded-2xl bg-warn/10 p-4">
                  <p className="text-xs text-ink/50 uppercase tracking-wider">Total egresos</p>
                  <p className="mt-1 text-2xl font-semibold text-warn">{fmt(cashData.totalOut)}</p>
                </div>
                <div className="rounded-2xl bg-ink/5 p-4">
                  <p className="text-xs text-ink/50 uppercase tracking-wider">Balance</p>
                  <p className={`mt-1 text-2xl font-semibold ${cashData.balance >= 0 ? 'text-accent' : 'text-warn'}`}>{fmt(cashData.balance)}</p>
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      )}
    </div>
  );
}
