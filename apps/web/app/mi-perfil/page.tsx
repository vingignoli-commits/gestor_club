"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { SectionCard } from "../../components/section-card";
import { useAuth } from "../../context/auth";
import { api } from "../../lib/api";

type ProfileResponse = {
  member: {
    id: string;
    matricula: string;
    firstName: string;
    lastName: string;
    fullName: string;
    category: string;
    status: string;
    grade: string | null;
    phone: string | null;
    email: string | null;
    notes: string | null;
    documentNumber: string | null;
    joinedAt: string;
    initiationDate: string;
    fellowcraftDate: string | null;
    masterDate: string | null;
    birthDate: string | null;
    seniorityYears: number;
  };
  account: {
    currentRate: number;
    debt: {
      debt: number;
      monthsOwed: number;
      owesCurrentMonth: boolean;
      overdueMonthsCount: number;
      overdueMonthLabels: string[];
      months: Array<{
        periodYear: number;
        periodMonth: number;
        label: string;
        category: string;
        amount: number;
        overdue: boolean;
        isCurrentMonth: boolean;
      }>;
    };
    lastPayments: Array<{
      id: string;
      paidAt: string;
      periodYear: number;
      periodMonth: number;
      amount: number;
      methodCode: string;
      receiptUrl: string | null;
      receiptNote: string | null;
    }>;
  };
  history: {
    status: Array<{
      id: string;
      status: string;
      effectiveFrom: string;
      effectiveTo: string | null;
      reason: string | null;
    }>;
    category: Array<{
      id: string;
      category: string;
      effectiveFrom: string;
      effectiveTo: string | null;
      reason: string | null;
    }>;
  };
};

const CATEGORY_LABELS: Record<string, string> = {
  SIMPLE: "Simple",
  DOBLE: "Doble",
  ESTUDIANTE: "Estudiante",
  SOCIAL: "Social",
  MENOR: "Menor",
  HONOR: "Honor",
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
};

const GRADE_LABELS: Record<string, string> = {
  APRENDIZ: "Aprendiz",
  COMPANERO: "Compañero",
  MAESTRO: "Maestro",
};

function fmt(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return value.slice(0, 10).split("-").reverse().join("/");
}

function categoryLabel(value: string) {
  return CATEGORY_LABELS[value] ?? value;
}

function statusLabel(value: string) {
  return STATUS_LABELS[value] ?? value;
}

function gradeLabel(value: string | null) {
  if (!value) return "-";
  return GRADE_LABELS[value] ?? value;
}

function ChangePasswordCard() {
  const { user, refreshUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Solo lo ve quien todavía conserva la contraseña que le asignó un tercero.
  const mustChange = user?.mustChangePassword === true;

  const inputClass =
    "w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword.length < 8) {
      setError("La contraseña nueva debe tener al menos 8 caracteres.");
      return;
    }

    if (newPassword !== repeatPassword) {
      setError("La contraseña nueva y su repetición no coinciden.");
      return;
    }

    setSaving(true);

    try {
      await api.post("/auth/me/password", { currentPassword, newPassword });
      setSuccess("Contraseña actualizada.");
      setCurrentPassword("");
      setNewPassword("");
      setRepeatPassword("");
      // Refresca el usuario para que el aviso de primer ingreso desaparezca.
      await refreshUser().catch(() => undefined);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cambiar la contraseña.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard
      title="Cambiar contraseña"
      description="Para cambiarla necesitás escribir tu contraseña actual."
    >
      {mustChange && (
        <div className="mb-5 rounded-2xl border border-accent/20 bg-accent/10 px-5 py-4 text-sm leading-relaxed text-ink">
          <div className="font-semibold">Hola Q.·.H.·.</div>
          <p className="mt-1 text-ink/80">
            Este es tu primer ingreso. Por eso te pido que cambies tu
            contraseña, ya que la actual es compartida y la conocen otros HH.·.
          </p>
          <div className="mt-2 font-semibold">Fuerte T.·.A.·.F.·.</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-md space-y-3">
        <div>
          <label
            htmlFor="currentPassword"
            className="mb-1 block text-xs uppercase tracking-wide text-ink/50"
          >
            Contraseña actual
          </label>
          <input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label
            htmlFor="newPassword"
            className="mb-1 block text-xs uppercase tracking-wide text-ink/50"
          >
            Contraseña nueva
          </label>
          <input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className={inputClass}
          />
          <div className="mt-1 text-xs text-ink/50">Mínimo 8 caracteres.</div>
        </div>

        <div>
          <label
            htmlFor="repeatPassword"
            className="mb-1 block text-xs uppercase tracking-wide text-ink/50"
          >
            Repetir contraseña nueva
          </label>
          <input
            id="repeatPassword"
            type="password"
            autoComplete="new-password"
            required
            value={repeatPassword}
            onChange={(event) => setRepeatPassword(event.target.value)}
            className={inputClass}
          />
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Guardando..." : "Cambiar contraseña"}
        </button>
      </form>
    </SectionCard>
  );
}

export default function MiPerfilPage() {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<ProfileResponse>("/auth/me/profile")
      .then(setProfile)
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : "No se pudo cargar tu perfil",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const nextBirthday = useMemo(() => {
    if (!profile?.member.birthDate) return "-";
    const [, month, day] = profile.member.birthDate.slice(0, 10).split("-");
    return `${day}/${month}`;
  }, [profile]);

  if (loading) {
    return (
      <SectionCard
        title="Mi Perfil"
        description="Cargando información personal."
      >
        <div className="py-8 text-sm text-ink/60">Cargando...</div>
      </SectionCard>
    );
  }

  if (error || !profile) {
    // Aunque la ficha no cargue (p. ej. usuario sin socio vinculado), el
    // cambio de contraseña tiene que seguir disponible.
    return (
      <div className="space-y-6">
        <SectionCard title="Mi Perfil" description="Ficha personal del usuario.">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error || "No hay información disponible."}
          </div>
        </SectionCard>

        <ChangePasswordCard />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Mi Perfil"
        description="Información personal, estado de cuenta y datos administrativos vinculados a tu usuario."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-ink/10 bg-ink/5 p-4">
            <div className="text-xs uppercase tracking-wide text-ink/50">
              Matrícula
            </div>
            <div className="mt-2 text-2xl font-bold text-ink">
              {profile.member.matricula}
            </div>
          </div>
          <div className="rounded-2xl border border-ink/10 bg-ink/5 p-4">
            <div className="text-xs uppercase tracking-wide text-ink/50">
              Grado
            </div>
            <div className="mt-2 text-2xl font-bold text-ink">
              {gradeLabel(profile.member.grade)}
            </div>
          </div>
          <div className="rounded-2xl border border-ink/10 bg-ink/5 p-4">
            <div className="text-xs uppercase tracking-wide text-ink/50">
              Categoría
            </div>
            <div className="mt-2 text-2xl font-bold text-ink">
              {categoryLabel(profile.member.category)}
            </div>
          </div>
          <div className="rounded-2xl border border-ink/10 bg-ink/5 p-4">
            <div className="text-xs uppercase tracking-wide text-ink/50">
              Estado
            </div>
            <div className="mt-2 text-2xl font-bold text-ink">
              {statusLabel(profile.member.status)}
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard
          title="Datos Personales"
          description="Ficha personal vinculada al Cuadro."
        >
          <div className="grid gap-3 text-sm text-ink/80">
            <div>
              <strong>Nombre:</strong> {profile.member.firstName}
            </div>
        
            <div>
              <strong>Apellido:</strong> {profile.member.lastName}
            </div>
        
            <div>
              <strong>Documento:</strong>{" "}
              {profile.member.documentNumber ?? "-"}
            </div>
        
            <div>
              <strong>Fecha de iniciación:</strong>{" "}
              {formatDate(profile.member.initiationDate)}
            </div>
        
            <div>
              <strong>Fecha de compañero:</strong>{" "}
              {formatDate(profile.member.fellowcraftDate)}
            </div>
        
            <div>
              <strong>Fecha de maestro:</strong>{" "}
              {formatDate(profile.member.masterDate)}
            </div>
        
            <div>
              <strong>Antigüedad masónica:</strong>{" "}
              {profile.member.seniorityYears} años
            </div>
        
            <div>
              <strong>Fecha de nacimiento:</strong>{" "}
              {formatDate(profile.member.birthDate)}
            </div>
        
            <div>
              <strong>Teléfono:</strong>{" "}
              {profile.member.phone ?? "-"}
            </div>
        
            <div>
              <strong>Email:</strong>{" "}
              {profile.member.email ?? "-"}
            </div>
        
            <div>
              <strong>Notas:</strong>{" "}
              {profile.member.notes ?? "-"}
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Estado de cuenta"
          description="Resumen de cuotas, pagos y deuda registrada."
        >
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-ink/10 bg-ink/5 p-4">
              <div className="text-xs uppercase tracking-wide text-ink/50">
                Cuota vigente
              </div>
              <div className="mt-2 text-xl font-bold text-ink">
                {fmt(profile.account.currentRate)}
              </div>
            </div>
            <div className="rounded-2xl border border-ink/10 bg-rose-50 p-4">
              <div className="text-xs uppercase tracking-wide text-ink/50">
                Deuda actual
              </div>
              <div className="mt-2 text-xl font-bold text-rose-700">
                {fmt(profile.account.debt.debt)}
              </div>
            </div>
            <div className="rounded-2xl border border-ink/10 bg-ink/5 p-4">
              <div className="text-xs uppercase tracking-wide text-ink/50">
                Meses adeudados
              </div>
              <div className="mt-2 text-xl font-bold text-ink">
                {profile.account.debt.monthsOwed}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-3 text-sm font-semibold text-ink">
              Detalle de deuda
            </div>
            {profile.account.debt.months.length === 0 ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                No registrás deuda actual.
              </div>
            ) : (
              <div className="space-y-2">
                {profile.account.debt.months.map((month) => (
                  <div
                    key={`${month.periodYear}-${month.periodMonth}`}
                    className="flex items-center justify-between rounded-2xl bg-ink/5 px-4 py-3 text-sm"
                  >
                    <span>{month.label}</span>
                    <span className="font-bold text-ink">
                      {fmt(month.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Últimos pagos"
        description="Pagos registrados en tu cuenta."
      >
        {profile.account.lastPayments.length === 0 ? (
          <div className="py-8 text-sm text-ink/60">
            No hay pagos registrados.
          </div>
        ) : (
          <div className="grid gap-3 md:hidden">
            {profile.account.lastPayments.map((payment) => (
              <div
                key={payment.id}
                className="rounded-2xl border border-ink/10 bg-white p-4 text-sm"
              >
                <div className="font-semibold text-ink">
                  {String(payment.periodMonth).padStart(2, "0")}/
                  {payment.periodYear}
                </div>
                <div className="text-ink/70">
                  Fecha: {formatDate(payment.paidAt)}
                </div>
                <div className="text-ink/70">Método: {payment.methodCode}</div>
                <div className="mt-2 text-lg font-bold text-ink">
                  {fmt(payment.amount)}
                </div>
              </div>
            ))}
          </div>
        )}

        {profile.account.lastPayments.length > 0 && (
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full border-separate border-spacing-y-2">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-ink/50">
                  <th className="px-3 py-2">Período</th>
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Monto</th>
                  <th className="px-3 py-2">Método</th>
                  <th className="px-3 py-2">Comprobante</th>
                </tr>
              </thead>
              <tbody>
                {profile.account.lastPayments.map((payment) => (
                  <tr key={payment.id} className="rounded-2xl bg-ink/5 text-sm">
                    <td className="rounded-l-2xl px-3 py-3 text-ink">
                      {String(payment.periodMonth).padStart(2, "0")}/
                      {payment.periodYear}
                    </td>
                    <td className="px-3 py-3 text-ink/80">
                      {formatDate(payment.paidAt)}
                    </td>
                    <td className="px-3 py-3 font-semibold text-ink">
                      {fmt(payment.amount)}
                    </td>
                    <td className="px-3 py-3 text-ink/80">
                      {payment.methodCode}
                    </td>
                    <td className="rounded-r-2xl px-3 py-3 text-ink/80">
                      {payment.receiptUrl ? (
                        <a
                          href={payment.receiptUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-accent underline underline-offset-4"
                        >
                          Ver
                        </a>
                      ) : payment.receiptNote ? (
                        payment.receiptNote
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Historial de categoría"
          description="Cambios registrados de categoría."
        >
          {profile.history.category.length === 0 ? (
            <div className="text-sm text-ink/60">Sin historial registrado.</div>
          ) : (
            <div className="space-y-3">
              {profile.history.category.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-ink/10 bg-white p-4 text-sm"
                >
                  <div className="font-semibold text-ink">
                    {categoryLabel(item.category)}
                  </div>
                  <div className="text-ink/70">
                    Desde: {formatDate(item.effectiveFrom)}
                  </div>
                  <div className="text-ink/70">
                    Hasta:{" "}
                    {item.effectiveTo ? formatDate(item.effectiveTo) : "Actual"}
                  </div>
                  <div className="mt-1 text-xs text-ink/50">
                    {item.reason ?? "-"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Historial de estado"
          description="Cambios registrados de estado."
        >
          {profile.history.status.length === 0 ? (
            <div className="text-sm text-ink/60">Sin historial registrado.</div>
          ) : (
            <div className="space-y-3">
              {profile.history.status.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-ink/10 bg-white p-4 text-sm"
                >
                  <div className="font-semibold text-ink">
                    {statusLabel(item.status)}
                  </div>
                  <div className="text-ink/70">
                    Desde: {formatDate(item.effectiveFrom)}
                  </div>
                  <div className="text-ink/70">
                    Hasta:{" "}
                    {item.effectiveTo ? formatDate(item.effectiveTo) : "Actual"}
                  </div>
                  <div className="mt-1 text-xs text-ink/50">
                    {item.reason ?? "-"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <ChangePasswordCard />
    </div>
  );
}
