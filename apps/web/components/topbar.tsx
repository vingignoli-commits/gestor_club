export function Topbar() {
  return (
    <header className="flex flex-col gap-4 border-b border-ink/10 pb-6 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-sm uppercase tracking-[0.22em] text-accent">Panel Ejecutivo</p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
          Gestion integral del club
        </h1>
      </div>
      <div className="flex gap-3">
        <div className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink/70">
          Periodo: Abril 2026
        </div>
        <button className="rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-white">
          Exportar resumen
        </button>
      </div>
    </header>
  );
}

