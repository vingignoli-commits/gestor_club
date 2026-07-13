'use client';

import { ReactNode, useEffect } from 'react';
import type { Route } from 'next';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/auth';
import { Sidebar } from './sidebar';

function NoAccessScreen() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink/5 p-6">
      <div className="w-full max-w-md space-y-4 rounded-3xl border border-ink/10 bg-white p-6 text-center">
        <div className="text-lg font-semibold text-ink">
          Sin secciones habilitadas
        </div>
        <p className="text-sm text-ink/60">
          Tu usuario {user?.email ? `(${user.email})` : ''} no tiene permisos
          para acceder a ninguna sección del sistema. Contactá a un
          administrador para que te asigne los permisos correspondientes.
        </p>
        <button
          type="button"
          onClick={logout}
          className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm font-semibold text-ink/70 hover:bg-ink/5"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, canAccess, landingPath } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user && pathname !== '/login') {
      router.replace('/login');
      return;
    }

    if (!user) return;

    // Sin ninguna sección accesible no hay adónde redirigir: se muestra
    // la pantalla informativa en lugar de entrar en un bucle de replace().
    if (!landingPath) return;

    if (pathname === '/login') {
      router.replace(landingPath as Route);
      return;
    }

    // Redirigir al destino permitido, nunca a '/' a ciegas: un usuario sin
    // 'dashboard:read' quedaba redirigido a una ruta que tampoco podía ver,
    // y el árbol renderizaba null (pantalla en blanco).
    if (!canAccess(pathname) && pathname !== landingPath) {
      router.replace(landingPath as Route);
    }
  }, [user, loading, pathname, router, canAccess, landingPath]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink/5 text-sm text-ink/60">
        Cargando...
      </div>
    );
  }

  if (pathname === '/login') {
    return <>{children}</>;
  }

  if (!user) {
    return null;
  }

  if (!landingPath) {
    return <NoAccessScreen />;
  }

  if (!canAccess(pathname)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink/5 text-sm text-ink/60">
        Redirigiendo...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink/5 lg:flex">
      <Sidebar />
      <main className="min-w-0 flex-1 p-4 pt-6 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
