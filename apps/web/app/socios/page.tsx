'use client';

import { useEffect, useState } from 'react';
import { SectionCard } from '../../components/section-card';
import { api } from '../../lib/api';

type Member = {
  id: string;
  matricula: string;
  firstName: string;
  lastName: string;
  category: string;
  status: string;
  grade: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
};

const CATEGORY_LABELS: Record<string, string> = {
  SIMPLE: 'Simple',
  DOBLE: 'Doble',
  ESTUDIANTE: 'Estudiante',
  SOCIAL: 'Social',
  MENOR: 'Menor',
  HONOR: 'Honor',
};

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    matricula: '', firstName: '', lastName: '',
    category: 'SIMPLE', status: 'ACTIVE',
    grade: '', phone: '', email: '', notes: '',
    joinedAt: new Date().toISOString().split('T')[0],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function load(q?: string) {
    setLoading(true);
    api.get<Member[]>(`/members${q ? `?search=${encodeURIComponent(q)}` : ''}`)
      .then(setMembers)
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    load(search);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.post('/members', {
        ...form,
        joinedAt: new Date(form.joinedAt).toISOString(),
      });
      setShowForm(false);
      setForm({ matricula: '', firstName: '', lastName: '', category: 'SIMPLE', status: 'ACTIVE', grade: '', phone: '', email: '', notes: '', joinedAt: new Date().toISOString().split('T')[0] });
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  const activos = members.filter(m => m.status === 'ACTIVE').length;
  const inactivos = members.filter(m => m.status === 'INACTIVE').length;

  return (
    <div className="space-y-6">
      <SectionCard title="Padron de socios" description="Gestion de socios de TESORERIA PROGRESO N 100.">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex gap-4 text-sm">
            <span className="rounded-full bg-accent/10 px-3 py-1 text-accent font-semibold">{activos} activos</span>
            <span className="rounded-full bg-ink/10 px-3 py-1 text-ink/60 font-semibold">{inactivos} inactivos</span>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-white"
          >
            + Nuevo socio
          </button>
        </div>

        <form onSubmit={handleSearch} className="mb-5 flex gap-3">
          <input
            className="flex-1 rounded-2xl border border-ink/10 px-4 py-3"
            placeholder="Buscar por nombre, apellido o matricula"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button type="submit" className="rounded-2xl bg-ink/10 px-5 py-3 text-sm font-semibold">
            Buscar
          </button>
        </form>

        {loading ? (
          <p className="py-8 text-center text-sm text-ink/50">Cargando socios...</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-ink/10">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-ink/5 text-ink/60">
                <tr>
                  <th className="px-4 py-3">Matricula</th>
                  <th className="px-4 py-3">Socio</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Grado</th>
                  <th className="px-4 py-3">Celular</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {members.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-ink/50">No se encontraron socios.</td></tr>
                )}
                {members.map(m => (
                  <tr key={m.id} className="border-t border-ink/10 bg-white hover:bg-ink/5">
                    <td className="px-4 py-3 font-mono text-sm text-ink/60">{m.matricula}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{m.lastName}, {m.firstName}</p>
                      {m.email && <p className="text-xs text-ink/50">{m.email}</p>}
                    </td>
                    <td className="px-4 py-3">{CATEGORY_LABELS[m.category] ?? m.category}</td>
                    <td className="px-4 py-3 text-ink/60">{m.grade ?? '-'}</td>
                    <td className="px-4 py-3 text-ink/60">{m.phone ?? '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${m.status === 'ACTIVE' ? 'bg-accent/10 text-accent' : 'bg-ink/10 text-ink/50'}`}>
                        {m.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[2rem] bg-panel p-8 shadow-card max-h-[90vh] overflow-y-auto">
            <h2 className="mb-5 font-display text-2xl font-semibold">Nuevo socio</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <input className="rounded-2xl border border-ink/10 px-4 py-3" placeholder="Matricula *" value={form.matricula} onChange={e => setForm(f => ({ ...f, matricula: e.target.value }))} required />
                <input className="rounded-2xl border border-ink/10 px-4 py-3" placeholder="Nombre *" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} required />
                <input className="rounded-2xl border border-ink/10 px-4 py-3" placeholder="Apellido *" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} required />
                <input className="rounded-2xl border border-ink/10 px-4 py-3" placeholder="Grado" value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))} />
                <input className="rounded-2xl border border-ink/10 px-4 py-3" placeholder="Celular" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                <input className="rounded-2xl border border-ink/10 px-4 py-3" placeholder="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                <select className="rounded-2xl border border-ink/10 px-4 py-3" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  <option value="SIMPLE">Simple</option>
                  <option value="DOBLE">Doble</option>
                  <option value="ESTUDIANTE">Estudiante</option>
                  <option value="SOCIAL">Social</option>
                  <option value="MENOR">Menor</option>
                  <option value="HONOR">Honor</option>
                </select>
                <select className="rounded-2xl border border-ink/10 px-4 py-3" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="ACTIVE">Activo</option>
                  <option value="INACTIVE">Inactivo</option>
                </select>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs text-ink/50">Fecha de alta *</label>
                  <input className="w-full rounded-2xl border border-ink/10 px-4 py-3" type="date" value={form.joinedAt} onChange={e => setForm(f => ({ ...f, joinedAt: e.target.value }))} required />
                </div>
              </div>
              <textarea className="w-full rounded-2xl border border-ink/10 px-4 py-3" placeholder="Observaciones" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              {error && <p className="rounded-2xl bg-warn/10 px-4 py-3 text-sm text-warn">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-2xl border border-ink/10 px-4 py-3 text-sm font-semibold">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
