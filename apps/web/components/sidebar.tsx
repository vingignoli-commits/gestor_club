'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/auth';

const navigation = [
  { label: 'Dashboard', href: '/' },
  { label: 'Socios', href: '/socios' },
  { label: 'Tesoreria', href: '/tesoreria' },
  { label: 'Caja', href: '/caja' },
  { label: 'Reportes', href: '/reportes' },
  { label: 'Mensajeria', href: '/mensajeria' },
  { label: 'Auditoria', href: '/auditoria' },
  { label: 'Configuracion', href: '/configuracion' },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-72 flex-col border-r border-ink/10 bg-white px-5 py-6">
      <div className="mb-8">
        <div className="text-xl font-bold text-ink">R.·.L.·. PROGRESO Nº 100</div>
        <div className="mt-1 text-sm text-ink/60">Administracion integral</div>
      </div>

      <nav className="flex flex-1 flex-col gap-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                isActive
                  ? 'bg-accent text-white'
                  : 'text-ink/75 hover:bg-ink/5 hover:text-ink'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 border-t border-ink/10 pt-4">
        {user ? (
          <div className="space-y-3">
            <div className="text-sm font-semibold text-ink">{user.fullName}</div>
            <button
              type="button"
              onClick={logout}
              className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm font-semibold text-ink/75 hover:bg-ink/5 hover:text-ink"
            >
              Cerrar sesion
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="block rounded-2xl border border-ink/10 px-4 py-3 text-center text-sm font-semibold text-ink/75 hover:bg-ink/5 hover:text-ink"
          >
            Ingresar
          </Link>
        )}
      </div>
    </aside>
  );
}
