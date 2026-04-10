import { SectionCard } from '../../components/section-card';

export default function AuditPage() {
  return (
    <SectionCard
      title="Auditoria"
      description="Consulta de cambios por usuario, entidad, accion y rango temporal."
    >
      <div className="mb-5 grid gap-3 md:grid-cols-4">
        <input className="rounded-2xl border border-ink/10 px-4 py-3" placeholder="Usuario" />
        <input className="rounded-2xl border border-ink/10 px-4 py-3" placeholder="Entidad" />
        <input className="rounded-2xl border border-ink/10 px-4 py-3" placeholder="Fecha desde" />
        <button className="rounded-2xl bg-ink px-4 py-3 font-semibold text-white">Filtrar</button>
      </div>
      <div className="space-y-3 text-sm">
        <div className="rounded-2xl bg-white p-4 shadow-card">
          `member` · UPDATE · Juan Operador · cambio de telefono en socio `cuid_x1`
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-card">
          `payment` · CREATE · Maria Tesoreria · alta de pago e imputacion
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-card">
          `member_status_history` · STATUS_CHANGE · Admin · suspension administrativa
        </div>
      </div>
    </SectionCard>
  );
}

