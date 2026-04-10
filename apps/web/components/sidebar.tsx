const navigation = [
  'Dashboard',
  'Socios',
  'Tesoreria',
  'Reportes',
  'Mensajeria',
  'Auditoria',
  'Configuracion',
];

export function Sidebar() {
  return (
    <aside className="hidden w-72 shrink-0 border-r border-ink/10 bg-panel/80 px-5 py-6 backdrop-blur lg:block">
      <div className="mb-8">
        <p className="font-display text-2xl font-semibold tracking-tight">PROGRESO Nº 100</p>
        <p className="mt-2 text-sm text-ink/60">Tesoreria y gestión de HH.·.</p>
      </div>

      <nav className="space-y-2">
        {navigation.map((item) => (
          <a
            key={item}
            href={item === 'Dashboard' ? '/' : `/${item.toLowerCase()}`}
            className="block rounded-2xl px-4 py-3 text-sm font-medium text-ink/75 transition hover:bg-accent hover:text-white"
          >
            {item}
          </a>
        ))}
      </nav>
    </aside>
  );
}

