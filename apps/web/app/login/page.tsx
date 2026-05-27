'use client';

import { useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/auth';

export default function LoginPage() {
  const { login } = useAuth();

  const [mode, setMode] = useState<'login' | 'recover'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('Administrador');
  const [recoveryKey, setRecoveryKey] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await login(email, password);
      window.location.href = '/';
    } catch {
      setError('Usuario o contraseña incorrectos.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRecoverAdmin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await api.post('/auth/recover-admin', {
        email,
        fullName,
        recoveryKey,
        newPassword,
      });

      setPassword(newPassword);
      setRecoveryKey('');
      setNewPassword('');
      setSuccess('Administrador recuperado. Ya podés ingresar con la nueva contraseña.');
      setMode('login');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo recuperar el administrador.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink/5 px-4 py-10">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-ink/10 bg-white p-6 shadow-xl">
        <div className="mb-6 text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.28em] text-ink/50">
            Acceso
          </div>
          <h1 className="mt-2 text-2xl font-bold text-ink">
            R.·.L.·. PROGRESO Nº 100
          </h1>
          <p className="mt-2 text-sm text-ink/60">
            Sistema de gestión institucional.
          </p>
        </div>

        {mode === 'login' ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-ink/80">
                Usuario
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
                className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm outline-none focus:border-accent"
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
                autoComplete="current-password"
                required
                minLength={8}
                className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm outline-none focus:border-accent"
              />
            </div>

            {error && (
              <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('recover');
                setError('');
                setSuccess('');
              }}
              className="w-full rounded-2xl border border-ink/10 px-5 py-3 text-sm font-semibold text-ink/70 hover:bg-ink/5"
            >
              Recuperar usuario admin
            </button>
          </form>
        ) : (
          <form onSubmit={handleRecoverAdmin} className="space-y-4">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Esta recuperación exige la clave privada configurada en el servidor.
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-ink/80">
                Email admin
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
                className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-ink/80">
                Nombre visible
              </label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-ink/80">
                Clave de recuperación
              </label>
              <input
                type="password"
                value={recoveryKey}
                onChange={(e) => setRecoveryKey(e.target.value)}
                required
                className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-ink/80">
                Nueva contraseña admin
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm outline-none focus:border-accent"
              />
            </div>

            {error && (
              <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError('');
                  setSuccess('');
                }}
                className="flex-1 rounded-2xl border border-ink/10 px-5 py-3 text-sm font-semibold text-ink/70 hover:bg-ink/5"
              >
                Volver
              </button>

              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {loading ? 'Recuperando...' : 'Recuperar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
