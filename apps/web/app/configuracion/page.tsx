'use client';

import { useEffect, useMemo, useState } from 'react';
import { SectionCard } from '../../components/section-card';
import { useAuth } from '../../context/auth';
import { api } from '../../lib/api';

type UserRole = 'ADMIN' | 'SOCIO';

type PermissionKey =
  | 'dashboard:read'
  | 'dashboard:full'
  | 'members:read'
  | 'members:write'
  | 'profile:own'
  | 'debt:own'
  | 'debt:all'
  | 'treasury:read'
  | 'treasury:write'
  | 'cash:read'
  | 'cash:write'
  | 'reports:read'
  | 'messaging:read'
  | 'messaging:write'
  | 'audit:read'
  | 'settings:read'
  | 'settings:write';

type MemberOption = {
  id: string;
  matricula: string;
  firstName: string;
  lastName: string;
  category: string;
  status: string;
  grade: string | null;
  email: string | null;
};

type SystemUser = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  memberId: string | null;
  member: {
    id: string;
    matricula: string;
    firstName: string;
    lastName: string;
  } | null;
  permissions: string[];
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type UserForm = {
  email: string;
  fullName: string;
  role: UserRole;
  memberId: string;
  password: string;
  permissions: string[];
};

const PERMISSION_GROUPS: Array<{
  title: string;
  items: Array<{ key: PermissionKey; label: string }>;
}> = [
  {
    title: 'Lectura base',
    items: [
      { key: 'dashboard:read', label: 'Ver dashboard' },
      { key: 'members:read', label: 'Ver cuadro' },
      { key: 'profile:own', label: 'Ver mi perfil' },
      { key: 'debt:own', label: 'Ver mi deuda' },
    ],
  },
  {
    title: 'Permisos especiales del socio',
    items: [
      { key: 'dashboard:full', label: 'Dashboard completo' },
      { key: 'members:write', label: 'Editar cuadro' },
      { key: 'debt:all', label: 'Ver deuda de otros' },
      { key: 'treasury:read', label: 'Ver tesorería' },
      { key: 'cash:read', label: 'Ver caja' },
      { key: 'reports:read', label: 'Ver reportes' },
      { key: 'messaging:read', label: 'Ver mensajería' },
      { key: 'audit:read', label: 'Ver auditoría' },
    ],
  },
  {
    title: 'Permisos de escritura',
    items: [
      { key: 'treasury:write', label: 'Editar tesorería' },
      { key: 'cash:write', label: 'Editar caja' },
      { key: 'messaging:write', label: 'Enviar/editar mensajes' },
      { key: 'settings:read', label: 'Ver configuración' },
      { key: 'settings:write', label: 'Editar configuración' },
    ],
  },
];

const DEFAULT_SOCIO_PERMISSIONS = [
  'dashboard:read',
  'members:read',
  'profile:own',
  'debt:own',
];

function emptyUserForm(): UserForm {
  return {
    email: '',
    fullName: '',
    role: 'SOCIO',
    memberId: '',
    password: '',
    permissions: DEFAULT_SOCIO_PERMISSIONS,
  };
}

function formatDateTime(value: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('es-AR');
}

function roleLabel(role: UserRole) {
  if (role === 'ADMIN') return 'Administrador';
  return 'Socio';
}

function statusLabel(isActive: boolean) {
  return isActive ? 'Activo' : 'Inactivo';
}

function memberLabel(member: MemberOption) {
  return `${member.lastName}, ${member.firstName} — ${member.matricula}`;
}

function linkedMemberLabel(member: SystemUser['member']) {
  if (!member) return '-';
  return `${member.lastName}, ${member.firstName} — ${member.matricula}`;
}

export default function ConfiguracionPage() {
  const { user, canEdit } = useAuth();

  const [users, setUsers] = useState<SystemUser[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showUserForm, setShowUserForm] = useState(false);
  const [userForm, setUserForm] = useState<UserForm>(emptyUserForm());

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingFullName, setEditingFullName] = useState('');
  const [editingRole, setEditingRole] = useState<UserRole>('SOCIO');
  const [editingMemberId, setEditingMemberId] = useState('');
  const [editingPermissions, setEditingPermissions] = useState<string[]>([]);

  const [passwordUserId, setPasswordUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const isAdmin = user?.role === 'ADMIN';

  const activeUsers = useMemo(
    () => users.filter((item) => item.isActive).length,
    [users],
  );

  const inactiveUsers = useMemo(
    () => users.filter((item) => !item.isActive).length,
    [users],
  );

  async function loadData() {
    const [usersData, membersData] = await Promise.all([
      api.get<SystemUser[]>('/auth/users'),
      api.get<MemberOption[]>('/auth/users/member-options'),
    ]);

    setUsers(usersData);
    setMembers(membersData);
  }

  useEffect(() => {
    loadData()
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Error al cargar configuración');
      })
      .finally(() => setLoading(false));
  }, []);

  function clearMessages() {
    setError('');
    setSuccess('');
  }

  function togglePermission(permission: string, mode: 'create' | 'edit') {
    if (mode === 'create') {
      setUserForm((prev) => ({
        ...prev,
        permissions: prev.permissions.includes(permission)
          ? prev.permissions.filter((item) => item !== permission)
          : [...prev.permissions, permission],
      }));
      return;
    }

    setEditingPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((item) => item !== permission)
        : [...prev, permission],
    );
  }

  function openCreateUser() {
    clearMessages();
    setUserForm(emptyUserForm());
    setShowUserForm(true);
  }

  function closeCreateUser() {
    setShowUserForm(false);
    setUserForm(emptyUserForm());
  }

  function openEditUser(item: SystemUser) {
    clearMessages();
    setEditingUserId(item.id);
    setEditingFullName(item.fullName);
    setEditingRole(item.role);
    setEditingMemberId(item.memberId ?? '');
    setEditingPermissions(item.permissions);
  }

  function closeEditUser() {
    setEditingUserId(null);
    setEditingFullName('');
    setEditingRole('SOCIO');
    setEditingMemberId('');
    setEditingPermissions([]);
  }

  function openPasswordReset(item: SystemUser) {
    clearMessages();
    setPasswordUserId(item.id);
    setNewPassword('');
  }

  function closePasswordReset() {
    setPasswordUserId(null);
    setNewPassword('');
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;

    clearMessages();
    setSaving(true);

    try {
      await api.post('/auth/users', {
        email: userForm.email.trim(),
        fullName: userForm.fullName.trim(),
        role: userForm.role,
        memberId: userForm.memberId || null,
        password: userForm.password,
        permissions: userForm.permissions,
      });

      closeCreateUser();
      setSuccess('Usuario creado correctamente.');
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al crear usuario');
    } finally {
      setSaving(false);
    }
  }

  async function handleEditUser(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin || !editingUserId) return;

    clearMessages();
    setSaving(true);

    try {
      await api.patch(`/auth/users/${editingUserId}`, {
        fullName: editingFullName.trim(),
        role: editingRole,
        memberId: editingMemberId || null,
        permissions: editingPermissions,
      });

      closeEditUser();
      setSuccess('Usuario actualizado correctamente.');
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al actualizar usuario');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleUserStatus(item: SystemUser) {
    if (!isAdmin) return;

    clearMessages();
    setSaving(true);

    try {
      await api.patch(`/auth/users/${item.id}`, {
        isActive: !item.isActive,
      });

      setSuccess(
        item.isActive
          ? 'Usuario desactivado correctamente.'
          : 'Usuario activado correctamente.',
      );
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cambiar estado');
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin || !passwordUserId) return;

    clearMessages();
    setSaving(true);

    try {
      await api.post(`/auth/users/${passwordUserId}/reset-password`, {
        password: newPassword,
      });

      closePasswordReset();
      setSuccess('Contraseña actualizada correctamente.');
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Error al cambiar contraseña',
      );
    } finally {
      setSaving(false);
    }
  }

  function PermissionEditor({
    permissions,
    mode,
  }: {
    permissions: string[];
    mode: 'create' | 'edit';
  }) {
    return (
      <div className="space-y-4 rounded-2xl border border-ink/10 bg-ink/5 p-4 md:col-span-2">
        <div>
          <div className="text-sm font-semibold text-ink">Permisos</div>
          <div className="mt-1 text-xs text-ink/60">
            El administrador siempre tiene acceso total. Estos permisos aplican principalmente a usuarios socio.
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {PERMISSION_GROUPS.map((group) => (
            <div key={group.title} className="rounded-2xl bg-white p-3">
              <div className="mb-3 text-xs font-bold uppercase tracking-wide text-ink/50">
                {group.title}
              </div>
              <div className="space-y-2">
                {group.items.map((item) => (
                  <label key={item.key} className="flex items-start gap-2 text-sm text-ink/80">
                    <input
                      type="checkbox"
                      checked={permissions.includes(item.key)}
                      onChange={() => togglePermission(item.key, mode)}
                      className="mt-1"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!isAdmin || !canEdit) {
    return (
      <SectionCard
        title="Configuración"
        description="Acceso restringido a administradores."
      >
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Tu usuario no tiene permisos para administrar la configuración del sistema.
        </div>
      </SectionCard>
    );
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Configuración"
        description="Administración de usuarios, vínculos con socios y permisos del sistema."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-ink/10 bg-ink/5 p-4">
            <div className="text-xs uppercase tracking-wide text-ink/50">
              Usuarios totales
            </div>
            <div className="mt-2 text-2xl font-bold text-ink">
              {users.length}
            </div>
          </div>

          <div className="rounded-2xl border border-ink/10 bg-emerald-50 p-4">
            <div className="text-xs uppercase tracking-wide text-ink/50">
              Activos
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-700">
              {activeUsers}
            </div>
          </div>

          <div className="rounded-2xl border border-ink/10 bg-rose-50 p-4">
            <div className="text-xs uppercase tracking-wide text-ink/50">
              Inactivos
            </div>
            <div className="mt-2 text-2xl font-bold text-rose-700">
              {inactiveUsers}
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-6 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={openCreateUser}
            className="rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-white"
          >
            + Nuevo usuario
          </button>
        </div>
      </SectionCard>

      <SectionCard
        title="Usuarios del sistema"
        description="Asociá usuarios socio con un H.·. y definí permisos individuales."
      >
        {loading ? (
          <div className="py-8 text-sm text-ink/60">Cargando usuarios...</div>
        ) : users.length === 0 ? (
          <div className="py-8 text-sm text-ink/60">
            No hay usuarios registrados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-ink/50">
                  <th className="px-3 py-2">Usuario</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Rol</th>
                  <th className="px-3 py-2">Socio vinculado</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Último ingreso</th>
                  <th className="px-3 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((item) => (
                  <tr key={item.id} className="rounded-2xl bg-ink/5 text-sm">
                    <td className="rounded-l-2xl px-3 py-3 font-semibold text-ink">
                      {item.fullName}
                    </td>
                    <td className="px-3 py-3 text-ink/80">{item.email}</td>
                    <td className="px-3 py-3 text-ink/80">
                      {roleLabel(item.role)}
                    </td>
                    <td className="px-3 py-3 text-ink/80">
                      {linkedMemberLabel(item.member)}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-xl border px-2 py-1 text-xs font-semibold ${
                          item.isActive
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-rose-200 bg-rose-50 text-rose-700'
                        }`}
                      >
                        {statusLabel(item.isActive)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-ink/80">
                      {formatDateTime(item.lastLoginAt)}
                    </td>
                    <td className="rounded-r-2xl px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openEditUser(item)}
                          className="rounded-xl border border-ink/10 px-3 py-2 text-xs font-semibold"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => openPasswordReset(item)}
                          className="rounded-xl border border-ink/10 px-3 py-2 text-xs font-semibold"
                        >
                          Contraseña
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleUserStatus(item)}
                          disabled={saving || item.id === user?.id}
                          className={`rounded-xl border px-3 py-2 text-xs font-semibold disabled:opacity-50 ${
                            item.isActive
                              ? 'border-rose-200 bg-rose-50 text-rose-700'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {item.isActive ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {showUserForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3 py-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-ink/10 pb-4">
              <div>
                <h2 className="text-xl font-bold text-ink">Nuevo usuario</h2>
                <p className="mt-1 text-sm text-ink/60">
                  Creá usuarios administradores o socios vinculados al Cuadro.
                </p>
              </div>
              <button
                type="button"
                onClick={closeCreateUser}
                className="rounded-2xl border border-ink/10 px-4 py-2 text-sm font-semibold"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-ink/80">
                  Nombre completo
                </label>
                <input
                  value={userForm.fullName}
                  onChange={(e) =>
                    setUserForm((prev) => ({ ...prev, fullName: e.target.value }))
                  }
                  required
                  className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-ink/80">
                  Email
                </label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) =>
                    setUserForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  required
                  className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-ink/80">
                  Rol
                </label>
                <select
                  value={userForm.role}
                  onChange={(e) =>
                    setUserForm((prev) => ({
                      ...prev,
                      role: e.target.value as UserRole,
                    }))
                  }
                  className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
                >
                  <option value="SOCIO">Socio</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-ink/80">
                  Socio vinculado
                </label>
                <select
                  value={userForm.memberId}
                  onChange={(e) =>
                    setUserForm((prev) => ({ ...prev, memberId: e.target.value }))
                  }
                  className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
                >
                  <option value="">Sin vincular</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {memberLabel(member)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-ink/80">
                  Contraseña inicial
                </label>
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(e) =>
                    setUserForm((prev) => ({ ...prev, password: e.target.value }))
                  }
                  minLength={8}
                  required
                  className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
                />
              </div>

              <PermissionEditor permissions={userForm.permissions} mode="create" />

              <div className="md:col-span-2 flex gap-3">
                <button
                  type="button"
                  onClick={closeCreateUser}
                  className="flex-1 rounded-2xl border border-ink/10 px-4 py-3 text-sm font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {saving ? 'Creando...' : 'Crear usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3 py-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-ink/10 pb-4">
              <div>
                <h2 className="text-xl font-bold text-ink">Editar usuario</h2>
              </div>
              <button
                type="button"
                onClick={closeEditUser}
                className="rounded-2xl border border-ink/10 px-4 py-2 text-sm font-semibold"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleEditUser} className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-ink/80">
                  Nombre completo
                </label>
                <input
                  value={editingFullName}
                  onChange={(e) => setEditingFullName(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-ink/80">
                  Rol
                </label>
                <select
                  value={editingRole}
                  onChange={(e) => setEditingRole(e.target.value as UserRole)}
                  className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
                >
                  <option value="SOCIO">Socio</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-ink/80">
                  Socio vinculado
                </label>
                <select
                  value={editingMemberId}
                  onChange={(e) => setEditingMemberId(e.target.value)}
                  className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
                >
                  <option value="">Sin vincular</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {memberLabel(member)}
                    </option>
                  ))}
                </select>
              </div>

              <PermissionEditor permissions={editingPermissions} mode="edit" />

              <div className="md:col-span-2 flex gap-3">
                <button
                  type="button"
                  onClick={closeEditUser}
                  className="flex-1 rounded-2xl border border-ink/10 px-4 py-3 text-sm font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {passwordUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3 py-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-5 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-ink/10 pb-4">
              <div>
                <h2 className="text-xl font-bold text-ink">Cambiar contraseña</h2>
                <p className="mt-1 text-sm text-ink/60">
                  La nueva contraseña debe tener al menos 8 caracteres.
                </p>
              </div>
              <button
                type="button"
                onClick={closePasswordReset}
                className="rounded-2xl border border-ink/10 px-4 py-2 text-sm font-semibold"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-ink/80">
                  Nueva contraseña
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  required
                  className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closePasswordReset}
                  className="flex-1 rounded-2xl border border-ink/10 px-4 py-3 text-sm font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {saving ? 'Guardando...' : 'Cambiar contraseña'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
