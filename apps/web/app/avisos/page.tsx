"use client";

import { useEffect, useState } from "react";
import { SectionCard } from "../../components/section-card";
import { api } from "../../lib/api";
import { formatDateOnly } from "../../lib/date";

type Announcement = {
  id: string;
  title: string;
  body: string;
  isPinned: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

function emptyDraft() {
  return { title: "", body: "", isPinned: false };
}

export default function AvisosPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [draft, setDraft] = useState(emptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);

  async function reload() {
    const data = await api.get<Announcement[]>("/announcements/manage");
    setItems(data);
  }

  useEffect(() => {
    reload()
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function startEdit(item: Announcement) {
    setEditingId(item.id);
    setDraft({ title: item.title, body: item.body, isPinned: item.isPinned });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(emptyDraft());
  }

  async function submit() {
    if (!draft.title.trim() || !draft.body.trim()) {
      setError("El aviso necesita un título y un cuerpo.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingId) {
        await api.patch(`/announcements/${editingId}`, draft);
      } else {
        await api.post("/announcements", draft);
      }
      cancelEdit();
      await reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function toggle(item: Announcement, field: "isPinned" | "isActive") {
    setError(null);
    try {
      await api.patch(`/announcements/${item.id}`, { [field]: !item[field] });
      await reload();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function remove(item: Announcement) {
    if (
      typeof window !== "undefined" &&
      !window.confirm(`¿Eliminar el aviso "${item.title}"? Esta acción no se puede deshacer.`)
    ) {
      return;
    }

    setError(null);
    try {
      await api.delete(`/announcements/${item.id}`);
      await reload();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold text-ink">Avisos</h1>
        <p className="mt-1 text-sm text-ink/60">
          Comunicación masiva hacia los HH.·. con acceso a Nuestro Taller. Los
          avisos activos se publican en su tablero.
        </p>
      </header>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      <SectionCard
        title={editingId ? "Editar aviso" : "Nuevo aviso"}
        description="El título y el cuerpo se muestran tal cual a los socios."
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink/70">
              Título
            </label>
            <input
              type="text"
              value={draft.title}
              maxLength={160}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
              placeholder="Ej: Tenida de instrucción del próximo viernes"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink/70">
              Cuerpo
            </label>
            <textarea
              value={draft.body}
              maxLength={4000}
              rows={5}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
              placeholder="Escribí el aviso para los HH.·."
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-ink/70">
            <input
              type="checkbox"
              checked={draft.isPinned}
              onChange={(e) => setDraft({ ...draft, isPinned: e.target.checked })}
              className="h-4 w-4"
            />
            Fijar arriba del tablero
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={submit}
              disabled={saving}
              className="rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? "Guardando…" : editingId ? "Guardar cambios" : "Publicar aviso"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-2xl border border-ink/10 bg-white px-5 py-3 text-sm font-semibold text-ink/70 hover:bg-ink/5"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Avisos publicados"
        description="Los inactivos no se muestran a los socios, pero podés reactivarlos."
      >
        {loading ? (
          <p className="text-sm text-ink/50">Cargando avisos…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-ink/50">Todavía no creaste ningún aviso.</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <article
                key={item.id}
                className={`rounded-2xl border p-4 ${
                  item.isActive
                    ? "border-ink/10 bg-white"
                    : "border-ink/10 bg-ink/5 opacity-70"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {item.isPinned && (
                        <span className="rounded-full bg-ink/10 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-ink/60">
                          Fijado
                        </span>
                      )}
                      {!item.isActive && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-amber-700">
                          Inactivo
                        </span>
                      )}
                      <h3 className="text-base font-semibold text-ink">{item.title}</h3>
                    </div>
                    <div className="mt-0.5 text-xs text-ink/40">
                      {formatDateOnly(item.createdAt)}
                    </div>
                  </div>
                </div>

                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink/80">
                  {item.body}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(item)}
                    className="rounded-xl border border-ink/10 bg-white px-3 py-1.5 text-xs font-semibold text-ink/70 hover:bg-ink/5"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => toggle(item, "isPinned")}
                    className="rounded-xl border border-ink/10 bg-white px-3 py-1.5 text-xs font-semibold text-ink/70 hover:bg-ink/5"
                  >
                    {item.isPinned ? "Desfijar" : "Fijar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggle(item, "isActive")}
                    className="rounded-xl border border-ink/10 bg-white px-3 py-1.5 text-xs font-semibold text-ink/70 hover:bg-ink/5"
                  >
                    {item.isActive ? "Desactivar" : "Reactivar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(item)}
                    className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                  >
                    Eliminar
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
