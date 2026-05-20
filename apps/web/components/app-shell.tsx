'use client';

import { ReactNode, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/auth';
import { Sidebar } from './sidebar';

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, canAccess } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user && pathname !== '/login') {
      router.replace('/login');
      return;
    }

    if (user && pathname === '/login') {
      router.replace('/');
      return;
    }

    if (user && pathname !== '/login' && !canAccess(pathname)) {
      router.replace('/');
    }
  }, [user, loading, pathname, router, canAccess]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-sm text-ink/60">
        Cargando...
      </div>
    );
  }

  if (pathname === '/login') {
    return <>{children}</>;
  }

  if (!user || !canAccess(pathname)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white text-ink">
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-ink/10 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <div>
          <div className="font-delaqrus text-sm leading-tight text-ink">
            PROGRESO Nº 100
          </div>
          <div className="text-xs text-ink/50">Administración integral</div>
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="rounded-2xl border border-ink/10 px-4 py-2 text-sm font-semibold text-ink"
        >
          Menú
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setMobileMenuOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="absolute left-0 top-0 h-full w-[86vw] max-w-80 bg-white shadow-2xl">
            <Sidebar onNavigate={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-h-screen">
        <div className="hidden shrink-0 lg:block">
          <Sidebar />
        </div>

        <main className="min-w-0 flex-1 overflow-x-hidden px-3 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
