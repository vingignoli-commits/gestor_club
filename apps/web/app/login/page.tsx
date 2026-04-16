'use client';

import { useState } from 'react';
import { useAuth } from '../../context/auth';

export default function LoginPage() {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      window.location.href = '/';
    } catch {
      setError('Email o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-md rounded-3xl border border-ink/10 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-ink/50">
            Acceso
          </div>
          <h1 className="mt-2 text-3xl font-bold text-ink">
            Ingreso administrativo
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-ink/80">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-ink/80">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
            />
          </div>

          {error && (
            <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <div className="mt-6 rounded-2xl border border-ink/10 bg-ink/5 p-4 text-sm text-ink/70">
          <div className="font-semibold text-ink">Usuarios demo</div>
          <div className="mt-2">Admin: admin@progreso100.local / admin123</div>
          <div>General: usuario@progreso100.local / usuario123</div>
        </div>
      </div>
    </div>
  );
}
