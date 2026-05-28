'use client';

import { useState } from 'react';
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

function BrandBlock() {
  return (
    <div className="rounded-3xl border border-ink/10 bg-ink/5 p-4">
      <div className="club-wordmark-wrap text-ink">
        <div className="club-wordmark">R.·.L.·. PROGRESO Nº 100</div>
      </div>
      <div className="mt-2 text-[0.64rem] uppercase tracking-[0.22em] text-ink/50">
        Administración integral
      </div>
    </div>
  );
}

function UserBox({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();

  if (!user) {
    return (
      <Link
        href="/login"
        onClick={onNavigate}
        className="block rounded-2xl bg-accent px-4 py-3 text-center text-sm font-semibold text-white"
      >
        Ingresar
      </Link>
    );
  }

  return (
    <div className="space-y-3 rounded-3xl border border-ink/10 bg-ink/5 p-4">
      <div>
        <div className="text-sm font-semibold text-ink">{user.fullName}</div>
        <div className="text-xs text-ink/50">
          {user.role === 'ADMIN' ? 'Administrador' : 'Socio'}
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          logout();
          onNavigate?.();
        }}
        className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm font-semibold text-ink/70 hover:bg-ink/5"
      >
        Cerrar sesión
      </button>
    </div>
  );
}

function NavigationLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  const pathname = usePathname();

  const items = navigation.filter(
    (item) => user && item.roles.includes(user.role),
  );

  return (
    <nav className="flex flex-1 flex-col gap-2">
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
                : 'text-ink/70 hover:bg-ink/5 hover:text-ink'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-ink/10 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <BrandBlock />
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="shrink-0 rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm font-semibold text-ink"
            aria-label="Abrir menú"
          >
            Menú
          </button>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar menú"
          />

          <aside className="absolute left-0 top-0 flex h-full w-[min(86vw,22rem)] flex-col overflow-y-auto bg-white p-4 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <BrandBlock />
              </div>

              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="shrink-0 rounded-2xl border border-ink/10 px-3 py-2 text-sm font-semibold text-ink/70"
                aria-label="Cerrar menú"
              >
                ✕
              </button>
            </div>

            <NavigationLinks onNavigate={() => setMobileOpen(false)} />

            <div className="mt-6">
              <UserBox onNavigate={() => setMobileOpen(false)} />
            </div>
          </aside>
        </div>
      )}

      <aside className="hidden min-h-screen w-72 shrink-0 flex-col border-r border-ink/10 bg-white p-4 lg:flex">
        <div className="mb-8">
          <BrandBlock />
        </div>

        <NavigationLinks />

        <div className="mt-6">
          <UserBox />
        </div>
      </aside>
    </>
  );
}
