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
  {
    key: "insuranceEmergencyPhone",
    label: "Urgencias de la cobertura (ambulancia)",
  },
  { key: "primaryDoctorName", label: "Médico de cabecera" },
  { key: "primaryDoctorPhone", label: "Teléfono del médico" },
];

/** "alerta" es para lo que hay que leer sí o sí antes de actuar. */
type Tono = "neutral" | "alerta";

const TONOS: Record<Tono, { caja: string; rotulo: string; texto: string }> = {
  neutral: {
    caja: "bg-ink/5",
    rotulo: "text-ink/50",
    texto: "text-ink",
  },
  alerta: {
    caja: "border-2 border-amber-400 bg-amber-50",
    rotulo: "text-amber-900",
    texto: "text-ink font-medium",
  },
};

function Dato({
  label,
  value,
  tono = "neutral",
}: {
  label: string;
  value: string | null;
  tono?: Tono;
}) {
  const hayDato = Boolean(value?.trim());

  // Un campo vacío nunca alerta: si todo llama la atención, nada la llama. La
  // alerta marca que hay algo cargado que leer, no que el campo exista.
  const efectivo: Tono = tono === "alerta" && !hayDato ? "neutral" : tono;
  const estilo = TONOS[efectivo];

  return (
    <div className={`rounded-2xl px-4 py-3 ${estilo.caja}`}>
      <div
        className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${estilo.rotulo}`}
      >
        {/* El simbolo acompaña al color: quien no distingue el ámbar del gris
            igual ve que esa tarjeta pide atención. */}
        {efectivo === "alerta" ? <span aria-hidden="true">⚠</span> : null}
        {label}
      </div>
      <div className={`mt-1 whitespace-pre-wrap text-sm ${estilo.texto}`}>
        {hayDato ? value : <span className="text-ink/40">Sin datos</span>}
      </div>
    </div>
  );
}

type EmergencyContact = {
  emergencyContactName: string | null;
  emergencyContactRelationship: string | null;
  emergencyContactPhone: string | null;
};

/**
 * A quién llamar si algo le pasa al socio.
 *
 * Es un dato distinto del teléfono de urgencias de la cobertura: este es el de
 * una persona concreta, lo carga el propio socio, y por eso el nombre y el
 * parentesco se muestran siempre junto al número. Un teléfono solo no le dice
 * a quien está marcando con quién va a hablar.
 */
function EmergencyContactBlock({
  contact,
  editable,
  onSaved,
}: {
  contact: EmergencyContact;
  /** Solo el propio socio lo edita desde acá; un admin lo hace en Cuadro. */
  editable: boolean;
  onSaved: (fresh: EmergencyContact) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    emergencyContactName: contact.emergencyContactName ?? "",
    emergencyContactRelationship: contact.emergencyContactRelationship ?? "",
    emergencyContactPhone: contact.emergencyContactPhone ?? "",
  });

  const { emergencyContactName: nombre, emergencyContactRelationship: vinculo } =
    contact;
  const telefono = contact.emergencyContactPhone;
  const vacio = !nombre && !telefono;

  async function save() {
    setSaving(true);
    setError(null);

    try {
      const fresh = await api.put<EmergencyContact>(
        "/health/me/emergency-contact",
        draft,
      );
      onSaved(fresh);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-amber-800">
        A quién llamar en una emergencia
      </div>

      {editing ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/70">
              Nombre y apellido
            </label>
            <input
              value={draft.emergencyContactName}
              onChange={(e) =>
                setDraft((p) => ({ ...p, emergencyContactName: e.target.value }))
              }
              className="min-h-11 w-full rounded-2xl border border-ink/10 bg-white px-4 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink/70">
              Parentesco o vínculo
            </label>
            <input
              value={draft.emergencyContactRelationship}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  emergencyContactRelationship: e.target.value,
                }))
              }
              placeholder="Cónyuge, hijo/a, hermano/a..."
              className="min-h-11 w-full rounded-2xl border border-ink/10 bg-white px-4 text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-ink/70">
              Teléfono
            </label>
            <input
              value={draft.emergencyContactPhone}
              onChange={(e) =>
                setDraft((p) => ({ ...p, emergencyContactPhone: e.target.value }))
              }
              className="min-h-11 w-full rounded-2xl border border-ink/10 bg-white px-4 text-sm"
            />
          </div>

          {error ? (
            <div className="text-sm text-rose-700 sm:col-span-2">{error}</div>
          ) : null}

          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-accent px-5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Guardar contacto"}
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft({
                  emergencyContactName: contact.emergencyContactName ?? "",
                  emergencyContactRelationship:
                    contact.emergencyContactRelationship ?? "",
                  emergencyContactPhone: contact.emergencyContactPhone ?? "",
                });
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
          {vacio ? (
            <div className="mt-2 text-sm text-ink/60">
              {editable
                ? "Todavía no cargaste a quién llamar. Es el dato que más falta hace cuando pasa algo."
                : "Sin cargar. Lo carga el propio socio desde Mi Perfil."}
            </div>
          ) : (
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-ink/50">
                  Nombre
                </div>
                <div className="text-sm font-semibold text-ink">
                  {nombre ?? (
                    <span className="text-rose-700">Falta el nombre</span>
                  )}
                </div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-wide text-ink/50">
                  Parentesco
                </div>
                <div className="text-sm font-semibold text-ink">
                  {vinculo ?? (
                    <span className="text-rose-700">Falta el vínculo</span>
                  )}
                </div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-wide text-ink/50">
                  Teléfono
                </div>
                {telefono ? (
                  <a
                    href={`tel:${telefono.replace(/\D/g, "")}`}
                    className="text-sm font-semibold text-ink underline underline-offset-4"
                  >
                    {telefono}
                  </a>
                ) : (
                  <div className="text-sm font-semibold text-rose-700">
                    Falta el teléfono
                  </div>
                )}
              </div>
            </div>
          )}

          {editable ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="mt-3 inline-flex min-h-11 items-center justify-center rounded-2xl border border-amber-300 bg-white px-5 text-sm font-semibold text-amber-900"
            >
              {vacio ? "Cargar contacto" : "Editar contacto"}
            </button>
          ) : null}
        </>
      )}
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
        <EmergencyContactBlock
          contact={member}
          editable={ownRecord}
          onSaved={(fresh) =>
            setData((prev) => (prev ? { ...prev, member: { ...prev.member, ...fresh } } : prev))
          }
        />
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
            {/* Sin formato especial en ninguno de los dos estados: la alerta
                queda reservada para lo que hay que leer antes de actuar. */}
            <Dato
              label="Donación de órganos"
              value={
                health
                  ? health.organDonationOpposition
                    ? "Manifestó oposición a donar"
                    : "Donante · sin oposición registrada"
                  : null
              }
            />
            <Dato
              label="Alergias"
              tono="alerta"
              value={health?.allergies ?? null}
            />
            <Dato
              label="Medicación habitual"
              tono="alerta"
              value={health?.medications ?? null}
            />
            <Dato
              label="Condiciones crónicas"
              tono="alerta"
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
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  : null
              }
            />
            {/* Separado de la cobertura a proposito: es el numero al que se
                pide la ambulancia, no el de la familia. Mezclados, un numero
                suelto al lado de la obra social se confunde con el otro. */}
            <Dato
              label="Urgencias de la cobertura (ambulancia)"
              value={health?.insuranceEmergencyPhone ?? null}
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
              tono="alerta"
              value={health?.implantedDevices ?? null}
            />
            <Dato
              label="Cirugías relevantes"
              tono="alerta"
              value={health?.relevantSurgeries ?? null}
            />
            <Dato
              label="Directivas anticipadas"
              tono="alerta"
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
