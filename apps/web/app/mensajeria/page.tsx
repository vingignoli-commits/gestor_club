'use client';

import { useEffect, useMemo, useState } from 'react';
import { SectionCard } from '../../components/section-card';
import { api } from '../../lib/api';

type CampaignCode = 'initial-notice' | 'reminder' | 'custom';

type CampaignRecipient = {
  memberId: string;
  matricula: string;
  firstName: string;
  lastName: string;
  grade: string | null;
  destination: string;
  message: string;
  waUrl: string;
  reminderSentThisMonth: boolean;
  debt: {
    totalDebt: number;
    monthsOwed: number;
    owesCurrentMonth: boolean;
    overdueMonthLabels: string[];
    currentMonthAmount: number;
    months: Array<{
      label: string;
      category: string;
      amount: number;
      overdue: boolean;
      isCurrentMonth: boolean;
    }>;
  };
};

type CampaignSkipped = {
  memberId: string;
  matricula: string;
  firstName: string;
  lastName: string;
  destination: string | null;
  reasonCode: 'NO_DEBT' | 'HONOR_MEMBER';
  reasonLabel: string;
};

type CampaignPreview = {
  campaignCode: CampaignCode;
  generatedAt: string;
  currentMonthLabel: string;
  recipientsCount: number;
  skippedCount: number;
  recipients: CampaignRecipient[];
  skipped: CampaignSkipped[];
};

type Member = {
  id: string;
  matricula: string;
  firstName: string;
  lastName: string;
  grade: string | null;
  category: string;
  status: string;
  phone: string | null;
};

type WhatsappTemplate = {
  id: string;
  name: string;
  code: string;
  body: string;
  isActive: boolean;
  createdAt: string;
};

type CustomRecipient = {
  member: Member;
  destination: string;
  message: string;
  waUrl: string;
  registered: boolean;
};

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n);
}

function normalizePhone(phone: string | null) {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

function memberName(member: Member) {
  return `${member.lastName}, ${member.firstName}`;
}

function campaignTitle(code: CampaignCode) {
  if (code === 'initial-notice') return 'Aviso Inicial';
  if (code === 'reminder') return 'Recordatorio';
  return 'Mensaje personalizado';
}

function campaignDescription(code: CampaignCode) {
  if (code === 'custom') {
    return 'Creá mensajes personalizados, elegí destinatarios y guardá plantillas reutilizables.';
  }

  return code === 'initial-notice'
    ? 'Esta campaña incluye a todos los socios que deban al menos una cuota. Se excluye a quienes no registran deuda y a los miembros de honor.'
    : 'Esta campaña incluye a todos los socios que deban al menos una cuota. Se excluye a quienes no registran deuda y a los miembros de honor.';
}

function renderTemplate(template: string, member: Member) {
  const greeting =
    member.grade === 'MAESTRO'
      ? `V.·.H.·. ${member.firstName}`
      : `Q.·.H.·. ${member.firstName}`;

  return template
    .replaceAll('{nombre}', member.firstName)
    .replaceAll('{apellido}', member.lastName)
    .replaceAll('{nombre_completo}', `${member.firstName} ${member.lastName}`)
    .replaceAll('{matricula}', member.matricula)
    .replaceAll('{grado}', member.grade ?? '')
    .replaceAll('{categoria}', member.category)
    .replaceAll('{saludo}', greeting);
}

export default function MessagingPage() {
  const [activeCampaign, setActiveCampaign] =
    useState<CampaignCode>('initial-notice');

  const [initialCampaign, setInitialCampaign] =
    useState<CampaignPreview | null>(null);
  const [reminderCampaign, setReminderCampaign] =
    useState<CampaignPreview | null>(null);

  const [members, setMembers] = useState<Member[]>([]);
  const [templates, setTemplates] = useState<WhatsappTemplate[]>([]);

  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState('');

  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [templateForm, setTemplateForm] = useState({
    id: '',
    name: '',
    body: '',
  });

  const [loading, setLoading] = useState(true);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [sending, setSending] = useState<{
    code: CampaignCode;
    memberId: string;
  } | null>(null);
  const [error, setError] = useState('');

  async function loadAll() {
    const [initialData, reminderData, membersData, templatesData] =
      await Promise.all([
        api.get<CampaignPreview>('/whatsapp/campaigns/initial-notice'),
        api.get<CampaignPreview>('/whatsapp/campaigns/reminder'),
        api.get<Member[]>('/members'),
        api.get<WhatsappTemplate[]>('/whatsapp/templates'),
      ]);

    setInitialCampaign(initialData);
    setReminderCampaign(reminderData);
    setMembers(
      [...membersData].sort((a, b) =>
        `${a.lastName} ${a.firstName}`.localeCompare(
          `${b.lastName} ${b.firstName}`,
          'es',
          { sensitivity: 'base' },
        ),
      ),
    );
    setTemplates(templatesData);
  }

  useEffect(() => {
    loadAll()
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : 'No se pudo cargar la mensajería',
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const campaign =
    activeCampaign === 'initial-notice' ? initialCampaign : reminderCampaign;

  const filteredMembers = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();

    if (!query) return members;

    return members.filter((member) =>
      `${member.lastName} ${member.firstName} ${member.matricula}`
        .toLowerCase()
        .includes(query),
    );
  }, [members, memberSearch]);

  const customRecipients = useMemo<CustomRecipient[]>(() => {
    return members
      .filter((member) => selectedMemberIds.includes(member.id))
      .map((member) => {
        const destination = normalizePhone(member.phone);
        const message = renderTemplate(customMessage, member);
        const waUrl = destination
          ? `https://wa.me/${destination}?text=${encodeURIComponent(message)}`
          : '';

        return {
          member,
          destination,
          message,
          waUrl,
          registered: false,
        };
      });
  }, [members, selectedMemberIds, customMessage]);

  function toggleMember(memberId: string) {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId],
    );
  }

  function selectAllFiltered() {
    const ids = filteredMembers.map((member) => member.id);
    setSelectedMemberIds((prev) => Array.from(new Set([...prev, ...ids])));
  }

  function clearSelectedMembers() {
    setSelectedMemberIds([]);
  }

  function handleTemplateSelect(templateId: string) {
    setSelectedTemplateId(templateId);

    const template = templates.find((item) => item.id === templateId);

    if (template) {
      setCustomMessage(template.body);
      setTemplateForm({
        id: template.id,
        name: template.name,
        body: template.body,
      });
    }
  }

  function clearTemplateForm() {
    setTemplateForm({
      id: '',
      name: '',
      body: '',
    });
  }

  async function handleSaveTemplate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSavingTemplate(true);

    try {
      if (templateForm.id) {
        await api.patch(`/whatsapp/templates/${templateForm.id}`, {
          name: templateForm.name,
          body: templateForm.body,
        });
      } else {
        await api.post('/whatsapp/templates', {
          name: templateForm.name,
          body: templateForm.body,
        });
      }

      clearTemplateForm();

      const updated = await api.get<WhatsappTemplate[]>('/whatsapp/templates');
      setTemplates(updated);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'No se pudo guardar la plantilla',
      );
    } finally {
      setSavingTemplate(false);
    }
  }

  async function handleDeleteTemplate(templateId: string) {
    setError('');

    try {
      await api.patch(`/whatsapp/templates/${templateId}`, {
        isActive: false,
      });

      if (selectedTemplateId === templateId) {
        setSelectedTemplateId('');
      }

      if (templateForm.id === templateId) {
        clearTemplateForm();
      }

      const updated = await api.get<WhatsappTemplate[]>('/whatsapp/templates');
      setTemplates(updated);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'No se pudo eliminar la plantilla',
      );
    }
  }

  async function handleMarkSent(code: CampaignCode, memberId: string) {
    setSending({ code, memberId });
    setError('');

    try {
      if (code === 'custom') {
        const recipient = customRecipients.find(
          (item) => item.member.id === memberId,
        );

        if (!recipient) return;

        await api.post('/whatsapp/send', {
          memberId,
          destination: recipient.destination,
          message: recipient.message,
          templateId: selectedTemplateId || undefined,
        });
      } else {
        await api.post(`/whatsapp/campaigns/${code}/mark-sent`, {
          memberId,
        });

        await loadAll();
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo registrar el envío individual',
      );
    } finally {
      setSending(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        {(['initial-notice', 'reminder', 'custom'] as CampaignCode[]).map(
          (code) => (
            <button
              key={code}
              type="button"
              onClick={() => setActiveCampaign(code)}
              className={`rounded-2xl px-5 py-3 text-sm font-semibold transition ${
                activeCampaign === code
                  ? 'bg-accent text-white'
                  : 'bg-ink/10 text-ink/70 hover:bg-ink/20'
              }`}
            >
              {campaignTitle(code)}
            </button>
          ),
        )}
      </div>

      {activeCampaign === 'custom' ? (
        <SectionCard
          title="Mensaje personalizado"
          description="Elegí socios, redactá un mensaje o usá una plantilla guardada. Variables disponibles: {saludo}, {nombre}, {apellido}, {nombre_completo}, {matricula}, {grado}, {categoria}."
        >
          {loading ? (
            <div className="py-8 text-sm text-ink/60">Cargando...</div>
          ) : (
            <div className="space-y-6">
              {error && (
                <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
                <div className="space-y-6">
                  <div className="rounded-2xl border border-ink/10 bg-white p-4">
                    <div className="mb-4 text-lg font-semibold text-ink">
                      Destinatarios
                    </div>

                    <input
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="Buscar por apellido, nombre o matrícula"
                      className="mb-4 w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
                    />

                    <div className="mb-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={selectAllFiltered}
                        className="rounded-2xl border border-ink/10 px-4 py-2 text-sm font-semibold"
                      >
                        Seleccionar filtrados
                      </button>
                      <button
                        type="button"
                        onClick={clearSelectedMembers}
                        className="rounded-2xl border border-ink/10 px-4 py-2 text-sm font-semibold"
                      >
                        Limpiar selección
                      </button>
                    </div>

                    <div className="max-h-96 space-y-2 overflow-y-auto pr-2">
                      {filteredMembers.map((member) => {
                        const checked = selectedMemberIds.includes(member.id);

                        return (
                          <label
                            key={member.id}
                            className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${
                              checked
                                ? 'border-accent bg-accent/10'
                                : 'border-ink/10 bg-white'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleMember(member.id)}
                              className="mt-1"
                            />
                            <div>
                              <div className="font-semibold text-ink">
                                {memberName(member)}
                              </div>
                              <div className="text-xs text-ink/60">
                                Matrícula {member.matricula} ·{' '}
                                {member.phone || 'Sin celular'}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-ink/10 bg-white p-4">
                    <div className="mb-4 text-lg font-semibold text-ink">
                      Plantillas
                    </div>

                    <select
                      value={selectedTemplateId}
                      onChange={(e) => handleTemplateSelect(e.target.value)}
                      className="mb-4 w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
                    >
                      <option value="">Sin plantilla</option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>

                    <form onSubmit={handleSaveTemplate} className="space-y-4">
                      <input
                        value={templateForm.name}
                        onChange={(e) =>
                          setTemplateForm((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        placeholder="Nombre de la plantilla"
                        className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
                      />

                      <textarea
                        value={templateForm.body}
                        onChange={(e) =>
                          setTemplateForm((prev) => ({
                            ...prev,
                            body: e.target.value,
                          }))
                        }
                        rows={5}
                        placeholder="Texto de la plantilla"
                        className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
                      />

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="submit"
                          disabled={savingTemplate}
                          className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                        >
                          {savingTemplate
                            ? 'Guardando...'
                            : templateForm.id
                              ? 'Guardar cambios'
                              : 'Guardar plantilla'}
                        </button>

                        <button
                          type="button"
                          onClick={clearTemplateForm}
                          className="rounded-2xl border border-ink/10 px-4 py-3 text-sm font-semibold"
                        >
                          Nueva plantilla
                        </button>

                        {templateForm.id && (
                          <button
                            type="button"
                            onClick={() => handleDeleteTemplate(templateForm.id)}
                            className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="rounded-2xl border border-ink/10 bg-white p-4">
                    <div className="mb-4 text-lg font-semibold text-ink">
                      Mensaje
                    </div>

                    <textarea
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      rows={10}
                      placeholder="Escribí el mensaje personalizado"
                      className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm"
                    />

                    <div className="mt-3 text-xs leading-relaxed text-ink/60">
                      Variables: {'{saludo}'}, {'{nombre}'}, {'{apellido}'},{' '}
                      {'{nombre_completo}'}, {'{matricula}'}, {'{grado}'},{' '}
                      {'{categoria}'}.
                    </div>
                  </div>

                  <div className="rounded-2xl border border-ink/10 bg-white p-4">
                    <div className="mb-4 flex flex-col gap-1">
                      <div className="text-lg font-semibold text-ink">
                        Vista previa y envío
                      </div>
                      <div className="text-sm text-ink/60">
                        Seleccionados: {customRecipients.length}
                      </div>
                    </div>

                    {customRecipients.length === 0 ? (
                      <div className="text-sm text-ink/60">
                        No hay destinatarios seleccionados.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {customRecipients.map((recipient) => {
                          const isSending =
                            sending?.code === 'custom' &&
                            sending.memberId === recipient.member.id;

                          return (
                            <div
                              key={recipient.member.id}
                              className="rounded-2xl border border-ink/10 p-4"
                            >
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                  <div className="font-semibold text-ink">
                                    {memberName(recipient.member)}
                                  </div>
                                  <div className="text-sm text-ink/60">
                                    {recipient.destination || 'Sin celular'}
                                  </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                  <a
                                    href={recipient.waUrl || undefined}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`rounded-2xl border px-4 py-3 text-center text-sm font-semibold ${
                                      recipient.destination
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                        : 'pointer-events-none border-slate-200 bg-slate-50 text-slate-500'
                                    }`}
                                  >
                                    {recipient.destination
                                      ? 'Abrir WhatsApp'
                                      : 'Falta celular'}
                                  </a>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleMarkSent(
                                        'custom',
                                        recipient.member.id,
                                      )
                                    }
                                    disabled={
                                      isSending || !recipient.destination
                                    }
                                    className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                                  >
                                    {isSending
                                      ? 'Registrando...'
                                      : 'Registrar envío'}
                                  </button>
                                </div>
                              </div>

                              <div className="mt-4 whitespace-pre-wrap rounded-2xl bg-ink/5 p-4 text-sm text-ink">
                                {recipient.message || 'Mensaje vacío'}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </SectionCard>
      ) : (
        <SectionCard
          title={campaignTitle(activeCampaign)}
          description={campaignDescription(activeCampaign)}
        >
          {loading ? (
            <div className="py-8 text-sm text-ink/60">Cargando campaña...</div>
          ) : campaign ? (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-ink/10 bg-ink/5 p-4">
                  <div className="text-xs uppercase tracking-wide text-ink/50">
                    Mes de campaña
                  </div>
                  <div className="mt-2 text-xl font-bold text-ink">
                    {campaign.currentMonthLabel}
                  </div>
                </div>

                <div className="rounded-2xl border border-ink/10 bg-ink/5 p-4">
                  <div className="text-xs uppercase tracking-wide text-ink/50">
                    Destinatarios
                  </div>
                  <div className="mt-2 text-xl font-bold text-ink">
                    {campaign.recipientsCount}
                  </div>
                </div>

                <div className="rounded-2xl border border-ink/10 bg-ink/5 p-4">
                  <div className="text-xs uppercase tracking-wide text-ink/50">
                    Excluidos
                  </div>
                  <div className="mt-2 text-xl font-bold text-ink">
                    {campaign.skippedCount}
                  </div>
                </div>

                <div className="rounded-2xl border border-ink/10 bg-ink/5 p-4">
                  <div className="text-xs uppercase tracking-wide text-ink/50">
                    Generada
                  </div>
                  <div className="mt-2 text-sm font-semibold text-ink">
                    {new Date(campaign.generatedAt).toLocaleString('es-AR')}
                  </div>
                </div>
              </div>

              {error && (
                <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {campaign.recipients.length === 0 ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
                  No hay socios alcanzados por esta campaña.
                </div>
              ) : (
                <div className="space-y-4">
                  {campaign.recipients.map((recipient) => {
                    const isSending =
                      sending?.code === activeCampaign &&
                      sending.memberId === recipient.memberId;

                    return (
                      <div
                        key={`${activeCampaign}-${recipient.memberId}`}
                        className="rounded-2xl border border-ink/10 p-4"
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-lg font-semibold text-ink">
                                {recipient.lastName}, {recipient.firstName}
                              </div>
                              {recipient.reminderSentThisMonth && (
                                <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                                  Enviado este mes
                                </span>
                              )}
                            </div>

                            <div className="text-sm text-ink/70">
                              Matrícula:{' '}
                              <span className="font-medium text-ink">
                                {recipient.matricula}
                              </span>
                            </div>

                            <div className="text-sm text-ink/70">
                              Celular:{' '}
                              <span className="font-medium text-ink">
                                {recipient.destination || 'Sin celular'}
                              </span>
                            </div>

                            <div className="text-sm text-ink/70">
                              Meses adeudados:{' '}
                              <span className="font-medium text-ink">
                                {recipient.debt.months
                                  .map((month) => month.label)
                                  .join(', ')}
                              </span>
                            </div>

                            {activeCampaign === 'initial-notice' && (
                              <div className="text-sm text-ink/70">
                                Cuota base del mes actual:{' '}
                                <span className="font-medium text-ink">
                                  {fmt(recipient.debt.currentMonthAmount)}
                                </span>
                              </div>
                            )}

                            <div className="text-sm text-ink/70">
                              Deuda estimada actual:{' '}
                              <span className="font-medium text-ink">
                                {fmt(recipient.debt.totalDebt)}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col gap-3">
                            <a
                              href={recipient.waUrl || undefined}
                              target="_blank"
                              rel="noreferrer"
                              className={`rounded-2xl border px-4 py-3 text-center text-sm font-semibold ${
                                recipient.destination
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                  : 'pointer-events-none border-slate-200 bg-slate-50 text-slate-500'
                              }`}
                            >
                              {recipient.destination
                                ? 'Abrir WhatsApp'
                                : 'Falta celular'}
                            </a>

                            <button
                              type="button"
                              onClick={() =>
                                handleMarkSent(
                                  activeCampaign,
                                  recipient.memberId,
                                )
                              }
                              disabled={
                                recipient.reminderSentThisMonth ||
                                isSending ||
                                !recipient.destination
                              }
                              className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                            >
                              {recipient.reminderSentThisMonth
                                ? 'Ya registrado'
                                : isSending
                                  ? 'Registrando...'
                                  : 'Registrar envío'}
                            </button>
                          </div>
                        </div>

                        <div className="mt-4 rounded-2xl bg-ink/5 p-4">
                          <div className="mb-2 text-xs uppercase tracking-wide text-ink/50">
                            Mensaje
                          </div>
                          <div className="whitespace-pre-wrap text-sm text-ink">
                            {recipient.message}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {campaign.skipped.length > 0 && (
                <SectionCard
                  title="Socios excluidos"
                  description="Se excluye a quienes no registran cuotas adeudadas y a los miembros de honor."
                  className="mt-2"
                >
                  <div className="space-y-3">
                    {campaign.skipped.map((item) => (
                      <div
                        key={`${activeCampaign}-${item.memberId}`}
                        className="rounded-2xl border border-ink/10 bg-white p-4"
                      >
                        <div className="font-semibold text-ink">
                          {item.lastName}, {item.firstName}
                        </div>
                        <div className="text-sm text-ink/70">
                          Matrícula: {item.matricula}
                        </div>
                        <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                          {item.reasonLabel}
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}
            </div>
          ) : (
            <div className="py-8 text-sm text-ink/60">
              No se pudo cargar la campaña.
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
}
