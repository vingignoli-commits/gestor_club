'use client';

import { useEffect, useMemo, useState } from 'react';
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
  joinedAt: string;
};

type MemberForm = {
  matricula: string;
  firstName: string;
  lastName: string;
  category: string;
  status: string;
  grade: string;
  phone: string;
  email: string;
  notes: string;
  joinedAt: string;
};

const CATEGORY_OPTIONS = [
  { value: 'SIMPLE', label: 'Simple' },
  { value: 'DOBLE', label: 'Doble' },
  { value: 'ESTUDIANTE', label: 'Estudiante' },
  { value: 'SOCIAL', label: 'Social' },
  { value: 'MENOR', label: 'Menor' },
  { value: 'HONOR', label: 'Honor' },
];

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Activo' },
  { value: 'INACTIVE', label: 'Inactivo' },
];

const GRADE_OPTIONS = [
  { value: 'APRENDIZ', label: 'Aprendiz' },
  { value: 'COMPANERO', label: 'Compañero' },
  { value: 'MAESTRO', label: 'Maestro' },
];

function emptyForm(): MemberForm {
  return {
    matricula: '',
    firstName: '',
    lastName: '',
    category: 'SIMPLE',
    status: 'ACTIVE',
    grade: 'APRENDIZ',
    phone: '',
    email: '',
    notes: '',
    joinedAt: new Date().toISOString().split('T')[0],
  };
}

function categoryLabel(value: string) {
  return CATEGORY_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

function statusLabel(value: string) {
  return STATUS_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

function gradeLabel(value: string | null) {
  if (!value) return '-';
  return GRADE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [form, setForm] = useState<MemberForm>(emptyForm());

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isEditing = useMemo(() => editingMemberId !== null, [editingMemberId]);

  function load(q?: string) {
    setLoading(true);
    api
      .get<Member[]>(`/members${q ? `?search=${encodeURIComponent(q)}` : ''}`)
      .then(setMembers)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    load(search);
  }

  function openCreate() {
    setEditingMemberId(null);
    setForm(emptyForm());
    setError('');
    setShowForm(true);
  }

  function openEdit(member: Member) {
    setEditingMemberId(member.id);
    setForm({
      matricula: member.matricula,
      firstName: member.firstName,
      lastName: member.lastName,
      category: member.category,
      status: member.status,
      grade: member.grade ?? 'APRENDIZ',
      phone: member.phone ?? '',
      email: member.email ?? '',
      notes: member.notes ?? '',
      joinedAt: member.joinedAt.split('T')[0],
    });
    setError('');
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingMemberId(null);
    setForm(emptyForm());
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      if (isEditing && editingMemberId) {
        await api.patch(`/members/${editingMemberId}`, {
          matricula: form.matricula.trim(),
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          category: form.category,
          status: form.status,
          grade: form.grade,
          phone: form.phone.trim() || undefined,
          email: form.email.trim() || undefined,
          notes: form.notes.trim() || undefined,
        });
      } else {
        await api.post('/members', {
          matricula: form.matricula.trim(),
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          category: form.category,
          status: form.status,
          grade: form.grade,
          phone: form.phone.trim() || undefined,
          email: form.email.trim() || undefined,
          notes: form.notes.trim() || undefined,
          joinedAt: new Date(form.joinedAt).toISOString(),
        });
      }

      closeForm();
      load(search);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar socio');
    } finally {
      setSaving(false);
    }
  }

  const activos = members.filter((m) => m.status === 'ACTIVE').length;
  const inactivos = members.filter((m) => m.status === 'INACTIVE').length;

  return (
    <div className="space-y-6">
      <SectionCard
        title="Socios"
        description="Alta, edición y consulta del padrón de socios."
      >
        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-ink/10 bg-ink/5 p-4">
            <div className="text-xs uppercase tracking-wide text-ink/50">Total</div>
            <div className="mt-2 text-2xl font-bold text-ink">{members.length}</div>
          </div>
          <div className="rounded-2xl border border-ink/10 bg-ink/5 p-4">
            <div className="text-xs uppercase tracking-wide text-ink/50">Activos</div>
            <div className="mt-2 text-2xl font-bold text-ink">{activos}</div>
          </div>
          <div className="rounded-2xl border border-ink/10 bg-ink/5 p-4">
            <div className="text-xs uppercase tracking-wide text-ink/50">Inactivos</div>
            <div className="mt-2 text-2xl font-bold text-ink">{inactivos}</div>
          </div>
          <div className="rounded-2xl border border-ink/10 bg-ink/5 p-4">
            <div className="text-xs uppercase tracking-wide text-ink/50">Grados válidos</div>
            <div className="mt-2 text-sm font-semibold text-ink">
              Aprendiz · Compañero · Maestro
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <form onSubmit={handleSearch} className="flex w-full gap-3 md:max-w-xl">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por apellido, nombre, matrícula, email o teléfono"
              className="flex-1 rounded-2xl border border-ink/10 px-4 py-3 text-sm"
            />
            <button
              type="submit"
              className="rounded-2xl border border-ink/10 px-5 py-3 text-sm font-semibold"
            >
              Buscar
            </button>
          </form>

          <button
            type="button"
            onClick={openCreate}
            className="rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-white"
          >
            + Nuevo socio
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-sm text-ink/60">Cargando socios...</div>
        ) : members.length === 0 ? (
          <div className="py-8 text-sm text-ink/60">No se encontraron socios.</div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-ink/50">
                  <th className="px-3 py-2">Matrícula</th>
                  <th className="px-3 py-2">Socio</th>
                  <th className="px-3 py-2">Categoría</th>
                  <th className="px-3 py-2">Grado</th>
                  <th className="px-3 py-2">Celular</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="rounded-2xl bg-ink/5 text-sm">
                    <td className="rounded-l-2xl px-3 py-3 font-semibold text-ink">
                      {m.matricula}
                    </td>
                    <td className="px-3 py-3 text-ink">
                      {m.lastName}, {m.firstName}
                    </td>
                    <td className="px-3 py-3 text-ink/80">{categoryLabel(m.category)}</td>
                    <td className="px-3 py-3 text-ink/80">{gradeLabel(m.grade)}</td>
                    <td className="px-3 py-3 text-ink/80">{m.phone ?? '-'}</td>
                    <td className="px-3 py-3 text-ink/80">{m.email ?? '-'}</td>
                    <td className="px-3 py-3 text-ink/80">
                      {statusLabel(m.status)}
                    </td>
                    <td className="rounded-r-2xl px-3 py-3">
                      <button
                        type="button"
                        onClick={() => openEdit(m)}
                        className="rounded-xl border border-ink/10 px-3 py-2 text-xs font-semibold"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {showForm && (
        <SectionCard
          title={isEditing ? 'Editar socio' : 'Nuevo socio'}
          description="Los valores posibles de grado son Aprendiz, Compañero y Maestro."
        >
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-ink/80">
                Matrícula
              </label>
              <input
                value={form.matricula}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, matricula: e.target.value }))
                }
                required
                className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-ink/80">
                Fecha de alta
              </label>
              <input
                type="date"
                value={form.joinedAt}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, joinedAt: e.target.value }))
                }
                required
                disabled={isEditing}
                className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm disabled:bg-ink/5"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-ink/80">
                Nombre
              </label>
              <input
                value={form.firstName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, firstName: e.target.value }))
                }
                required
                className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-ink/80">
                Apellido
              </label>
              <input
                value={form.lastName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, lastName: e.target.value }))
                }
                required
                className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-ink/80">
                Categoría
              </label>
              <select
                value={form.category}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, category: e.target.value }))
                }
                className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-ink/80">
                Estado
              </label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, status: e.target.value }))
                }
                className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-ink/80">
                Grado
              </label>
              <select
                value={form.grade}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, grade: e.target.value }))
                }
                className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
              >
                {GRADE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-ink/80">
                Teléfono
              </label>
              <input
                value={form.phone}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, phone: e.target.value }))
                }
                className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-ink/80">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, email: e.target.value }))
                }
                className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-ink/80">
                Notas
              </label>
              <textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                rows={4}
                className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
              />
            </div>

            {error && (
              <div className="md:col-span-2 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="md:col-span-2 flex gap-3">
              <button
                type="button"
                onClick={closeForm}
                className="flex-1 rounded-2xl border border-ink/10 px-4 py-3 text-sm font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Guardar'}
              </button>
            </div>
          </form>
        </SectionCard>
      )}
    </div>
  );
}
