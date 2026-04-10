'use client';

import { useEffect, useState } from 'react';
import { KpiCard } from '../components/kpi-card';
import { SectionCard } from '../components/section-card';
import { Topbar } from '../components/topbar';
import { api } from '../lib/api';

type DashboardData = {
  cards: {
    totalMembers: number;
    activeMembers: number;
    delinquentMembers: number;
    collectedAmount: number;
  };
  alerts: { code: string; label: string; value: number }[];
};

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
}

export default function HomePage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<DashboardData>('/dashboard')
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const kpis = data
    ? [
        { label: 'Socios Totales', value: String(data.cards.totalMembers), hint: 'Total de socios registrados' },
        { label: 'Activos', value: String(data.cards.activeMembers), hint: `${Math.round((data.cards.activeMembers / data.cards.totalMembers) * 100)}% del padrón total` },
        { label: 'Morosos', value: String(data.cards.delinquentMembers), hint: 'Con deuda pendiente' },
        { label: 'Recaudación', value: fmt(data.cards.collectedAmount), hint: 'Total acumulado' },
      ]
    : [
        { label: 'Socios Totales', value: '...', hint: '' },
        { label: 'Activos', value: '...', hint: '' },
        { label: 'Morosos', value: '...', hint: '' },
        { label: 'Recaudación', value: '...', hint: '' },
      ];

  return (
    <div className="space-y-8">
      <Topbar />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map(item => (
          <KpiCard key={item.label} {...item} />
        ))}
      </section>

      <SectionCard title="Alertas operativas" description="Estado actual del sistema.">
        {loading ? (
          <p className="text-sm text-ink/50">Cargando...</p>
        ) : (
          <div className="space-y-3">
            {data?.alerts.map(alert => (
              <div key={alert.code} className="rounded-2xl bg-accent/10 p-4 text-sm">
                {alert.value} {alert.label}
              </div>
            ))}
            {(!data?.alerts || data.alerts.length === 0) && (
              <div className="rounded-2xl bg-ink/5 p-4 text-sm text-ink/60">
                Sin alertas activas.
              </div>
            )}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
