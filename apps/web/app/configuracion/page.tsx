import { SectionCard } from '../../components/section-card';

export default function SettingsPage() {
  return (
    <SectionCard
      title="Configuracion del sistema"
      description="Catalogos maestros, cuotas, roles, plantillas y parametros generales."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {['Categorias de socios', 'Planes de cuota', 'Metodos de pago', 'Roles y permisos', 'Plantillas WhatsApp', 'Categorias contables'].map((item) => (
          <div key={item} className="rounded-3xl border border-ink/10 bg-white p-5">
            <p className="font-display text-xl font-semibold">{item}</p>
            <p className="mt-2 text-sm text-ink/60">Modulo maestro preparado para administracion segura.</p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

