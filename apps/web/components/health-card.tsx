"use client";

import { useEffect, useState } from "react";
import { api } from "../lib/api";

export const BLOOD_TYPE_LABELS: Record<string, string> = {
  A_POS: "A+",
  A_NEG: "A−",
  B_POS: "B+",
  B_NEG: "B−",
  AB_POS: "AB+",
  AB_NEG: "AB−",
  O_POS: "0+",
  O_NEG: "0−",
  UNKNOWN: "Sin datos",
};

type Health = {
  bloodType: string;
  allergies: string | null;
  medications: string | null;
  chronicConditions: string | null;
  insuranceProvider: string | null;
  insuranceMemberId: string | null;
  insuranceEmergencyPhone: string | null;
  primaryDoctorName: string | null;
  primaryDoctorPhone: string | null;
  implantedDevices: string | null;
  relevantSurgeries: string | null;
  organDonationOpposition: boolean;
  advanceDirectives: string | null;
};

type Response = {
  member: {
    id: string;
    matricula: string;
    firstName: string;
    lastName: string;
    emergencyContactName: string | null;
    emergencyContactRelationship: string | null;
    emergencyContactPhone: string | null;
  };
  health: Health | null;
};

type Draft = Omit<Health, "organDonationOpposition"> & {
  organDonationOpposition: boolean;
};

function emptyDraft(): Draft {
  return {
    bloodType: "UNKNOWN",
    allergies: "",
    medications: "",
    chronicConditions: "",
    insuranceProvider: "",
    insuranceMemberId: "",
    insuranceEmergencyPhone: "",
    primaryDoctorName: "",
    primaryDoctorPhone: "",
    implantedDevices: "",
    relevantSurgeries: "",
    organDonationOpposition: false,
    advanceDirectives: "",
  };
}

function toDraft(health: Health | null): Draft {
  if (!health) return emptyDraft();

  return {
    bloodType: health.bloodType ?? "UNKNOWN",
    allergies: health.allergies ?? "",
    medications: health.medications ?? "",
    chronicConditions: health.chronicConditions ?? "",
    insuranceProvider: health.insuranceProvider ?? "",
    insuranceMemberId: health.insuranceMemberId ?? "",
    insuranceEmergencyPhone: health.insuranceEmergencyPhone ?? "",
    primaryDoctorName: health.primaryDoctorName ?? "",
    primaryDoctorPhone: health.primaryDoctorPhone ?? "",
    implantedDevices: health.implantedDevices ?? "",
    relevantSurgeries: health.relevantSurgeries ?? "",
    organDonationOpposition: health.organDonationOpposition ?? false,
    advanceDirectives: health.advanceDirectives ?? "",
  };
}

const TEXTAREAS: Array<{ key: keyof Draft; label: string; hint?: string }> = [
  {
    key: "allergies",
    label: "Alergias",
    hint: "Sobre todo medicamentosas: penicilina, AINEs, anestésicos.",
  },
  {
    key: "medications",
    label: "Medicación habitual",
    hint: "Incluí anticoagulantes, insulina y antiepilépticos: cambian el tratamiento de urgencia.",
  },
  {
    key: "chronicConditions",
    label: "Condiciones crónicas",
    hint: "Diabetes, epilepsia, cardiopatía, asma, EPOC, hipertensión.",
  },
  {
    key: "implantedDevices",
    label: "Dispositivos implantados",
    hint: "Marcapasos, stent, válvula, prótesis.",
  },
  { key: "relevantSurgeries", label: "Cirugías relevantes" },
  {
    key: "advanceDirectives",
    label: "Directivas anticipadas",
    hint: "Si existen y dónde encontrarlas. No hace falta detallar su contenido.",
  },
];

const TEXT_INPUTS: Array<{ key: keyof Draft; label: string }> = [
  { key: "insuranceProvider", label: "Obra social o prepaga" },
  { key: "insuranceMemberId", label: "Nº de afiliado" },
  { key: "insuranceEmergencyPhone", label: "Teléfono de urgencias" },
  { key: "primaryDoctorName", label: "Médico de cabecera" },
  { key: "primaryDoctorPhone", label: "Teléfono del médico" },
];

function Dato({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-2xl bg-ink/5 px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-ink/50">{label}</div>
      <div className="mt-1 whitespace-pre-wrap text-sm text-ink">
        {value?.trim() ? value : <span className="text-ink/40">Sin datos</span>}
      </div>
    </div>
  );
}

export function HealthCard({
  endpoint,
  canEdit,
  ownRecord = false,
}: {
  /** "/health/me" o "/health/members/<id>" */
  endpoint: string;
  canEdit: boolean;
  /** Cambia los textos para hablarle al socio sobre su propia ficha. */
  ownRecord?: boolean;
}) {
  const [data, setData] = useState<Response | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setEditing(false);

    api
      .get<Response>(endpoint)
      .then((res) => {
        setData(res);
        setDraft(toDraft(res.health));
        setError(null);
      })
      .catch((err: unknown) =>
        setError(
          err instanceof Error ? err.message : "No se pudo cargar la ficha.",
        ),
      )
      .finally(() => setLoading(false));
  }, [endpoint]);

  async function save() {
    setSaving(true);
    setError(null);

    try {
      await api.put(endpoint, draft);
      const fresh = await api.get<Response>(endpoint);
      setData(fresh);
      setDraft(toDraft(fresh.health));
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-ink/10 bg-white p-6 text-sm text-ink/60">
        Cargando ficha de emergencia...
      </div>
    );
  }

  const health = data?.health ?? null;
  const member = data?.member;

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {!health && !editing ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {ownRecord
            ? "Todavía no cargaste tu ficha de emergencia. Es voluntaria, pero si algo pasa durante una tenida es lo primero que se busca."
            : "Este H.·. todavía no tiene ficha de emergencia cargada."}
        </div>
      ) : null}

      {member ? (
        <div className="rounded-2xl bg-amber-50 px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-amber-800">
            Contacto de emergencia
          </div>
          {member.emergencyContactPhone || member.emergencyContactName ? (
            <>
              <div className="mt-1 text-sm font-semibold text-ink">
                {member.emergencyContactName ?? "Sin nombre"}
                {member.emergencyContactRelationship
                  ? ` · ${member.emergencyContactRelationship}`
                  : ""}
              </div>
              {member.emergencyContactPhone ? (
                <a
                  href={`tel:${member.emergencyContactPhone.replace(/\D/g, "")}`}
                  className="text-sm font-semibold text-ink underline underline-offset-4"
                >
                  {member.emergencyContactPhone}
                </a>
              ) : null}
            </>
          ) : (
            <div className="mt-1 text-sm text-ink/50">
              Sin cargar. Se edita junto con los datos de contacto del socio.
            </div>
          )}
        </div>
      ) : null}

      {editing ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-ink/80">
              Grupo sanguíneo y factor
            </label>
            <select
              value={draft.bloodType}
              onChange={(e) =>
                setDraft((p) => ({ ...p, bloodType: e.target.value }))
              }
              className="min-h-11 w-full rounded-2xl border border-ink/10 px-4 text-sm"
            >
              {Object.entries(BLOOD_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-ink/50">
              Sirve para saber con quién contar como donante. Ningún hospital
              transfunde por un dato declarado: siempre tipifica y hace pruebas
              cruzadas.
            </p>
          </div>

          <label className="flex items-start gap-3 rounded-2xl border border-ink/10 px-4 py-3 text-sm text-ink/80">
            <input
              type="checkbox"
              checked={draft.organDonationOpposition}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  organDonationOpposition: e.target.checked,
                }))
              }
              className="mt-1 h-4 w-4"
            />
            <span>
              Manifestó oposición a la donación de órganos
              <span className="mt-1 block text-xs text-ink/50">
                Por la Ley Justina todos somos donantes salvo oposición expresa,
                así que lo que se registra es la negativa.
              </span>
            </span>
          </label>

          {TEXTAREAS.map((field) => (
            <div key={field.key} className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-ink/80">
                {field.label}
              </label>
              <textarea
                rows={2}
                value={String(draft[field.key] ?? "")}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, [field.key]: e.target.value }))
                }
                className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
              />
              {field.hint ? (
                <p className="mt-1 text-xs text-ink/50">{field.hint}</p>
              ) : null}
            </div>
          ))}

          {TEXT_INPUTS.map((field) => (
            <div key={field.key}>
              <label className="mb-2 block text-sm font-medium text-ink/80">
                {field.label}
              </label>
              <input
                value={String(draft[field.key] ?? "")}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, [field.key]: e.target.value }))
                }
                className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
              />
            </div>
          ))}

          <div className="flex flex-wrap gap-2 md:col-span-2">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-accent px-5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Guardar ficha"}
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(toDraft(health));
                setEditing(false);
                setError(null);
              }}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-ink/10 bg-white px-5 text-sm font-semibold text-ink/70"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <Dato
              label="Grupo sanguíneo"
              value={
                health ? BLOOD_TYPE_LABELS[health.bloodType] ?? "Sin datos" : null
              }
            />
            <Dato
              label="Donación de órganos"
              value={
                health
                  ? health.organDonationOpposition
                    ? "Manifestó oposición"
                    : "Sin oposición registrada"
                  : null
              }
            />
            <Dato label="Alergias" value={health?.allergies ?? null} />
            <Dato label="Medicación habitual" value={health?.medications ?? null} />
            <Dato
              label="Condiciones crónicas"
              value={health?.chronicConditions ?? null}
            />
            <Dato
              label="Cobertura médica"
              value={
                health?.insuranceProvider
                  ? [
                      health.insuranceProvider,
                      health.insuranceMemberId
                        ? `Afiliado ${health.insuranceMemberId}`
                        : null,
                      health.insuranceEmergencyPhone,
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  : null
              }
            />
            <Dato
              label="Médico de cabecera"
              value={
                health?.primaryDoctorName
                  ? [health.primaryDoctorName, health.primaryDoctorPhone]
                      .filter(Boolean)
                      .join(" · ")
                  : null
              }
            />
            <Dato
              label="Dispositivos implantados"
              value={health?.implantedDevices ?? null}
            />
            <Dato
              label="Cirugías relevantes"
              value={health?.relevantSurgeries ?? null}
            />
            <Dato
              label="Directivas anticipadas"
              value={health?.advanceDirectives ?? null}
            />
          </div>

          {canEdit ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-ink/10 bg-white px-5 text-sm font-semibold text-ink/70 hover:bg-ink/5"
            >
              {health ? "Editar ficha" : "Cargar ficha"}
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
