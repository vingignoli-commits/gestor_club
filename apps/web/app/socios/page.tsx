import { SectionCard } from '../../components/section-card';

const rows = [
  ['Perez, Juan', '30111222', 'Activo', 'Socio Activo', '$45.000'],
  ['Gomez, Ana', '28999111', 'Activo', 'Grupo Familiar', '$28.000'],
  ['Sosa, Lucia', '31222444', 'Suspendido', 'Socio Activo', '$71.000'],
];

export default function MembersPage() {
  return (
    <div className="space-y-6">
      <SectionCard
        title="Padron de socios"
        description="Busqueda avanzada, filtros persistentes y acceso rapido a ficha, deuda e historial."
      >
        <div className="mb-5 grid gap-3 md:grid-cols-4">
          <input className="rounded-2xl border border-ink/10 px-4 py-3" placeholder="Buscar por nombre o DNI" />
          <select className="rounded-2xl border border-ink/10 px-4 py-3">
            <option>Todos los estados</option>
          </select>
          <select className="rounded-2xl border border-ink/10 px-4 py-3">
            <option>Todas las categorias</option>
          </select>
          <button className="rounded-2xl bg-accent px-4 py-3 font-semibold text-white">Nuevo socio</button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-ink/10">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-ink/5 text-ink/60">
              <tr>
                <th className="px-4 py-3">Socio</th>
                <th className="px-4 py-3">Documento</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Deuda</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row[1]} className="border-t border-ink/10 bg-white">
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

