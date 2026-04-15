'use client';

import { useEffect, useState } from 'react';
import { SectionCard } from '../../components/section-card';
import { api } from '../../lib/api';

type CampaignCode = 'initial-notice' | 'reminder';

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
  reasonCode: 'NO_DEBT';
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

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n);
}

function campaignTitle(code: CampaignCode) {
  return code === 'initial-notice' ? 'Aviso Inicial' : 'Recordatorio';
}

function campaignDescription(code: CampaignCode) {
  return code === 'initial-notice'
    ? 'Esta campaña incluye a todos los socios que deban al menos una cuota. Solo se excluye a quien no registra deuda.'
    : 'Esta campaña incluye a todos los socios que deban al menos una cuota. El registro de envío es individual.';
}

export default function MessagingPage() {
  const [activeCampaign, setActiveCampaign] =
    useState<CampaignCode>('initial-notice');
  const [initialCampaign, setInitialCampaign] = useState<CampaignPreview | null>(null);
  const [reminderCampaign, setReminderCampaign] = useState<CampaignPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<{ code: CampaignCode; memberId: string } | null>(null);
  const [error, setError] = useState('');

  async function loadAll() {
    const [initialData, reminderData] = await Promise.all([
      api.get<CampaignPreview>('/whatsapp/campaigns/initial-notice'),
      api.get<CampaignPreview>('/whatsapp/campaigns/reminder'),
    ]);

    setInitialCampaign(initialData);
    setReminderCampaign(reminderData);
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

  async function handleMarkSent(code: CampaignCode, memberId: string) {
    setSending({ code, memberId });
    setError('');

    try {
      await api.post(`/whatsapp/campaigns/${code}/mark-sent`, {
        memberId,
      });
      await loadAll();
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

  const campaign =
    activeCampaign === 'initial-notice' ? initialCampaign : reminderCampaign;

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        {(['initial-notice', 'reminder'] as CampaignCode[]).map((code) => (
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
        ))}
      </div>

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
                            {recipient.destination ? 'Abrir WhatsApp' : 'Falta celular'}
                          </a>

                          <button
                            type="button"
                            onClick={() =>
                              handleMarkSent(activeCampaign, recipient.memberId)
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
                description="Solo se excluye a quienes no registran cuotas adeudadas."
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
    </div>
  );
}
