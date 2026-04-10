import { SectionCard } from '../../components/section-card';

export default function TreasuryPage() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <SectionCard
        title="Registro rapido de pago"
        description="El flujo final debe permitir imputacion automatica o manual sobre periodos abiertos."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <input className="rounded-2xl border border-ink/10 px-4 py-3" placeholder="Socio" />
          <input className="rounded-2xl border border-ink/10 px-4 py-3" placeholder="Importe" />
          <input className="rounded-2xl border border-ink/10 px-4 py-3" placeholder="Fecha de pago" />
          <select className="rounded-2xl border border-ink/10 px-4 py-3">
            <option>Metodo de pago</option>
          </select>
        </div>
        <button className="mt-4 rounded-2xl bg-accent px-5 py-3 font-semibold text-white">
          Registrar pago
        </button>
      </SectionCard>

      <SectionCard
        title="Estado de caja"
        description="Vista sintetica para tesoreria con ingresos, egresos y alertas documentales."
      >
        <div className="space-y-3 text-sm">
          <div className="rounded-2xl bg-accent/10 p-4">Ingresos del dia: $1.280.000</div>
          <div className="rounded-2xl bg-warn/10 p-4">Egresos del dia: $430.000</div>
          <div className="rounded-2xl bg-ink/5 p-4">12 comprobantes pendientes de asociacion</div>
        </div>
      </SectionCard>
    </div>
  );
}

