import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { Sidebar } from '../components/sidebar';

export const metadata: Metadata = {
  title: 'Gestion de Club',
  description: 'Sistema administrativo integral para clubes',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es">
      <body className="min-h-screen font-sans">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 px-5 py-6 md:px-8 lg:px-10">{children}</main>
        </div>
      </body>
    </html>
  );
}
