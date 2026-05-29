"use client";

import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "../../components/section-card";
import { useAuth } from "../../context/auth";
import { api } from "../../lib/api";
import { formatDateOnly } from "../../lib/date";

type Member = {
  id: string;
  matricula: string;
  documentNumber: string | null;
  firstName: string;
  lastName: string;
  category: string;
  status: string;
  grade: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  joinedAt: string;
  initiationDate: string;
  fellowcraftDate: string | null;
  masterDate: string | null;
  birthDate: string | null;
};

type MemberFull = Member & {
  payments?: Array<{
    id: string;
    paidAt: string;
    periodYear: number;
    periodMonth: number;
    amount: number | string;
    methodCode: string;
    status: string;
    receiptUrl?: string | null;
    receiptNote?: string | null;
    notes?: string | null;
  }>;
  statusHistory?: Array<{
    id: string;
    status: string;
    effectiveFrom: string;
    effectiveTo: string | null;
    reason: string | null;
  }>;
  categoryHistory?: Array<{
    id: string;
    category: string;
    effectiveFrom: string;
    effectiveTo: string | null;
    reason: string | null;
  }>;
};

type MemberForm = {
  matricula: string;
  documentNumber: string;
  firstName: string;
  lastName: string;
  category: string;
  status: string;
  grade: string;
  phone: string;
  email: string;
  notes: string;
  joinedAt: string;
  initiationDate: string;
  fellowcraftDate: string;
  masterDate: string;
  birthDate: string;
};

type SortField =
  | "matricula"
  | "firstName"
  | "lastName"
  | "category"
  | "status"
  | "grade"
  | "phone"
  | "email"
  | "joinedAt"
  | "birthDate";

type SortDirection = "asc" | "desc";

type Filters = {
  matricula: string;
  documentNumber: string;
  firstName: string;
  lastName: string;
  category: string;
  status: string;
  grade: string;
  phone: string;
  email: string;
};

const CATEGORY_OPTIONS = [
  { value: "SIMPLE", label: "Simple" },
  { value: "DOBLE", label: "Doble" },
  { value: "ESTUDIANTE", label: "Estudiante" },
  { value: "SOCIAL", label: "Social" },
  { value: "MENOR", label: "Menor" },
  { value: "HONOR", label: "Honor" },
];

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Activo" },
  { value: "INACTIVE", label: "Inactivo" },
];

const GRADE_OPTIONS = [
  { value: "APRENDIZ", label: "Aprendiz" },
  { value: "COMPANERO", label: "Compañero" },
  { value: "MAESTRO", label: "Maestro" },
];

function emptyForm(): MemberForm {
  return {
    matricula: "",
    documentNumber: "",
    firstName: "",
    lastName: "",
    category: "SIMPLE",
    status: "ACTIVE",
    grade: "APRENDIZ",
    phone: "",
    email: "",
    notes: "",
    joinedAt: new Date().toISOString().split("T")[0],
    initiationDate: new Date().toISOString().split("T")[0],
    fellowcraftDate: "",
    masterDate: "",
    birthDate: "",
  };
}

function emptyFilters(): Filters {
  return {
    matricula: "",
    documentNumber: "",
    firstName: "",
    lastName: "",
    category: "",
    status: "",
    grade: "",
    phone: "",
    email: "",
  };
}

function categoryLabel(value: string) {
  return (
    CATEGORY_OPTIONS.find((option) => option.value === value)?.label ?? value
  );
}

function statusLabel(value: string) {
  return (
    STATUS_OPTIONS.find((option) => option.value === value)?.label ?? value
  );
}

function gradeLabel(value: string | null) {
  if (!value) return "-";
  return GRADE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

function fmtMoney(value: number | string) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function buildWhatsappLink(member: Member) {
  if (!member.phone) return null;

  const celular = member.phone.replace(/\D/g, "");
  if (!celular) return null;

  const saludo = member.grade === "MAESTRO" ? "Hola V.·.H.·." : "Hola Q.·.H.·.";
  const texto = `${saludo} ${member.firstName}`;
  return `https://wa.me/${celular}?text=${encodeURIComponent(texto)}`;
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function compareValues(a: string, b: string, direction: SortDirection) {
  const result = a.localeCompare(b, "es", {
    numeric: true,
    sensitivity: "base",
  });
  return direction === "asc" ? result : -result;
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function memberFullName(member: Member) {
  return `${member.lastName}, ${member.firstName}`;
}

function memberSearchText(member: Member) {
  return [
    member.matricula,
    member.documentNumber,
    member.firstName,
    member.lastName,
    categoryLabel(member.category),
    statusLabel(member.status),
    gradeLabel(member.grade),
    member.phone,
    member.email,
    member.notes,
    formatDateOnly(member.birthDate),
    formatDateOnly(member.joinedAt),
    formatDateOnly(member.initiationDate),
    formatDateOnly(member.fellowcraftDate),
    formatDateOnly(member.masterDate),
  ]
    .join(" ")
    .toLowerCase();
}

function badgeClass(
  kind: "category" | "status" | "grade",
  value: string | null,
) {
  if (kind === "status") {
    return value === "ACTIVE"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-slate-200 bg-slate-50 text-slate-700";
  }

  if (kind === "category" && value === "HONOR") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-ink/10 bg-ink/5 text-ink/70";
}

export default function MembersPage() {
  const { canEdit } = useAuth();

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [form, setForm] = useState<MemberForm>(emptyForm());

  const [selectedProfile, setSelectedProfile] = useState<MemberFull | null>(
    null,
  );
  const [loadingProfile, setLoadingProfile] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [filters, setFilters] = useState<Filters>(emptyFilters());
  const [sortField, setSortField] = useState<SortField>("lastName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const isEditing = useMemo(() => editingMemberId !== null, [editingMemberId]);

  async function load() {
    setLoading(true);

    try {
      const data = await api.get<Member[]>("/members");
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
    setError("");
    setShowForm(true);
  }

  function openEdit(member: Member) {
    if (!canEdit) return;
    setEditingMemberId(member.id);
    setForm({
      matricula: member.matricula,
      documentNumber: member.documentNumber ?? "",
      firstName: member.firstName,
      lastName: member.lastName,
      category: member.category,
      status: member.status,
      grade: member.grade ?? "APRENDIZ",
      phone: member.phone ?? "",
      email: member.email ?? "",
      notes: member.notes ?? "",
      joinedAt: member.joinedAt.split("T")[0],
      initiationDate: member.initiationDate?.split("T")[0] ?? "",
      fellowcraftDate: member.fellowcraftDate?.split("T")[0] ?? "",
      masterDate: member.masterDate?.split("T")[0] ?? "",
      birthDate: member.birthDate ? member.birthDate.split("T")[0] : "",
    });
    setError("");
    setShowForm(true);
  }

  async function openProfile(memberId: string) {
    setLoadingProfile(true);
    setSelectedProfile(null);

    try {
      const data = await api.get<MemberFull>(`/members/${memberId}`);
      setSelectedProfile(data);
    } finally {
      setLoadingProfile(false);
    }
  }

  function closeForm() {
    setShowForm(false);
    setEditingMemberId(null);
    setForm(emptyForm());
    setError("");
  }

  function closeProfile() {
    setSelectedProfile(null);
    setLoadingProfile(false);
  }

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }

    setSortField(field);
    setSortDirection("asc");
  }

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function clearFilters() {
    setFilters(emptyFilters());
    setGlobalSearch("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;

    setError("");
    setSaving(true);

    try {
      if (isEditing && editingMemberId) {
        await api.patch(`/members/${editingMemberId}`, {
          matricula: form.matricula.trim(),
          documentNumber: form.documentNumber.trim() || undefined,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          category: form.category,
          status: form.status,
          grade: form.grade,
          phone: form.phone.trim() || undefined,
          email: form.email.trim() || undefined,
          notes: form.notes.trim() || undefined,
          initiationDate: form.initiationDate,
          fellowcraftDate: form.fellowcraftDate || undefined,
          masterDate: form.masterDate || undefined,
          birthDate: form.birthDate || undefined,
        });
      } else {
        await api.post("/members", {
          matricula: form.matricula.trim(),
          documentNumber: form.documentNumber.trim() || undefined,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          category: form.category,
          status: form.status,
          grade: form.grade,
          phone: form.phone.trim() || undefined,
          email: form.email.trim() || undefined,
          notes: form.notes.trim() || undefined,
          joinedAt: new Date(form.joinedAt).toISOString(),
          initiationDate: form.initiationDate,
          fellowcraftDate: form.fellowcraftDate || undefined,
          masterDate: form.masterDate || undefined,
          birthDate: form.birthDate || undefined,
        });
      }

      closeForm();
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar H.·.");
    } finally {
      setSaving(false);
    }
  }

  const filteredMembers = useMemo(() => {
    const global = normalizeText(globalSearch);

    const result = members.filter((member) => {
      if (global && !memberSearchText(member).includes(global)) return false;

      if (
        filters.matricula &&
        !normalizeText(member.matricula).includes(
          normalizeText(filters.matricula),
        )
      )
        return false;

      if (
        filters.firstName &&
        !normalizeText(member.firstName).includes(
          normalizeText(filters.firstName),
        )
      )
        return false;

      if (
        filters.lastName &&
        !normalizeText(member.lastName).includes(
          normalizeText(filters.lastName),
        )
      )
        return false;

      if (filters.category && member.category !== filters.category)
        return false;
      if (filters.status && member.status !== filters.status) return false;
      if (filters.grade && (member.grade ?? "") !== filters.grade) return false;

      if (
        filters.phone &&
        !normalizeText(member.phone).includes(normalizeText(filters.phone))
      )
        return false;

      if (
        filters.email &&
        !normalizeText(member.email).includes(normalizeText(filters.email))
      )
        return false;

      return true;
    });

    return result.sort((a, b) => {
      switch (sortField) {
        case "matricula":
          return compareValues(a.matricula, b.matricula, sortDirection);
        case "firstName":
          return compareValues(a.firstName, b.firstName, sortDirection);
        case "lastName":
          return compareValues(a.lastName, b.lastName, sortDirection);
        case "category":
          return compareValues(
            categoryLabel(a.category),
            categoryLabel(b.category),
            sortDirection,
          );
        case "status":
          return compareValues(
            statusLabel(a.status),
            statusLabel(b.status),
            sortDirection,
          );
        case "grade":
          return compareValues(
            gradeLabel(a.grade),
            gradeLabel(b.grade),
            sortDirection,
          );
        case "phone":
          return compareValues(a.phone ?? "", b.phone ?? "", sortDirection);
        case "email":
          return compareValues(a.email ?? "", b.email ?? "", sortDirection);
        case "joinedAt":
          return compareValues(a.joinedAt, b.joinedAt, sortDirection);
        case "birthDate":
          return compareValues(
            a.birthDate ?? "",
            b.birthDate ?? "",
            sortDirection,
          );
        default:
          return 0;
      }
    });
  }, [members, globalSearch, filters, sortField, sortDirection]);

  const activeFilters = useMemo(() => {
    const items: string[] = [];

    if (globalSearch) items.push(`Búsqueda global: ${globalSearch}`);
    if (filters.matricula) items.push(`Matrícula: ${filters.matricula}`);
    if (filters.firstName) items.push(`Nombre: ${filters.firstName}`);
    if (filters.lastName) items.push(`Apellido: ${filters.lastName}`);
    if (filters.category)
      items.push(`Categoría: ${categoryLabel(filters.category)}`);
    if (filters.status) items.push(`Estado: ${statusLabel(filters.status)}`);
    if (filters.grade) items.push(`Grado: ${gradeLabel(filters.grade)}`);
    if (filters.phone) items.push(`Celular: ${filters.phone}`);
    if (filters.email) items.push(`Email: ${filters.email}`);

    return items;
  }, [filters, globalSearch]);

  const activos = members.filter((m) => m.status === "ACTIVE").length;
  const inactivos = members.filter((m) => m.status === "INACTIVE").length;

  function sortIndicator(field: SortField) {
    if (sortField !== field) return "↕";
    return sortDirection === "asc" ? "↑" : "↓";
  }

  function exportExcel() {
    const rows = filteredMembers.map((member) => ({
      Matrícula: member.matricula,
      Documento: member.documentNumber ?? "",
      Apellido: member.lastName,
      Nombre: member.firstName,
      Categoría: categoryLabel(member.category),
      Grado: gradeLabel(member.grade),
      Celular: member.phone ?? "",
      Email: member.email ?? "",
      Estado: statusLabel(member.status),
      Alta: formatDateOnly(member.joinedAt),
      Iniciación: formatDateOnly(member.initiationDate),
      Compañero: formatDateOnly(member.fellowcraftDate),
      Maestro: formatDateOnly(member.masterDate),
      Nacimiento: formatDateOnly(member.birthDate),
      Notas: member.notes ?? "",
    }));

    const header = Object.keys(
      rows[0] ?? {
        Matrícula: "",
        Apellido: "",
        Nombre: "",
        Categoría: "",
        Grado: "",
        Celular: "",
        Email: "",
        Estado: "",
        Alta: "",
        Iniciación: "",
        Compañero: "",
        Maestro: "",
        Nacimiento: "",
        Notas: "",
      },
    );

    const csv = [
      header.join(";"),
      ...rows.map((row) =>
        header
          .map(
            (key) =>
              `"${String(row[key as keyof typeof row] ?? "").replaceAll('"', '""')}"`,
          )
          .join(";"),
      ),
    ].join("\n");

    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `cuadro-del-taller-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    const emittedAt = new Date().toLocaleString("es-AR");

    const rows = filteredMembers
      .map(
        (member) => `
          <tr>
            <td>${escapeHtml(member.matricula)}</td>
            <td>${escapeHtml(member.lastName)}, ${escapeHtml(member.firstName)}</td>
            <td>${escapeHtml(categoryLabel(member.category))}</td>
            <td>${escapeHtml(gradeLabel(member.grade))}</td>
            <td>${escapeHtml(member.phone ?? "-")}</td>
            <td>${escapeHtml(member.email ?? "-")}</td>
            <td>${escapeHtml(statusLabel(member.status))}</td>
            <td>${escapeHtml(formatDateOnly(member.birthDate))}</td>
          </tr>
        `,
      )
      .join("");

    const filtersText =
      activeFilters.length > 0
        ? activeFilters.join(" · ")
        : "Sin filtros aplicados";

    const html = `
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>Cuadro del Taller</title>
          <style>
            @page { size: A4 landscape; margin: 14mm; }
            body { font-family: Arial, sans-serif; color: #111827; font-size: 10px; }
            .header {
              display: flex;
              justify-content: space-between;
              gap: 24px;
              border-bottom: 2px solid #111827;
              padding-bottom: 12px;
              margin-bottom: 16px;
            }
            .institution {
              font-family: Georgia, serif;
              font-size: 18px;
              font-weight: 700;
              letter-spacing: .08em;
              white-space: nowrap;
            }
            .subtitle {
              color: #6b7280;
              font-size: 10px;
              margin-top: 4px;
              text-transform: uppercase;
              letter-spacing: .08em;
            }
            .meta {
              border: 1px solid #d1d5db;
              border-radius: 10px;
              padding: 8px 10px;
              min-width: 180px;
            }
            h1 { font-size: 18px; margin: 0 0 8px; }
            .criteria {
              border: 1px solid #e5e7eb;
              background: #f9fafb;
              border-radius: 10px;
              padding: 10px;
              margin-bottom: 14px;
            }
            .summary {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 10px;
              margin-bottom: 14px;
            }
            .box {
              border: 1px solid #e5e7eb;
              border-radius: 10px;
              padding: 10px;
            }
            .label {
              font-size: 9px;
              color: #6b7280;
              text-transform: uppercase;
              letter-spacing: .06em;
            }
            .value {
              margin-top: 4px;
              font-size: 15px;
              font-weight: 800;
            }
            table { width: 100%; border-collapse: collapse; }
            th {
              background: #f3f4f6;
              border: 1px solid #d1d5db;
              padding: 6px;
              text-align: left;
              font-size: 9px;
              text-transform: uppercase;
            }
            td {
              border: 1px solid #e5e7eb;
              padding: 6px;
              vertical-align: top;
            }
            .signature {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 60px;
              margin-top: 36px;
            }
            .line {
              border-top: 1px solid #111827;
              text-align: center;
              padding-top: 8px;
              font-weight: 700;
            }
            @media print {
              body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <header class="header">
            <div>
              <div class="institution">R.·.L.·. PROGRESO Nº 100</div>
              <div class="subtitle">Cuadro del Taller</div>
            </div>
            <div class="meta">
              <div><strong>Fecha de emisión:</strong> ${escapeHtml(emittedAt)}</div>
              <div><strong>Formato:</strong> A4 horizontal</div>
            </div>
          </header>

          <h1>Cuadro del Taller</h1>

          <section class="criteria">
            <strong>Filtros:</strong> ${escapeHtml(filtersText)}
          </section>

          <section class="summary">
            <div class="box"><div class="label">Total</div><div class="value">${members.length}</div></div>
            <div class="box"><div class="label">Activos</div><div class="value">${activos}</div></div>
            <div class="box"><div class="label">Inactivos</div><div class="value">${inactivos}</div></div>
            <div class="box"><div class="label">Mostrando</div><div class="value">${filteredMembers.length}</div></div>
          </section>

          <table>
            <thead>
              <tr>
                <th>Matrícula</th>
                <th>H.·.</th>
                <th>Categoría</th>
                <th>Grado</th>
                <th>Celular</th>
                <th>Email</th>
                <th>Estado</th>
                <th>Nacimiento</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>

          <section class="signature">
            <div class="line">Firma y aclaración</div>
            <div class="line">Responsable de emisión</div>
          </section>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Cuadro del Taller"
        description="Consulta, búsqueda, ficha individual, historial, exportación y edición del Cuadro del Taller."
      >
        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-ink/10 bg-ink/5 p-4">
            <div className="text-xs uppercase tracking-wide text-ink/50">
              Total
            </div>
            <div className="mt-2 text-2xl font-bold text-ink">
              {members.length}
            </div>
          </div>
          <div className="rounded-2xl border border-ink/10 bg-ink/5 p-4">
            <div className="text-xs uppercase tracking-wide text-ink/50">
              Activos
            </div>
            <div className="mt-2 text-2xl font-bold text-ink">{activos}</div>
          </div>
          <div className="rounded-2xl border border-ink/10 bg-ink/5 p-4">
            <div className="text-xs uppercase tracking-wide text-ink/50">
              Inactivos
            </div>
            <div className="mt-2 text-2xl font-bold text-ink">{inactivos}</div>
          </div>
          <div className="rounded-2xl border border-ink/10 bg-ink/5 p-4">
            <div className="text-xs uppercase tracking-wide text-ink/50">
              Mostrando
            </div>
            <div className="mt-2 text-2xl font-bold text-ink">
              {filteredMembers.length}
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-3 xl:grid-cols-[1fr_auto]">
          <input
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            placeholder="Búsqueda global: matrícula, nombre, apellido, grado, categoría, celular, email, notas..."
            className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
          />

          <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
            <button
              type="button"
              onClick={() => setShowAdvancedFilters((prev) => !prev)}
              className="rounded-2xl border border-ink/10 px-4 py-3 text-sm font-semibold text-ink/80 sm:px-5"
            >
              {showAdvancedFilters ? "Ocultar filtros" : "Filtros"}
            </button>
            <button
              type="button"
              onClick={exportExcel}
              className="rounded-2xl border border-ink/10 px-4 py-3 text-sm font-semibold text-ink/80 sm:px-5"
            >
              Excel
            </button>
            <button
              type="button"
              onClick={exportPdf}
              className="rounded-2xl border border-ink/10 px-4 py-3 text-sm font-semibold text-ink/80 sm:px-5"
            >
              PDF
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={openCreate}
                className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white sm:px-5"
              >
                + Nuevo
              </button>
            )}
          </div>
        </div>

        {showAdvancedFilters && (
          <div className="mb-6 rounded-3xl border border-ink/10 bg-white p-4">
            <div className="mb-4 text-sm font-semibold text-ink">
              Filtros avanzados
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <input
                value={filters.matricula}
                onChange={(e) => setFilter("matricula", e.target.value)}
                placeholder="Matrícula"
                className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
              />
              <input
                value={filters.lastName}
                onChange={(e) => setFilter("lastName", e.target.value)}
                placeholder="Apellido"
                className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
              />
              <input
                value={filters.firstName}
                onChange={(e) => setFilter("firstName", e.target.value)}
                placeholder="Nombre"
                className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
              />
              <input
                value={filters.phone}
                onChange={(e) => setFilter("phone", e.target.value)}
                placeholder="Celular"
                className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
              />
              <input
                value={filters.email}
                onChange={(e) => setFilter("email", e.target.value)}
                placeholder="Email"
                className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
              />
              <select
                value={filters.category}
                onChange={(e) => setFilter("category", e.target.value)}
                className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
              >
                <option value="">Todas las categorías</option>
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={filters.grade}
                onChange={(e) => setFilter("grade", e.target.value)}
                className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
              >
                <option value="">Todos los grados</option>
                {GRADE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={filters.status}
                onChange={(e) => setFilter("status", e.target.value)}
                className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
              >
                <option value="">Todos los estados</option>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {activeFilters.length > 0 && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <span className="font-semibold">Filtros aplicados:</span>{" "}
            {activeFilters.join(" · ")}
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
          <div className="py-8 text-sm text-ink/60">
            Cargando Cuadro del Taller...
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="py-8 text-sm text-ink/60">
            No se encontraron HH.·. con los filtros actuales.
          </div>
        ) : (
          <>
            <div className="hidden lg:block">
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-2">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-ink/50">
                      <th className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => toggleSort("matricula")}
                          className="font-semibold"
                        >
                          Matrícula {sortIndicator("matricula")}
                        </button>
                      </th>
                      <th className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => toggleSort("lastName")}
                          className="font-semibold"
                        >
                          H.·. {sortIndicator("lastName")}
                        </button>
                      </th>
                      <th className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => toggleSort("category")}
                          className="font-semibold"
                        >
                          Categoría {sortIndicator("category")}
                        </button>
                      </th>
                      <th className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => toggleSort("grade")}
                          className="font-semibold"
                        >
                          Grado {sortIndicator("grade")}
                        </button>
                      </th>
                      <th className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => toggleSort("phone")}
                          className="font-semibold"
                        >
                          Celular {sortIndicator("phone")}
                        </button>
                      </th>
                      <th className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => toggleSort("email")}
                          className="font-semibold"
                        >
                          Email {sortIndicator("email")}
                        </button>
                      </th>
                      <th className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => toggleSort("status")}
                          className="font-semibold"
                        >
                          Estado {sortIndicator("status")}
                        </button>
                      </th>
                      <th className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => toggleSort("birthDate")}
                          className="font-semibold"
                        >
                          Nacimiento {sortIndicator("birthDate")}
                        </button>
                      </th>
                      <th className="px-3 py-2">Acciones</th>
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
                          <td className="px-3 py-3 text-ink/80">
                            {categoryLabel(m.category)}
                          </td>
                          <td className="px-3 py-3 text-ink/80">
                            {gradeLabel(m.grade)}
                          </td>
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
                              "-"
                            )}
                          </td>
                          <td className="px-3 py-3 text-ink/80">
                            {m.email ?? "-"}
                          </td>
                          <td className="px-3 py-3 text-ink/80">
                            {statusLabel(m.status)}
                          </td>
                          <td className="px-3 py-3 text-ink/80">
                            {formatDateOnly(m.birthDate)}
                          </td>
                          <td className="rounded-r-2xl px-3 py-3">
                            <div className="flex flex-col gap-2">
                              <button
                                type="button"
                                onClick={() => openProfile(m.id)}
                                className="rounded-xl border border-ink/10 px-3 py-2 text-xs font-semibold"
                              >
                                Ficha
                              </button>

                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => openEdit(m)}
                                  className="rounded-xl border border-ink/10 px-3 py-2 text-xs font-semibold"
                                >
                                  Editar
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-3 lg:hidden">
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-white px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-ink/50">
                  Orden
                </div>
                <div className="flex gap-2">
                  <select
                    value={sortField}
                    onChange={(e) => setSortField(e.target.value as SortField)}
                    className="rounded-xl border border-ink/10 px-3 py-2 text-xs"
                  >
                    <option value="lastName">Apellido</option>
                    <option value="firstName">Nombre</option>
                    <option value="matricula">Matrícula</option>
                    <option value="category">Categoría</option>
                    <option value="grade">Grado</option>
                    <option value="status">Estado</option>
                    <option value="birthDate">Nacimiento</option>
                  </select>
                  <button
                    type="button"
                    onClick={() =>
                      setSortDirection((prev) =>
                        prev === "asc" ? "desc" : "asc",
                      )
                    }
                    className="rounded-xl border border-ink/10 px-3 py-2 text-xs font-semibold"
                  >
                    {sortDirection === "asc" ? "↑" : "↓"}
                  </button>
                </div>
              </div>

              {filteredMembers.map((m) => {
                const whatsappLink = buildWhatsappLink(m);

                return (
                  <article
                    key={m.id}
                    className="rounded-3xl border border-ink/10 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold uppercase tracking-wide text-ink/50">
                          Matrícula {m.matricula}
                        </div>
                        <div className="mt-1 text-lg font-bold leading-tight text-ink">
                          {m.lastName}, {m.firstName}
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded-xl border px-2 py-1 text-xs font-semibold ${badgeClass("status", m.status)}`}
                      >
                        {statusLabel(m.status)}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span
                        className={`rounded-xl border px-2 py-1 text-xs font-semibold ${badgeClass("category", m.category)}`}
                      >
                        {categoryLabel(m.category)}
                      </span>
                      <span
                        className={`rounded-xl border px-2 py-1 text-xs font-semibold ${badgeClass("grade", m.grade)}`}
                      >
                        {gradeLabel(m.grade)}
                      </span>
                      <span className="rounded-xl border border-ink/10 bg-ink/5 px-2 py-1 text-xs font-semibold text-ink/70">
                        Nac. {formatDateOnly(m.birthDate)}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-2 text-sm text-ink/70">
                      <div className="flex justify-between gap-3">
                        <span className="text-ink/50">Celular</span>
                        {m.phone ? (
                          <a
                            href={whatsappLink ?? undefined}
                            target="_blank"
                            rel="noreferrer"
                            className="text-right font-semibold text-accent underline underline-offset-4"
                          >
                            {m.phone}
                          </a>
                        ) : (
                          <span>-</span>
                        )}
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-ink/50">Email</span>
                        <span className="max-w-[65%] truncate text-right">
                          {m.email ?? "-"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => openProfile(m.id)}
                        className="rounded-2xl border border-ink/10 px-4 py-3 text-sm font-semibold text-ink"
                      >
                        Ficha
                      </button>

                      {canEdit ? (
                        <button
                          type="button"
                          onClick={() => openEdit(m)}
                          className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white"
                        >
                          Editar
                        </button>
                      ) : (
                        <a
                          href={whatsappLink ?? undefined}
                          target="_blank"
                          rel="noreferrer"
                          className={`rounded-2xl border px-4 py-3 text-center text-sm font-semibold ${m.phone ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "pointer-events-none border-slate-200 bg-slate-50 text-slate-500"}`}
                        >
                          WhatsApp
                        </a>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </SectionCard>

      {loadingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3 py-4">
          <div className="rounded-3xl bg-white p-6 text-sm text-ink shadow-2xl">
            Cargando ficha...
          </div>
        </div>
      )}

      {selectedProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3 py-4">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-white p-4 shadow-2xl sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-ink/10 pb-4">
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-ink sm:text-2xl">
                  Ficha completa del H.·.
                </h2>
                <p className="mt-1 text-sm text-ink/60">
                  {memberFullName(selectedProfile)} · Matrícula{" "}
                  {selectedProfile.matricula}
                </p>
              </div>

              <button
                type="button"
                onClick={closeProfile}
                className="shrink-0 rounded-2xl border border-ink/10 px-4 py-2 text-sm font-semibold text-ink/70 hover:bg-ink/5"
              >
                Cerrar
              </button>
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-6">
                <div className="rounded-2xl border border-ink/10 bg-ink/5 p-4">
                  <div className="mb-4 text-lg font-semibold text-ink">
                    Datos principales
                  </div>

                  <div className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-1">
                    <div>
                      <strong>Nombre:</strong> {selectedProfile.firstName}
                    </div>
                    <div>
                      <strong>Apellido:</strong> {selectedProfile.lastName}
                    </div>
                    <div>
                      <strong>Matrícula:</strong> {selectedProfile.matricula}
                    </div>
                    <div>
                      <strong>Documento:</strong>{" "}
                      {selectedProfile.documentNumber ?? "-"}
                    </div>
                    <div>
                      <strong>Categoría:</strong>{" "}
                      {categoryLabel(selectedProfile.category)}
                    </div>
                    <div>
                      <strong>Grado:</strong>{" "}
                      {gradeLabel(selectedProfile.grade)}
                    </div>
                    <div>
                      <strong>Estado:</strong>{" "}
                      {statusLabel(selectedProfile.status)}
                    </div>
                    <div>
                      <strong>Fecha de alta:</strong>{" "}
                      {formatDateOnly(selectedProfile.joinedAt)}
                    </div>
                    <div>
                      <strong>Fecha de iniciación:</strong>{" "}
                      {formatDateOnly(selectedProfile.initiationDate)}
                    </div>
                    <div>
                      <strong>Fecha de compañero:</strong>{" "}
                      {formatDateOnly(selectedProfile.fellowcraftDate)}
                    </div>
                    <div>
                      <strong>Fecha de maestro:</strong>{" "}
                      {formatDateOnly(selectedProfile.masterDate)}
                    </div>
                    <div>
                      <strong>Fecha de nacimiento:</strong>{" "}
                      {formatDateOnly(selectedProfile.birthDate)}
                    </div>
                    <div>
                      <strong>Celular:</strong> {selectedProfile.phone ?? "-"}
                    </div>
                    <div>
                      <strong>Email:</strong> {selectedProfile.email ?? "-"}
                    </div>
                    <div className="sm:col-span-2 xl:col-span-1">
                      <strong>Notas:</strong> {selectedProfile.notes ?? "-"}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-ink/10 bg-white p-4">
                  <div className="mb-4 text-lg font-semibold text-ink">
                    Historial de categoría
                  </div>

                  {(selectedProfile.categoryHistory ?? []).length === 0 ? (
                    <div className="text-sm text-ink/60">Sin historial.</div>
                  ) : (
                    <div className="space-y-3">
                      {(selectedProfile.categoryHistory ?? []).map((item) => (
                        <div
                          key={item.id}
                          className="rounded-2xl border border-ink/10 bg-ink/5 p-3 text-sm"
                        >
                          <div className="font-semibold text-ink">
                            {categoryLabel(item.category)}
                          </div>
                          <div className="text-ink/70">
                            Desde: {formatDateOnly(item.effectiveFrom)}
                          </div>
                          <div className="text-ink/70">
                            Hasta:{" "}
                            {item.effectiveTo
                              ? formatDateOnly(item.effectiveTo)
                              : "Actual"}
                          </div>
                          <div className="text-xs text-ink/50">
                            {item.reason ?? "-"}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-ink/10 bg-white p-4">
                  <div className="mb-4 text-lg font-semibold text-ink">
                    Historial de estado
                  </div>

                  {(selectedProfile.statusHistory ?? []).length === 0 ? (
                    <div className="text-sm text-ink/60">Sin historial.</div>
                  ) : (
                    <div className="space-y-3">
                      {(selectedProfile.statusHistory ?? []).map((item) => (
                        <div
                          key={item.id}
                          className="rounded-2xl border border-ink/10 bg-ink/5 p-3 text-sm"
                        >
                          <div className="font-semibold text-ink">
                            {statusLabel(item.status)}
                          </div>
                          <div className="text-ink/70">
                            Desde: {formatDateOnly(item.effectiveFrom)}
                          </div>
                          <div className="text-ink/70">
                            Hasta:{" "}
                            {item.effectiveTo
                              ? formatDateOnly(item.effectiveTo)
                              : "Actual"}
                          </div>
                          <div className="text-xs text-ink/50">
                            {item.reason ?? "-"}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-2xl border border-ink/10 bg-white p-4">
                  <div className="mb-4 text-lg font-semibold text-ink">
                    Últimos pagos
                  </div>

                  {(selectedProfile.payments ?? []).length === 0 ? (
                    <div className="text-sm text-ink/60">
                      Sin pagos registrados.
                    </div>
                  ) : (
                    <>
                      <div className="hidden overflow-x-auto sm:block">
                        <table className="min-w-full border-separate border-spacing-y-2">
                          <thead>
                            <tr className="text-left text-xs uppercase tracking-wide text-ink/50">
                              <th className="px-3 py-2">Fecha</th>
                              <th className="px-3 py-2">Período</th>
                              <th className="px-3 py-2">Monto</th>
                              <th className="px-3 py-2">Método</th>
                              <th className="px-3 py-2">Estado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(selectedProfile.payments ?? [])
                              .slice(0, 12)
                              .map((payment) => (
                                <tr
                                  key={payment.id}
                                  className="rounded-2xl bg-ink/5 text-sm"
                                >
                                  <td className="rounded-l-2xl px-3 py-3">
                                    {formatDateOnly(payment.paidAt)}
                                  </td>
                                  <td className="px-3 py-3">
                                    {String(payment.periodMonth).padStart(
                                      2,
                                      "0",
                                    )}
                                    /{payment.periodYear}
                                  </td>
                                  <td className="px-3 py-3 font-semibold">
                                    {fmtMoney(payment.amount)}
                                  </td>
                                  <td className="px-3 py-3">
                                    {payment.methodCode}
                                  </td>
                                  <td className="rounded-r-2xl px-3 py-3">
                                    {payment.status}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="space-y-3 sm:hidden">
                        {(selectedProfile.payments ?? [])
                          .slice(0, 12)
                          .map((payment) => (
                            <div
                              key={payment.id}
                              className="rounded-2xl bg-ink/5 p-3 text-sm"
                            >
                              <div className="flex justify-between gap-3">
                                <span className="font-semibold text-ink">
                                  {String(payment.periodMonth).padStart(2, "0")}
                                  /{payment.periodYear}
                                </span>
                                <span className="font-bold text-ink">
                                  {fmtMoney(payment.amount)}
                                </span>
                              </div>
                              <div className="mt-2 text-xs text-ink/60">
                                {formatDateOnly(payment.paidAt)} ·{" "}
                                {payment.methodCode} · {payment.status}
                              </div>
                            </div>
                          ))}
                      </div>
                    </>
                  )}
                </div>

                <div className="rounded-2xl border border-ink/10 bg-white p-4">
                  <div className="mb-4 text-lg font-semibold text-ink">
                    Acciones rápidas
                  </div>

                  <div className="grid gap-3 sm:flex sm:flex-wrap">
                    {selectedProfile.phone && (
                      <a
                        href={buildWhatsappLink(selectedProfile) ?? undefined}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-700"
                      >
                        Abrir WhatsApp
                      </a>
                    )}

                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => {
                          const member = selectedProfile;
                          closeProfile();
                          openEdit(member);
                        }}
                        className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white"
                      >
                        Editar H.·.
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {canEdit && showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3 py-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-4 shadow-2xl sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-ink/10 pb-4">
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-ink sm:text-2xl">
                  {isEditing ? "Editar H.·." : "Nuevo H.·."}
                </h2>
                <p className="mt-1 text-sm text-ink/60">
                  Los valores posibles de grado son Aprendiz, Compañero y
                  Maestro.
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                className="shrink-0 rounded-2xl border border-ink/10 px-4 py-2 text-sm font-semibold text-ink/70 hover:bg-ink/5"
              >
                Cerrar
              </button>
            </div>

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
                  Documento
                </label>
                <input
                  value={form.documentNumber}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      documentNumber: e.target.value,
                    }))
                  }
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
                  Fecha de iniciación
                </label>
                <input
                  type="date"
                  value={form.initiationDate}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      initiationDate: e.target.value,
                    }))
                  }
                  required
                  className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-ink/80">
                  Fecha de compañero
                </label>
                <input
                  type="date"
                  value={form.fellowcraftDate}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      fellowcraftDate: e.target.value,
                    }))
                  }
                  required={
                    form.grade === "COMPANERO" || form.grade === "MAESTRO"
                  }
                  className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-ink/80">
                  Fecha de maestro
                </label>
                <input
                  type="date"
                  value={form.masterDate}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, masterDate: e.target.value }))
                  }
                  required={form.grade === "MAESTRO"}
                  className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
                />
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

              <div className="sticky bottom-0 -mx-4 mt-2 flex gap-3 border-t border-ink/10 bg-white px-4 py-4 md:col-span-2 sm:-mx-6 sm:px-6">
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
                  {saving
                    ? "Guardando..."
                    : isEditing
                      ? "Guardar cambios"
                      : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
