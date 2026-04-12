'use client';

import { useAuth } from '../context/auth';

const navigation = [
  { label: 'Dashboard', href: '/' },
  { label: 'Socios', href: '/socios' },
  { label: 'Tesorería', href: '/tesoreria' },
  { label: 'Reportes', href: '/reportes' },
  { label: 'Mensajería', href: '/mensajeria' },
  { label: 'Auditoría', href: '/auditoria' },
  { label: 'Configuración', href: '/configuracion' },
];

export function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="hidden w-72 shrink-0 border-r border-ink/10 bg-panel/80 px-5 py-6 backdrop-blur lg:block">
      <div className="mb-8">
        <p className="font-display text-lg font-semibold tracking-tight leading-tight">TESORERÍA PROGRESO Nº 100</p>
        <p className="mt-2 text-sm text-ink/60">Administración integral</p>
      </div>

      <nav className="space-y-2">
        {navigation.map(item => (
          
            key={item.href}
            href={item.href}
            className="block rounded-2xl px-4 py-3 text-sm font-medium text-ink/75 transition hover:bg-accent hover:text-white"
          >
            {item.label}
          </a>
        ))}
      </nav>

      <div className="mt-8 border-t border-ink/10 pt-6">
        {user ? (
          <div className="space-y-2">
            <p className="px-2 text-xs text-ink/50">{user.fullName}</p>
            <button
              onClick={logout}
              className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-left text-sm font-medium text-ink/75 transition hover:bg-warn/10 hover:text-warn"
            >
              Cerrar sesión
            </button>
          </div>
        ) : (
          
            href="/login"
            className="block rounded-2xl bg-accent px-4 py-3 text-center text-sm font-semibold text-white"
          >
            Ingresar
          </a>
        )}
      </div>
    </aside>
  );
}
