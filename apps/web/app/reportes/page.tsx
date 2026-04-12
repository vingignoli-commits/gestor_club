'use client';

import { useEffect, useState } from 'react';
import { SectionCard } from '../../components/section-card';
import { api } from '../../lib/api';

type Debtor = {
  id: string;
  matricula: string;
  firstName: string;
  lastName: string;
  category: string;
  status: string;
  phone: string | null;
  debt: number;
  periodsOwed: number;
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
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
}

const CATEGORY_LABELS: Record<string, string> = {
  SIMPLE: 'Simple', DOBLE: 'Doble', ESTUDIANTE: 'Estudiante',
  SOCIAL: 'Social', MENOR: 'Menor', HONOR: 'Honor',
};

export default function ReportsPage() {
  const [tab, setTab] = useState<'deudores' | 'recaudacion' | 'categorias'>('deudores');
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [monthly, setMonthly] = useState<MonthlyCollection[]>([]);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<Debtor[]>('/reports/debtors'),
      api.get<MonthlyCollection[]>('/reports/monthly-collection'),
      api.get<CategorySummary[]>('/reports/members-by-category'),
    ]).then(([d, m, c]) => {
      setDebtors(d);
      setMonthly(m);
      setCategories(c);
    }).finally(() => setLoading(false));
  }, []);

  const totalDebt = debtors.reduce((s, d) => s + d.debt, 0);
  const totalCollected = monthly.reduce((s, m) => s + m.total, 0);

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        {(['deudores', 'recaudacion', 'categorias'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-2xl px-5 py-3 text-sm font-semibold capitalize transition ${tab === t ? 'bg-accent text-white' : 'bg-ink/10 text-ink/70 hover:bg-ink/20'}`}
          >
            {t === 'deudores' ? 'Morosos' : t === 'recaudacion' ? 'Recaudacion' : 'Por categoria'}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-ink/50">Cargando reportes...</p>
      ) : (
        <>
          {tab === 'deudores' && (
            <SectionCard title="Socios morosos" description={`${debtors.length} socios con deuda — Total: ${fmt(totalDebt)}`}>
              <div className="overflow-hidden rounded-2xl border border-ink/10">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-ink/5 text-ink/60">
                    <tr>
                      <th className="px-4 py-3">Matricula</th>
                      <th className="px-4 py-3">Socio</th>
                      <th className="px-4 py-3">Categoria</th>
                      <th className="px-4 py-3">Celular</th>
                      <th className="px-4 py-3">Periodos</th>
                      <th className="px-4 py-3">Deuda</th>
                    </tr>
                  </thead>
                  <tbody>
                    {debtors.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-ink/50">Sin morosos.</td></tr>
                    )}
                    {debtors.map(d => (
                      <tr key={d.id} className="border-t border-ink/10 bg-white">
                        <td className="px-4 py-3 font-mono text-sm text-ink/60">{d.matricula}</td>
                        <td className="px-4 py-3 font-medium">{d.lastName}, {d.firstName}</td>
                        <td className="px-4 py-3 text-ink/60">{CATEGORY_LABELS[d.category] ?? d.category}</td>
                        <td className="px-4 py-3 text-ink/60">{d.phone ?? '-'}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-warn/10 px-3 py-1 text-xs font-semibold text-warn">
                            {d.periodsOwed} periodo{d.periodsOwed !== 1 ? 's' : ''}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-warn">{fmt(d.debt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}

          {tab === 'recaudacion' && (
            <SectionCard title="Recaudacion mes a mes" description={`Total acumulado: ${fmt(totalCollected)}`}>
              {monthly.length === 0 ? (
                <p className="py-8 text-center text-sm text-ink/50">Sin pagos registrados todavia.</p>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-ink/10">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-ink/5 text-ink/60">
                      <tr>
                        <th className="px-4 py-3">Mes</th>
                        <th className="px-4 py-3">Total recaudado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthly.map(m => (
                        <tr key={m.month} className="border-t border-ink/10 bg-white">
                          <td className="px-4 py-3 font-medium">{m.month}</td>
                          <td className="px-4 py-3 font-semibold text-accent">{fmt(m.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          )}

          {tab === 'categorias' && (
            <SectionCard title="Socios por categoria" description="Distribucion de socios segun categoria.">
              <div className="overflow-hidden rounded-2xl border border-ink/10">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-ink/5 text-ink/60">
                    <tr>
                      <th className="px-4 py-3">Categoria</th>
                      <th className="px-4 py-3">Activos</th>
                      <th className="px-4 py-3">Inactivos</th>
                      <th className="px-4 py-3">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map(c => (
                      <tr key={c.category} className="border-t border-ink/10 bg-white">
                        <td className="px-4 py-3 font-medium">{CATEGORY_LABELS[c.category] ?? c.category}</td>
                        <td className="px-4 py-3 text-accent font-semibold">{c.active}</td>
                        <td className="px-4 py-3 text-ink/50">{c.inactive}</td>
                        <td className="px-4 py-3 font-semibold">{c.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}
        </>
      )}
    </div>
  );
}
