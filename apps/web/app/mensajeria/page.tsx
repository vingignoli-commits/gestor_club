import { SectionCard } from '../../components/section-card';

export default function MessagingPage() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <SectionCard
        title="Campanas de WhatsApp"
        description="Segmentacion por deuda, estado, categoria y condiciones historicas."
      >
        <div className="space-y-3">
          <select className="w-full rounded-2xl border border-ink/10 px-4 py-3">
            <option>Morosos del mes</option>
          </select>
          <select className="w-full rounded-2xl border border-ink/10 px-4 py-3">
            <option>Plantilla: Recordatorio de mora</option>
          </select>
          <textarea
            className="min-h-40 w-full rounded-2xl border border-ink/10 px-4 py-3"
            defaultValue="Hola {{nombre}}, te contactamos por tu saldo pendiente con el club."
          />
          <button className="rounded-2xl bg-accent px-5 py-3 font-semibold text-white">
            Programar campana
          </button>
        </div>
      </SectionCard>

      <SectionCard
        title="Historial de envios"
        description="Trazabilidad de mensajes, usuario emisor y estado del proveedor."
      >
        <div className="space-y-3 text-sm">
          <div className="rounded-2xl bg-white p-4 shadow-card">09/04 10:32 · 182 destinatarios · Pendiente</div>
          <div className="rounded-2xl bg-white p-4 shadow-card">08/04 17:10 · 1 destinatario · Enviado</div>
          <div className="rounded-2xl bg-white p-4 shadow-card">07/04 09:20 · 46 destinatarios · Error parcial</div>
        </div>
      </SectionCard>
    </div>
  );
}

