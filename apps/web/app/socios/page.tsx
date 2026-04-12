'use client';

import { useEffect, useState } from 'react';
import { SectionCard } from '../../components/section-card';
import { api } from '../../lib/api';

type Member = {
  id: string;
  firstName: string;
  lastName: string;
  documentNumber: string;
  currentStatusCode: string;
  memberType: string;
  category: { id: string; name: string };
};

type Category = { id: string; name: string };

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Activo',
  SUSPENDED: 'Suspendido',
  INACTIVE: 'Inactivo',
};

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    firstName: '', lastName: '', documentNumber: '',
    email: '', phone: '', joinedAt: '',
    memberType: 'TITULAR', categoryId: '', notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function load(q?: string) {
    setLoading(true);
    api.get<Member[]>(`/members${q ? `?search=${encodeURIComponent(q)}` : ''}`)
      .then(setMembers)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // Derivar categorías únicas de los socios existentes
    api.get<Member[]>('/members').then(ms => {
      const seen = new Map<string, Category>();
      ms.forEach(m => {
        if (m.category && !seen.has(m.category.id)) {
          seen.set(m.category.id, m.category);
        }
      });
      const cats = Array.from(seen.values());
      setCategories(cats);
      if (cats.length > 0) {
        setForm(f => ({ ...f, categoryId: cats[0].id }));
      }
    });
  }, []);

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
      setForm({ firstName: '', lastName: '', documentNumber: '', email: '', phone: '', joinedAt: '', memberType: 'TITULAR', categoryId: categories[0]?.id ?? '', notes: '' });
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionCard title="Padrón de socios" description="Búsqueda y listado de todos los socios del club.">
        <form onSubmit={handleSearch} className="mb-5 flex gap-3">
          <input
            className="flex-1 rounded-2xl border border-ink/10 px-4 py-3"
            placeholder="Buscar por nombre o DNI"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button type="submit" className="rounded-2xl bg-ink/10 px-5 py-3 text-sm font-semibold">
            Buscar
          </button>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-white"
          >
            + Nuevo socio
          </button>
        </form>

        {loading ? (
          <p className="py-8 text-center text-sm text-ink/50">Cargando socios...</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-ink/10">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-ink/5 text-ink/60">
                <tr>
                  <th className="px-4 py-3">Socio</th>
                  <th className="px-4 py-3">Documento</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Categoría</th>
                </tr>
              </thead>
              <tbody>
                {members.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-ink/50">No se encontraron socios.</td></tr>
                )}
                {members.map(m => (
                  <tr key={m.id} className="border-t border-ink/10 bg-white">
                    <td className="px-4 py-3 font-medium">{m.lastName}, {m.firstName}</td>
                    <td className="px-4 py-3">{m.documentNumber}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${m.currentStatusCode === 'ACTIVE' ? 'bg-accent/10 text-accent' : 'bg-warn/10 text-warn'}`}>
                        {STATUS_LABELS[m.currentStatusCode] ?? m.currentStatusCode}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink/60">{m.memberType}</td>
                    <td className="px-4 py-3 text-ink/60">{m.category?.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[2rem] bg-panel p-8 shadow-card">
            <h2 className="mb-5 font-display text-2xl font-semibold">Nuevo socio</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <input className="rounded-2xl border border-ink/10 px-4 py-3" placeholder="Nombre" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} required />
                <input className="rounded-2xl border border-ink/10 px-4 py-3" placeholder="Apellido" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} required />
                <input className="rounded-2xl border border-ink/10 px-4 py-3" placeholder="DNI" value={form.documentNumber} onChange={e => setForm(f => ({ ...f, documentNumber: e.target.value }))} required />
                <input className="rounded-2xl border border-ink/10 px-4 py-3" placeholder="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                <input className="rounded-2xl border border-ink/10 px-4 py-3" placeholder="Teléfono" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                <input className="rounded-2xl border border-ink/10 px-4 py-3" placeholder="Fecha de alta" type="date" value={form.joinedAt} onChange={e => setForm(f => ({ ...f, joinedAt: e.target.value }))} required />
                <select className="rounded-2xl border border-ink/10 px-4 py-3" value={form.memberType} onChange={e => setForm(f => ({ ...f, memberType: e.target.value }))}>
                  <option value="TITULAR">Titular</option>
                  <option value="ADHERENTE">Adherente</option>
                  <option value="BECADO">Becado</option>
                  <option value="VITALICIO">Vitalicio</option>
                  <option value="INVITADO">Invitado</option>
                </select>
                <select className="rounded-2xl border border-ink/10 px-4 py-3" value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))} required>
                  <option value="">Seleccionar categoría</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <input className="w-full rounded-2xl border border-ink/10 px-4 py-3" placeholder="Notas (opcional)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
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
