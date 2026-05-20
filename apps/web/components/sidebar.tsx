'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/auth';

const navigation: Array<{
  label: string;
  href: Route;
  roles: Array<'ADMIN' | 'GENERAL'>;
}> = [
  { label: 'Dashboard', href: '/', roles: ['ADMIN', 'GENERAL'] },
  { label: 'Cuadro', href: '/socios', roles: ['ADMIN', 'GENERAL'] },
  { label: 'Tesoreria', href: '/tesoreria', roles: ['ADMIN'] },
  { label: 'Caja', href: '/caja', roles: ['ADMIN', 'GENERAL'] },
  { label: 'Reportes', href: '/reportes', roles: ['ADMIN', 'GENERAL'] },
  { label: 'Mensajeria', href: '/mensajeria', roles: ['ADMIN'] },
  { label: 'Auditoria', href: '/auditoria', roles: ['ADMIN'] },
  { label: 'Configuracion', href: '/configuracion', roles: ['ADMIN'] },
];

type SidebarProps = {
  onNavigate?: () => void;
};

export function Sidebar({ onNavigate }: SidebarProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const items = navigation.filter(
    (item) => user && item.roles.includes(user.role),
  );

  return (
    <aside className="flex h-full w-full flex-col border-r border-ink/10 bg-white px-4 py-5 sm:px-5 sm:py-6 lg:w-72">
      <div className="mb-6">
        <div className="font-delaqrus overflow-hidden text-ellipsis text-base leading-tight text-ink sm:text-lg">
          R.·.L.·. PROGRESO Nº 100
        </div>
        <div className="mt-1 text-sm text-ink/60">
          Administración integral
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
        {items.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
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
            <div className="break-words text-sm font-semibold text-ink">
              {user.fullName}
            </div>
            <div className="text-xs uppercase tracking-wide text-ink/50">
              {user.role === 'ADMIN' ? 'Administrador' : 'Usuario general'}
            </div>
            <button
              type="button"
              onClick={logout}
              className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm font-semibold text-ink/75 hover:bg-ink/5 hover:text-ink"
            >
              Cerrar sesión
            </button>
          </div>
        ) : (
          <Link
            href={'/login' as Route}
            className="block rounded-2xl border border-ink/10 px-4 py-3 text-center text-sm font-semibold text-ink/75 hover:bg-ink/5 hover:text-ink"
          >
            Ingresar
          </Link>
        )}
      </div>
    </aside>
  );
}
