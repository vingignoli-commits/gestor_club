import { KpiCard } from '../components/kpi-card';
import { SectionCard } from '../components/section-card';
import { Topbar } from '../components/topbar';

const kpis = [
  { label: 'Socios Totales', value: '1.248', hint: '43 altas netas en el trimestre' },
  { label: 'Activos', value: '1.006', hint: '80,6% del padron total' },
  { label: 'Morosos', value: '182', hint: '14,5% con deuda pendiente' },
  { label: 'Recaudacion', value: '$18,4M', hint: 'Acumulado del mes en curso' },
];

const debtRows = [
  ['Juan Perez', '3 periodos', '$45.000', 'Recordar hoy'],
  ['Ana Gomez', '2 periodos', '$28.000', 'Llamar'],
  ['Lucia Sosa', '5 periodos', '$71.000', 'Gestion especial'],
];

export default function HomePage() {
  return (
    <div className="space-y-8">
      <Topbar />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => (
          <KpiCard key={item.label} {...item} />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.3fr_0.9fr]">
        <SectionCard
          title="Vista de cobranzas"
          description="Serie temporal esperada para presidencia y tesoreria. La implementacion final consumira la API del dashboard."
        >
          <div className="rounded-3xl border border-dashed border-ink/15 bg-canvas p-6">
            <div className="flex h-64 items-end gap-3">
              {[45, 58, 63, 51, 72, 81, 76, 90, 86, 94, 88, 98].map((value, index) => (
                <div key={index} className="flex-1 rounded-t-2xl bg-accent/85" style={{ height: `${value}%` }} />
              ))}
            </div>
            <div className="mt-4 flex justify-between text-xs uppercase tracking-[0.16em] text-ink/45">
              <span>Ene</span>
              <span>Jun</span>
              <span>Dic</span>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Alertas operativas"
          description="Acciones inmediatas derivadas del estado financiero y documental."
        >
          <div className="space-y-3">
            <div className="rounded-2xl bg-warn/10 p-4 text-sm">
              37 movimientos de egreso sin comprobante adjunto.
            </div>
            <div className="rounded-2xl bg-accent/10 p-4 text-sm">
              182 socios con deuda; 61 superan 3 periodos.
            </div>
            <div className="rounded-2xl bg-ink/5 p-4 text-sm">
              1 campana de WhatsApp pendiente de aprobacion.
            </div>
          </div>
        </SectionCard>
      </section>

      <SectionCard
        title="Morosidad priorizada"
        description="Listado accionable para recupero, con foco en antiguedad y monto."
      >
        <div className="overflow-hidden rounded-2xl border border-ink/10">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-ink/5 text-ink/60">
              <tr>
                <th className="px-4 py-3">Socio</th>
                <th className="px-4 py-3">Antiguedad</th>
                <th className="px-4 py-3">Deuda</th>
                <th className="px-4 py-3">Accion sugerida</th>
              </tr>
            </thead>
            <tbody>
              {debtRows.map((row) => (
                <tr key={row[0]} className="border-t border-ink/10 bg-white">
                  {row.map((cell) => (
                    <td key={cell} className="px-4 py-3">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

