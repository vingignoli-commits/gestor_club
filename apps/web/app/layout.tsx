import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { AppShell } from '../components/app-shell';
import { AuthProvider } from '../context/auth';

export const metadata: Metadata = {
  title: 'Gestion de HH.·.',
  description: 'Sistema administrativo integral',
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
