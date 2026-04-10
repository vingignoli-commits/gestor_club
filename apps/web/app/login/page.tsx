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
    <div className="mx-auto flex min-h-[80vh] max-w-md items-center">
      <div className="w-full rounded-[2rem] bg-panel p-8 shadow-card">
        <p className="text-sm uppercase tracking-[0.18em] text-accent">Acceso</p>
        <h1 className="mt-3 font-display text-4xl font-semibold">Ingreso administrativo</h1>
        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <input
            className="w-full rounded-2xl border border-ink/10 px-4 py-3"
            placeholder="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            className="w-full rounded-2xl border border-ink/10 px-4 py-3"
            placeholder="Contraseña"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          {error && <p className="rounded-2xl bg-warn/10 px-4 py-3 text-sm text-warn">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-2xl bg-accent px-5 py-3 font-semibold text-white disabled:opacity-60"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-ink/40">
          Usuario demo: cualquier email y contraseña
        </p>
      </div>
    </div>
  );
}
