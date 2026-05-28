'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/auth';

const navigation: Array<{
  label: string;
  href: Route;
  roles: Array<'ADMIN' | 'SOCIO'>;
}> = [
  { label: 'Dashboard', href: '/', roles: ['ADMIN', 'SOCIO'] },
  { label: 'Cuadro', href: '/socios', roles: ['ADMIN', 'SOCIO'] },
  { label: 'Tesorería', href: '/tesoreria', roles: ['ADMIN'] },
  { label: 'Caja', href: '/caja', roles: ['ADMIN'] },
  { label: 'Reportes', href: '/reportes', roles: ['ADMIN'] },
  { label: 'Mensajería', href: '/mensajeria', roles: ['ADMIN'] },
  { label: 'Auditoría', href: '/auditoria', roles: ['ADMIN'] },
  { label: 'Configuración', href: '/configuracion', roles: ['ADMIN'] },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const items = navigation.filter(
    (item) => user && item.roles.includes(user.role),
  );

  return (
    <aside className="flex min-h-screen w-full flex-col border-r border-ink/10 bg-white p-4 lg:w-72">
      <div className="mb-8 rounded-3xl border border-ink/10 bg-ink/5 p-4">
        <div className="club-wordmark-wrap">
          <div className="club-wordmark">
            R.·.L.·. PROGRESO Nº 100
          </div>
        </div>
        <div className="mt-1 text-xs uppercase tracking-[0.2em] text-ink/50">
          Administración integral
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-2">
        {items.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                isActive
                  ? 'bg-accent text-white'
                  : 'text-ink/70 hover:bg-ink/5 hover:text-ink'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 rounded-3xl border border-ink/10 bg-ink/5 p-4">
        {user ? (
          <div className="space-y-3">
            <div>
              <div className="text-sm font-semibold text-ink">{user.fullName}</div>
              <div className="text-xs text-ink/50">
                {user.role === 'ADMIN' ? 'Administrador' : 'Socio'}
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm font-semibold text-ink/70 hover:bg-ink/5"
            >
              Cerrar sesión
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="block rounded-2xl bg-accent px-4 py-3 text-center text-sm font-semibold text-white"
          >
            Ingresar
          </Link>
        )}
      </div>
    </aside>
  );
}
