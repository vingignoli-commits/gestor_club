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
  member: { firstName: string; lastName: string };
};

type Member = { id: string; firstName: string; lastName: string };

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
}

export default function TreasuryPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ memberId: '', amount: '', paidAt: '', methodCode: 'EFECTIVO', notes: '' });

  useEffect(() => {
    Promise.all([
      api.get<Payment[]>('/payments'),
      api.get<Member[]>('/members'),
    ]).then(([p, m]) => {
      setPayments(p);
      setMembers(m);
    }).finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
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
        allocations: [],
      });
      setForm({ memberId: '', amount: '', paidAt: '', methodCode: 'EFECTIVO', notes: '' });
      const updated = await api.get<Payment[]>('/payments');
      setPayments(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar pago');
    } finally {
      setSaving(false);
    }
  }

  const totalIngresos = payments
    .filter(p => p.status === 'REGISTERED')
    .reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <SectionCard title="Registro de pago" description="Registrá un pago de cuota de un socio.">
        <form onSubmit={handleSubmit} className="space-y-3">
          <select
            className="w-full rounded-2xl border border-ink/10 px-4 py-3"
            value={form.memberId}
            onChange={e => setForm(f => ({ ...f, memberId: e.target.value }))}
            required
          >
            <option value="">Seleccionar socio</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>{m.lastName}, {m.firstName}</option>
            ))}
          </select>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              className="rounded-2xl border border-ink/10 px-4 py-3"
              placeholder="Importe"
              type="number"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              required
            />
            <input
              className="rounded-2xl border border-ink/10 px-4 py-3"
              type="date"
              value={form.paidAt}
              onChange={e => setForm(f => ({ ...f, paidAt: e.target.value }))}
              required
            />
            <select
              className="rounded-2xl border border-ink/10 px-4 py-3"
              value={form.methodCode}
              onChange={e => setForm(f => ({ ...f, methodCode: e.target.value }))}
            >
              <option value="EFECTIVO">Efectivo</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="DEBITO">Débito</option>
              <option value="CREDITO">Crédito</option>
            </select>
            <input
              className="rounded-2xl border border-ink/10 px-4 py-3"
              placeholder="Notas (opcional)"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>
          {error && <p className="rounded-2xl bg-warn/10 px-4 py-3 text-sm text-warn">{error}</p>}
          <button type="submit" disabled={saving} className="w-full rounded-2xl bg-accent px-5 py-3 font-semibold text-white disabled:opacity-60">
            {saving ? 'Registrando...' : 'Registrar pago'}
          </button>
        </form>
      </SectionCard>

      <SectionCard title="Estado de caja" description="Resumen de pagos registrados.">
        <div className="space-y-3 text-sm">
          <div className="rounded-2xl bg-accent/10 p-4">
            Total recaudado: <strong>{fmt(totalIngresos)}</strong>
          </div>
          <div className="rounded-2xl bg-ink/5 p-4">
            {payments.length} pagos registrados en total
          </div>
        </div>
      </SectionCard>

      <div className="xl:col-span-2">
        <SectionCard title="Últimos pagos" description="Historial de pagos registrados.">
          {loading ? (
            <p className="py-8 text-center text-sm text-ink/50">Cargando...</p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-ink/10">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-ink/5 text-ink/60">
                  <tr>
                    <th className="px-4 py-3">Socio</th>
                    <th className="px-4 py-3">Importe</th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Método</th>
                    <th className="px-4 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-ink/50">No hay pagos registrados.</td></tr>
                  )}
                  {payments.map(p => (
                    <tr key={p.id} className="border-t border-ink/10 bg-white">
                      <td className="px-4 py-3">{p.member?.lastName}, {p.member?.firstName}</td>
                      <td className="px-4 py-3 font-medium">{fmt(Number(p.amount))}</td>
                      <td className="px-4 py-3 text-ink/60">{new Date(p.paidAt).toLocaleDateString('es-AR')}</td>
                      <td className="px-4 py-3 text-ink/60">{p.methodCode}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${p.status === 'REGISTERED' ? 'bg-accent/10 text-accent' : 'bg-warn/10 text-warn'}`}>
                          {p.status === 'REGISTERED' ? 'Registrado' : 'Anulado'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
