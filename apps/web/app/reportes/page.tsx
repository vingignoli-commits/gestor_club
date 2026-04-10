import { SectionCard } from '../../components/section-card';

const reports = [
  'Padron total',
  'Socios morosos',
  'Historial de pagos por socio',
  'Balance resumido',
  'Movimientos sin comprobante',
  'Trazabilidad por usuario',
];

export default function ReportsPage() {
  return (
    <SectionCard
      title="Centro de reportes"
      description="Cada reporte debe verse en pantalla, filtrarse y exportarse en CSV, XLSX o PDF."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reports.map((item) => (
          <div key={item} className="rounded-3xl border border-ink/10 bg-white p-5">
            <p className="font-display text-xl font-semibold">{item}</p>
            <p className="mt-2 text-sm text-ink/60">
              Incluye filtros por periodo, categoria, estado y responsable.
            </p>
            <button className="mt-4 rounded-2xl bg-ink px-4 py-2 text-sm font-semibold text-white">
              Abrir
            </button>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

