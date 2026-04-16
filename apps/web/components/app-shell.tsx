'use client';

import { ReactNode, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/auth';
import { Sidebar } from './sidebar';

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, canAccess } = useAuth();

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
    <div className="flex min-h-screen bg-white text-ink">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden px-6 py-6">{children}</main>
    </div>
  );
}
