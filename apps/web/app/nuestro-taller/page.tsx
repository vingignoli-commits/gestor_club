"use client";

import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "../../components/section-card";
import { api } from "../../lib/api";
import { formatBirthday } from "../../lib/date";

type TallerData = {
  activeMembers: number;
  grades: {
    masters: number;
    fellows: number;
    apprentices: number;
    mastersOfHonor: number;
  };
  averageAge: number;
  averageSeniority: number;
  generations: Array<{ label: string; count: number }>;
  birthdays: Array<{
    id: string;
    fullName: string;
    firstName: string;
    grade: string | null;
    phone: string | null;
    date: string;
    day: number;
    month: number;
    daysUntil: number;
    turningAge: number;
  }>;
};

type Birthday = TallerData["birthdays"][number];

function birthdayWhatsappLink(member: Birthday): string | null {
  if (!member.phone) return null;

  const celular = member.phone.replace(/\D/g, "");
  if (!celular) return null;

  const saludo = member.grade === "MAESTRO" ? "V.·.H.·." : "Q.·.H.·.";
  const texto =
    `¡Feliz cumpleaños, ${saludo} ${member.firstName}! 🎂 En este día tan especial, ` +
    `todo el Taller te abraza fraternalmente y te desea salud, fuerza y unión. ` +
    `Que el G.·.A.·.D.·.U.·. te colme de bendiciones.`;

  return `https://wa.me/${celular}?text=${encodeURIComponent(texto)}`;
}

type Announcement = {
  id: string;
  title: string;
  body: string;
  isPinned: boolean;
  createdAt: string;
};

const READ_STORAGE_KEY = "taller_read_announcements";

function loadReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(READ_STORAGE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function persistReadIds(ids: Set<string>) {
  try {
    window.localStorage.setItem(READ_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // localStorage puede fallar en modo privado; el aviso simplemente vuelve a
    // aparecer como no leído, que es un degradado aceptable.
  }
}

function GradeTile({
  abbr,
  meaning,
  value,
  emphasis = false,
}: {
  abbr: string;
  meaning: string;
  value: number;
  emphasis?: boolean;
}) {
  return (
    <article
      className={`rounded-3xl p-5 shadow-card ${
        emphasis ? "bg-accent text-white" : "bg-panel text-ink"
      }`}
    >
      <p
        className={`text-2xl font-semibold tracking-tight ${
          emphasis ? "text-white" : "text-ink"
        }`}
      >
        {abbr}
      </p>
      <p
        className={`mt-3 font-display text-4xl font-semibold ${
          emphasis ? "text-white" : "text-ink"
        }`}
      >
        {value}
      </p>
      <p className={`mt-2 text-sm ${emphasis ? "text-white/80" : "text-ink/60"}`}>
        {meaning}
      </p>
    </article>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-ink/5 p-5">
      <div className="text-xs uppercase tracking-[0.18em] text-ink/50">{label}</div>
      <div className="mt-2 text-3xl font-bold text-ink">{value}</div>
      <div className="mt-1 text-sm text-ink/60">{hint}</div>
    </div>
  );
}

function GenerationsChart({
  data,
}: {
  data: Array<{ label: string; count: number }>;
}) {
  const max = Math.max(1, ...data.map((item) => item.count));

  if (data.length === 0) {
    return (
      <p className="text-sm text-ink/50">
        Todavía no hay fechas de nacimiento cargadas para agrupar por generación.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <div className="w-36 shrink-0 text-sm font-medium text-ink/70">
            {item.label}
          </div>
          <div className="flex flex-1 items-center gap-2">
            <div className="h-4 flex-1 overflow-hidden rounded-full bg-ink/5">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${(item.count / max) * 100}%` }}
              />
            </div>
            <span className="w-8 shrink-0 text-right text-sm font-semibold text-ink">
              {item.count}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function birthdayLabel(daysUntil: number) {
  if (daysUntil === 0) return "¡Hoy!";
  if (daysUntil === 1) return "Mañana";
  return `En ${daysUntil} días`;
}

export default function NuestroTallerPage() {
  const [data, setData] = useState<TallerData | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setReadIds(loadReadIds());

    Promise.all([
      api.get<TallerData>("/dashboard/taller"),
      api.get<Announcement[]>("/announcements"),
    ])
      .then(([taller, avisos]) => {
        setData(taller);
        setAnnouncements(avisos);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const unreadCount = useMemo(
    () => announcements.filter((item) => !readIds.has(item.id)).length,
    [announcements, readIds],
  );

  function markRead(id: string) {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      persistReadIds(next);
      return next;
    });
  }

  function markAllRead() {
    setReadIds(() => {
      const next = new Set(announcements.map((item) => item.id));
      persistReadIds(next);
      return next;
    });
  }

  if (loading) {
    return <p className="text-sm text-ink/50">Cargando el taller…</p>;
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
        {error}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold text-ink">
          Nuestro Taller
        </h1>
        <p className="mt-1 text-sm text-ink/60">
          Una mirada de comunidad al estado del taller: quiénes lo integran, sus
          generaciones y los avisos que nos unen.
        </p>
      </header>

      <SectionCard
        title="Composición del taller"
        description="Cantidad de HH.·. por grado"
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <GradeTile
            abbr="HH.·."
            meaning="Hermanos activos"
            value={data.activeMembers}
            emphasis
          />
          <GradeTile
            abbr="MM.·."
            meaning="Maestros"
            value={data.grades.masters}
          />
          <GradeTile
            abbr="Comp.·."
            meaning="Compañeros"
            value={data.grades.fellows}
          />
          <GradeTile
            abbr="Ap.·."
            meaning="Aprendices"
            value={data.grades.apprentices}
          />
          <GradeTile
            abbr="MdH.·."
            meaning="Miembros de Honor"
            value={data.grades.mastersOfHonor}
          />
        </div>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="Perfil del taller"
          description="Promedios de los HH.·. activos."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <MetricCard
              label="Edad promedio"
              value={`${data.averageAge.toFixed(1)} años`}
              hint="Promedio de edad de los HH.·. activos"
            />
            <MetricCard
              label="Antigüedad masónica"
              value={`${data.averageSeniority.toFixed(1)} años`}
              hint="Promedio de años desde la fecha de iniciación"
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Generaciones"
          description="HH.·. activos agrupados por generación según su año de nacimiento."
        >
          <GenerationsChart data={data.generations} />
        </SectionCard>
      </div>

      <SectionCard
        title="Cumpleaños de HH.·."
        description="Hermanos que cumplen años en los próximos 30 días."
      >
        {data.birthdays.length === 0 ? (
          <p className="text-sm text-ink/50">
            No hay cumpleaños en los próximos 30 días.
          </p>
        ) : (
          <div className="space-y-2">
            {data.birthdays.map((member) => {
              if (member.daysUntil === 0) {
                const waLink = birthdayWhatsappLink(member);

                return (
                  <div
                    key={member.id}
                    className="rounded-2xl border border-accent/30 bg-accent/5 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🎂</span>
                          <span className="font-semibold text-accent">
                            ¡Felicitá a nuestro H.·.!
                          </span>
                        </div>
                        <div className="mt-1 font-medium text-ink">
                          {member.fullName}
                        </div>
                        <div className="text-sm text-ink/60">
                          Hoy cumple {member.turningAge} años
                        </div>
                      </div>
                      {waLink ? (
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
                        >
                          Saludar por WhatsApp
                        </a>
                      ) : (
                        <span className="shrink-0 text-xs text-ink/40">
                          Sin teléfono cargado
                        </span>
                      )}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={member.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-ink/10 bg-white px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-ink">{member.fullName}</div>
                    <div className="text-sm text-ink/50">
                      {formatBirthday(member.date)} · cumple {member.turningAge}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                      member.daysUntil === 1
                        ? "bg-accent/15 text-accent"
                        : "bg-ink/5 text-ink/60"
                    }`}
                  >
                    {birthdayLabel(member.daysUntil)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Avisos"
        description="Comunicaciones del taller. Los no leídos aparecen destacados."
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="text-sm text-ink/60">
            {unreadCount > 0
              ? `${unreadCount} sin leer`
              : "Estás al día con los avisos"}
          </span>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="rounded-2xl border border-ink/10 bg-white px-4 py-2 text-sm font-semibold text-ink/70 hover:bg-ink/5"
            >
              Marcar todo como leído
            </button>
          )}
        </div>

        {announcements.length === 0 ? (
          <p className="text-sm text-ink/50">Todavía no hay avisos publicados.</p>
        ) : (
          <div className="space-y-3">
            {announcements.map((item) => {
              const isUnread = !readIds.has(item.id);

              return (
                <article
                  key={item.id}
                  className={`rounded-2xl border p-4 ${
                    isUnread
                      ? "border-accent/30 bg-accent/5"
                      : "border-ink/10 bg-white"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {item.isPinned && (
                          <span className="rounded-full bg-ink/10 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-ink/60">
                            Fijado
                          </span>
                        )}
                        {isUnread && (
                          <span className="rounded-full bg-accent px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-white">
                            Nuevo
                          </span>
                        )}
                        <h3 className="text-base font-semibold text-ink">
                          {item.title}
                        </h3>
                      </div>
                      <div className="mt-0.5 text-xs text-ink/40">
                        {formatBirthday(item.createdAt)}
                      </div>
                    </div>
                    {isUnread && (
                      <button
                        type="button"
                        onClick={() => markRead(item.id)}
                        className="shrink-0 rounded-xl border border-ink/10 bg-white px-3 py-1.5 text-xs font-semibold text-ink/60 hover:bg-ink/5"
                      >
                        Marcar leído
                      </button>
                    )}
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink/80">
                    {item.body}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
