'use client';

import { useEffect, useMemo, useState } from 'react';
import { SectionCard } from '../../components/section-card';
import { useAuth } from '../../context/auth';
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
  birthDate: string | null;
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
  birthDate: string;
};

type SortField =
  | 'matricula'
  | 'firstName'
  | 'lastName'
  | 'category'
  | 'status'
  | 'grade'
  | 'phone'
  | 'email'
  | 'joinedAt'
  | 'birthDate';

type SortDirection = 'asc' | 'desc';

type Filters = {
  matricula: string;
  firstName: string;
  lastName: string;
  category: string;
  status: string;
  grade: string;
  phone: string;
  email: string;
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
    birthDate: '',
  };
}

function emptyFilters(): Filters {
  return {
    matricula: '',
    firstName: '',
    lastName: '',
    category: '',
    status: '',
    grade: '',
    phone: '',
    email: '',
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

function buildWhatsappLink(member: Member) {
  if (!member.phone) return null;

  const celular = member.phone.replace(/\D/g, '');
  if (!celular) return null;

  const saludo = member.grade === 'MAESTRO' ? 'Hola V.·.H.·.' : 'Hola Q.·.H.·.';
  const texto = `${saludo} ${member.firstName}`;
  return `https://wa.me/${celular}?text=${encodeURIComponent(texto)}`;
}

function normalizeText(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase();
}

function compareValues(a: string, b: string, direction: SortDirection) {
  const result = a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' });
  return direction === 'asc' ? result : -result;
}

export default function MembersPage() {
  const { canEdit } = useAuth();

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [form, setForm] = useState<MemberForm>(emptyForm());

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [filters, setFilters] = useState<Filters>(emptyFilters());
  const [sortField, setSortField] = useState<SortField>('lastName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const isEditing = useMemo(() => editingMemberId !== null, [editingMemberId]);

  async function load() {
    setLoading(true);

    try {
      const data = await api.get<Member[]>('/members');
      setMembers(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    if (!canEdit) return;
    setEditingMemberId(null);
    setForm(emptyForm());
    setError('');
    setShowForm(true);
  }

  function openEdit(member: Member) {
    if (!canEdit) return;
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
      birthDate: member.birthDate ? member.birthDate.split('T')[0] : '',
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

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortField(field);
    setSortDirection('asc');
  }

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function clearFilters() {
    setFilters(emptyFilters());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;

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
          birthDate: form.birthDate
            ? new Date(form.birthDate).toISOString()
            : undefined,
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
          birthDate: form.birthDate
            ? new Date(form.birthDate).toISOString()
            : undefined,
        });
      }

      closeForm();
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar H.·.');
    } finally {
      setSaving(false);
    }
  }

  const filteredMembers = useMemo(() => {
    const result = members.filter((member) => {
      if (
        filters.matricula &&
        !normalizeText(member.matricula).includes(normalizeText(filters.matricula))
      ) {
        return false;
      }

      if (
        filters.firstName &&
        !normalizeText(member.firstName).includes(normalizeText(filters.firstName))
      ) {
        return false;
      }

      if (
        filters.lastName &&
        !normalizeText(member.lastName).includes(normalizeText(filters.lastName))
      ) {
        return false;
      }

      if (filters.category && member.category !== filters.category) {
        return false;
      }

      if (filters.status && member.status !== filters.status) {
        return false;
      }

      if (filters.grade && (member.grade ?? '') !== filters.grade) {
        return false;
      }

      if (
        filters.phone &&
        !normalizeText(member.phone).includes(normalizeText(filters.phone))
      ) {
        return false;
      }

      if (
        filters.email &&
        !normalizeText(member.email).includes(normalizeText(filters.email))
      ) {
        return false;
      }

      return true;
    });

    return result.sort((a, b) => {
      switch (sortField) {
        case 'matricula':
          return compareValues(a.matricula, b.matricula, sortDirection);
        case 'firstName':
          return compareValues(a.firstName, b.firstName, sortDirection);
        case 'lastName':
          return compareValues(a.lastName, b.lastName, sortDirection);
        case 'category':
          return compareValues(categoryLabel(a.category), categoryLabel(b.category), sortDirection);
        case 'status':
          return compareValues(statusLabel(a.status), statusLabel(b.status), sortDirection);
        case 'grade':
          return compareValues(gradeLabel(a.grade), gradeLabel(b.grade), sortDirection);
        case 'phone':
          return compareValues(a.phone ?? '', b.phone ?? '', sortDirection);
        case 'email':
          return compareValues(a.email ?? '', b.email ?? '', sortDirection);
        case 'joinedAt':
          return compareValues(a.joinedAt, b.joinedAt, sortDirection);
        case 'birthDate':
          return compareValues(a.birthDate ?? '', b.birthDate ?? '', sortDirection);
        default:
          return 0;
      }
    });
  }, [members, filters, sortField, sortDirection]);

  const activeFilters = useMemo(() => {
    const items: string[] = [];

    if (filters.matricula) items.push(`Matrícula: ${filters.matricula}`);
    if (filters.firstName) items.push(`Nombre: ${filters.firstName}`);
    if (filters.lastName) items.push(`Apellido: ${filters.lastName}`);
    if (filters.category) items.push(`Categoría: ${categoryLabel(filters.category)}`);
    if (filters.status) items.push(`Estado: ${statusLabel(filters.status)}`);
    if (filters.grade) items.push(`Grado: ${gradeLabel(filters.grade)}`);
    if (filters.phone) items.push(`Celular: ${filters.phone}`);
    if (filters.email) items.push(`Email: ${filters.email}`);

    return items;
  }, [filters]);

  const activos = members.filter((m) => m.status === 'ACTIVE').length;
  const inactivos = members.filter((m) => m.status === 'INACTIVE').length;

  function sortIndicator(field: SortField) {
    if (sortField !== field) return '↕';
    return sortDirection === 'asc' ? '↑' : '↓';
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Cuadro del Taller"
        description="Consulta, filtrado y orden del Cuadro del Taller."
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
            <div className="text-xs uppercase tracking-wide text-ink/50">Mostrando</div>
            <div className="mt-2 text-2xl font-bold text-ink">{filteredMembers.length}</div>
          </div>
        </div>

        {canEdit && (
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
            <button
              type="button"
              onClick={openCreate}
              className="rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-white"
            >
              + Nuevo H.·.
            </button>
          </div>
        )}

        {activeFilters.length > 0 && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <span className="font-semibold">Filtros aplicados:</span>{' '}
            {activeFilters.join(' · ')}
            <button
              type="button"
              onClick={clearFilters}
              className="ml-3 font-semibold underline underline-offset-4"
            >
              Limpiar filtros
            </button>
          </div>
        )}

        {loading ? (
          <div className="py-8 text-sm text-ink/60">Cargando Cuadro del Taller...</div>
        ) : filteredMembers.length === 0 ? (
          <div className="py-8 text-sm text-ink/60">
            No se encontraron HH.·. con los filtros actuales.
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-ink/50">
                  <th className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => toggleSort('matricula')}
                      className="font-semibold"
                    >
                      Matrícula {sortIndicator('matricula')}
                    </button>
                  </th>
                  <th className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => toggleSort('lastName')}
                      className="font-semibold"
                    >
                      H.·. {sortIndicator('lastName')}
                    </button>
                  </th>
                  <th className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => toggleSort('category')}
                      className="font-semibold"
                    >
                      Categoría {sortIndicator('category')}
                    </button>
                  </th>
                  <th className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => toggleSort('grade')}
                      className="font-semibold"
                    >
                      Grado {sortIndicator('grade')}
                    </button>
                  </th>
                  <th className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => toggleSort('phone')}
                      className="font-semibold"
                    >
                      Celular {sortIndicator('phone')}
                    </button>
                  </th>
                  <th className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => toggleSort('email')}
                      className="font-semibold"
                    >
                      Email {sortIndicator('email')}
                    </button>
                  </th>
                  <th className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => toggleSort('status')}
                      className="font-semibold"
                    >
                      Estado {sortIndicator('status')}
                    </button>
                  </th>
                  <th className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => toggleSort('birthDate')}
                      className="font-semibold"
                    >
                      Nacimiento {sortIndicator('birthDate')}
                    </button>
                  </th>
                  {canEdit && <th className="px-3 py-2">Acciones</th>}
                </tr>

                <tr className="text-left text-xs text-ink/60">
                  <th className="px-3 py-2">
                    <input
                      value={filters.matricula}
                      onChange={(e) => setFilter('matricula', e.target.value)}
                      placeholder="Filtrar"
                      className="w-full rounded-xl border border-ink/10 px-3 py-2 text-xs"
                    />
                  </th>
                  <th className="px-3 py-2">
                    <div className="grid gap-2">
                      <input
                        value={filters.lastName}
                        onChange={(e) => setFilter('lastName', e.target.value)}
                        placeholder="Apellido"
                        className="w-full rounded-xl border border-ink/10 px-3 py-2 text-xs"
                      />
                      <input
                        value={filters.firstName}
                        onChange={(e) => setFilter('firstName', e.target.value)}
                        placeholder="Nombre"
                        className="w-full rounded-xl border border-ink/10 px-3 py-2 text-xs"
                      />
                    </div>
                  </th>
                  <th className="px-3 py-2">
                    <select
                      value={filters.category}
                      onChange={(e) => setFilter('category', e.target.value)}
                      className="w-full rounded-xl border border-ink/10 px-3 py-2 text-xs"
                    >
                      <option value="">Todas</option>
                      {CATEGORY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </th>
                  <th className="px-3 py-2">
                    <select
                      value={filters.grade}
                      onChange={(e) => setFilter('grade', e.target.value)}
                      className="w-full rounded-xl border border-ink/10 px-3 py-2 text-xs"
                    >
                      <option value="">Todos</option>
                      {GRADE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </th>
                  <th className="px-3 py-2">
                    <input
                      value={filters.phone}
                      onChange={(e) => setFilter('phone', e.target.value)}
                      placeholder="Filtrar"
                      className="w-full rounded-xl border border-ink/10 px-3 py-2 text-xs"
                    />
                  </th>
                  <th className="px-3 py-2">
                    <input
                      value={filters.email}
                      onChange={(e) => setFilter('email', e.target.value)}
                      placeholder="Filtrar"
                      className="w-full rounded-xl border border-ink/10 px-3 py-2 text-xs"
                    />
                  </th>
                  <th className="px-3 py-2">
                    <select
                      value={filters.status}
                      onChange={(e) => setFilter('status', e.target.value)}
                      className="w-full rounded-xl border border-ink/10 px-3 py-2 text-xs"
                    >
                      <option value="">Todos</option>
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </th>
                  <th className="px-3 py-2" />
                  {canEdit && <th className="px-3 py-2" />}
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((m) => {
                  const whatsappLink = buildWhatsappLink(m);

                  return (
                    <tr key={m.id} className="rounded-2xl bg-ink/5 text-sm">
                      <td className="rounded-l-2xl px-3 py-3 font-semibold text-ink">
                        {m.matricula}
                      </td>
                      <td className="px-3 py-3 text-ink">
                        {m.lastName}, {m.firstName}
                      </td>
                      <td className="px-3 py-3 text-ink/80">{categoryLabel(m.category)}</td>
                      <td className="px-3 py-3 text-ink/80">{gradeLabel(m.grade)}</td>
                      <td className="px-3 py-3 text-ink/80">
                        {m.phone ? (
                          <a
                            href={whatsappLink ?? undefined}
                            target="_blank"
                            rel="noreferrer"
                            className="underline decoration-ink/30 underline-offset-4 hover:text-accent"
                            title="Abrir WhatsApp"
                          >
                            {m.phone}
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-3 py-3 text-ink/80">{m.email ?? '-'}</td>
                      <td className="px-3 py-3 text-ink/80">
                        {statusLabel(m.status)}
                      </td>
                      <td className="px-3 py-3 text-ink/80">
                        {m.birthDate
                          ? new Date(m.birthDate).toLocaleDateString('es-AR')
                          : '-'}
                      </td>
                      {canEdit && (
                        <td className="rounded-r-2xl px-3 py-3">
                          <button
                            type="button"
                            onClick={() => openEdit(m)}
                            className="rounded-xl border border-ink/10 px-3 py-2 text-xs font-semibold"
                          >
                            Editar
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {canEdit && showForm && (
        <SectionCard
          title={isEditing ? 'Editar H.·.' : 'Nuevo H.·.'}
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
                Fecha de nacimiento
              </label>
              <input
                type="date"
                value={form.birthDate}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, birthDate: e.target.value }))
                }
                className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
              />
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
