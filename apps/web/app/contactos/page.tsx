"use client";

import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "../../components/section-card";
import { api } from "../../lib/api";

type Contact = {
  id: string;
  matricula: string;
  firstName: string;
  lastName: string;
  grade: string | null;
  status: string;
  phone: string | null;
  alternatePhone: string | null;
  email: string | null;
  emergencyContactName: string | null;
  emergencyContactRelationship: string | null;
  emergencyContactPhone: string | null;
};

const GRADE_LABELS: Record<string, string> = {
  APRENDIZ: "Aprendiz",
  COMPANERO: "Compañero",
  MAESTRO: "Maestro",
  SIN_GRADO: "Sin grado",
};

/** Deja solo dígitos: wa.me y tel: no toleran espacios ni guiones. */
function digits(phone: string) {
  return phone.replace(/\D/g, "");
}

function whatsappUrl(phone: string | null) {
  if (!phone) return null;
  const numero = digits(phone);
  return numero ? `https://wa.me/${numero}` : null;
}

function PhoneLinks({ label, phone }: { label: string; phone: string | null }) {
  if (!phone) return null;

  const wa = whatsappUrl(phone);

  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className="text-xs uppercase tracking-wide text-ink/40">{label}</span>
      <a
        href={`tel:${digits(phone)}`}
        className="font-semibold text-ink underline underline-offset-4"
      >
        {phone}
      </a>
      {wa ? (
        <a
          href={wa}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-semibold text-accent underline underline-offset-4"
        >
          WhatsApp
        </a>
      ) : null}
    </div>
  );
}

export default function ContactosPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);

  useEffect(() => {
    setLoading(true);

    api
      .get<Contact[]>(
        `/contacts${includeInactive ? "?includeInactive=true" : ""}`,
      )
      .then((data) => {
        setContacts(data);
        setError(null);
      })
      .catch((err: unknown) =>
        setError(
          err instanceof Error ? err.message : "No se pudo cargar el directorio.",
        ),
      )
      .finally(() => setLoading(false));
  }, [includeInactive]);

  // El filtrado es en el cliente: el padrón de un taller entra holgado en
  // memoria y así la búsqueda responde sin ida y vuelta al servidor.
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return contacts;

    return contacts.filter((c) =>
      [
        c.firstName,
        c.lastName,
        c.matricula,
        c.email ?? "",
        c.phone ?? "",
        c.alternatePhone ?? "",
        c.emergencyContactName ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [contacts, search]);

  const sinDatos = contacts.filter((c) => !c.phone && !c.email).length;
  const sinEmergencia = contacts.filter((c) => !c.emergencyContactPhone).length;

  return (
    <div className="space-y-6">
      <SectionCard
        title="Contactos del Taller"
        description="Directorio de los HH.·. con su teléfono, correo y contacto de emergencia. No incluye información médica: esa vive en la ficha de emergencia, con permiso aparte."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, matrícula, teléfono o correo"
            className="min-h-11 w-full rounded-2xl border border-ink/10 px-4 text-sm"
          />

          <label className="flex min-h-11 items-center gap-3 rounded-2xl border border-ink/10 px-4 text-sm text-ink/70">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
              className="h-4 w-4"
            />
            Incluir socios inactivos
          </label>
        </div>

        {!loading && contacts.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-ink/5 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-ink/50">
                En el directorio
              </div>
              <div className="text-2xl font-bold text-ink">{contacts.length}</div>
            </div>
            <div className="rounded-2xl bg-ink/5 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-ink/50">
                Sin teléfono ni correo
              </div>
              <div className="text-2xl font-bold text-ink">{sinDatos}</div>
            </div>
            <div className="rounded-2xl bg-ink/5 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-ink/50">
                Sin contacto de emergencia
              </div>
              <div className="text-2xl font-bold text-ink">{sinEmergencia}</div>
            </div>
          </div>
        ) : null}
      </SectionCard>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-ink/10 bg-white p-6 text-sm text-ink/60">
          Cargando directorio...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-ink/10 bg-white p-6 text-sm text-ink/60">
          {contacts.length === 0
            ? "Todavía no hay socios cargados."
            : "Ningún socio coincide con la búsqueda."}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((c) => (
            <article
              key={c.id}
              className="rounded-3xl border border-ink/10 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-wide text-ink/40">
                    Matrícula {c.matricula}
                  </div>
                  <div className="text-base font-semibold text-ink">
                    {c.lastName}, {c.firstName}
                  </div>
                  <div className="text-sm text-ink/50">
                    {GRADE_LABELS[c.grade ?? ""] ?? "Sin grado"}
                  </div>
                </div>

                {c.status !== "ACTIVE" ? (
                  <span className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700">
                    Inactivo
                  </span>
                ) : null}
              </div>

              <div className="mt-4 grid gap-2 text-sm">
                <PhoneLinks label="Celular" phone={c.phone} />
                <PhoneLinks label="Alternativo" phone={c.alternatePhone} />

                {c.email ? (
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-xs uppercase tracking-wide text-ink/40">
                      Correo
                    </span>
                    <a
                      href={`mailto:${c.email}`}
                      className="min-w-0 break-all font-semibold text-ink underline underline-offset-4"
                    >
                      {c.email}
                    </a>
                  </div>
                ) : null}

                {!c.phone && !c.alternatePhone && !c.email ? (
                  <div className="text-ink/40">Sin datos de contacto cargados.</div>
                ) : null}
              </div>

              {c.emergencyContactPhone || c.emergencyContactName ? (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                    A quién llamar en una emergencia
                  </div>
                  <div className="mt-2 grid gap-1 text-sm">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-xs uppercase tracking-wide text-ink/40">
                        Nombre
                      </span>
                      <span className="font-semibold text-ink">
                        {c.emergencyContactName ?? (
                          <span className="text-rose-700">Falta el nombre</span>
                        )}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-xs uppercase tracking-wide text-ink/40">
                        Parentesco
                      </span>
                      <span className="font-semibold text-ink">
                        {c.emergencyContactRelationship ?? (
                          <span className="text-rose-700">Falta el vínculo</span>
                        )}
                      </span>
                    </div>
                    {c.emergencyContactPhone ? (
                      <PhoneLinks
                        label="Teléfono"
                        phone={c.emergencyContactPhone}
                      />
                    ) : (
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="text-xs uppercase tracking-wide text-ink/40">
                          Teléfono
                        </span>
                        <span className="font-semibold text-rose-700">
                          Falta el teléfono
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
