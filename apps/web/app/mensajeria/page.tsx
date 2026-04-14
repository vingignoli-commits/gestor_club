'use client';

import { useEffect, useState } from 'react';
import { SectionCard } from '../../components/section-card';
import { api } from '../../lib/api';

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
  reasonCode: 'NO_PHONE' | 'PAID_CURRENT_MONTH_AND_NO_DEBT' | 'NO_CURRENT_MONTH_DEBT';
  reasonLabel: string;
};

type CampaignPreview = {
  campaignCode: string;
  generatedAt: string;
  currentMonthLabel: string;
  recipientsCount: number;
  skippedCount: number;
  recipients: CampaignRecipient[];
  skipped: CampaignSkipped[];
};

type Dispatch = {
  id: string;
  destination: string;
  renderedBody: string;
  status: string;
  campaignCode?: string | null;
  campaignYear?: number | null;
  campaignMonth?: number | null;
  createdAt: string;
  member?: {
    firstName: string;
    lastName: string;
    matricula: string;
  } | null;
};

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n);
}

export default function MessagingPage() {
  const [campaign, setCampaign] = useState<CampaignPreview | null>(null);
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  const [error, setError] = useState('');

  async function loadAll() {
    const [campaignData, dispatchesData] = await Promise.all([
      api.get<CampaignPreview>('/whatsapp/campaigns/current-month-dues'),
      api.get<Dispatch[]>('/whatsapp/dispatches'),
    ]);

    setCampaign(campaignData);
    setDispatches(dispatchesData);
  }

  useEffect(() => {
    loadAll()
      .catch((err: unknown) => {
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudo cargar la mensajería',
        );
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleCreateCampaign() {
    setCreatingCampaign(true);
    setError('');

    try {
      await api.post('/whatsapp/campaigns/current-month-dues', {});
      await loadAll();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo generar la campaña',
      );
    } finally {
      setCreatingCampaign(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Campaña de aviso de cuota del mes en curso"
        description="Solo se incluye a socios que deban el mes actual. Si el socio ya pagó el mes en curso y no registra deuda, queda marcado para no enviar mensaje."
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
                  No enviar
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

            <div className="rounded-2xl border border-ink/10 bg-slate-50 p-4 text-sm text-ink/70">
              El mensaje incluye el valor de la cuota del mes actual, el alias
              <span className="font-semibold text-ink"> tesoreria.p100</span> y,
              si corresponde, los meses vencidos anteriores.
            </div>

            {error && (
              <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleCreateCampaign}
                disabled={
                  creatingCampaign ||
                  campaign.recipients.filter((recipient) => !recipient.reminderSentThisMonth)
                    .length === 0
                }
                className="rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {creatingCampaign ? 'Generando...' : 'Registrar campaña'}
              </button>
            </div>

            {campaign.recipients.length === 0 ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
                No corresponde enviar mensajes: no hay socios que deban el mes en curso.
              </div>
            ) : (
              <div className="space-y-4">
                {campaign.recipients.map((recipient) => (
                  <div
                    key={recipient.memberId}
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
                              Recordatorio enviado este mes
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
                            {recipient.destination}
                          </span>
                        </div>

                        <div className="text-sm text-ink/70">
                          Cuota del mes actual:{' '}
                          <span className="font-medium text-ink">
                            {fmt(recipient.debt.currentMonthAmount)}
                          </span>
                        </div>

                        <div className="text-sm text-ink/70">
                          Meses adeudados:{' '}
                          <span className="font-medium text-ink">
                            {recipient.debt.months.map((month) => month.label).join(', ')}
                          </span>
                        </div>

                        <div className="text-sm text-ink/70">
                          Deuda estimada actual:{' '}
                          <span className="font-medium text-ink">
                            {fmt(recipient.debt.totalDebt)}
                          </span>
                        </div>
                      </div>

                      <a
                        href={recipient.waUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700"
                      >
                        Abrir WhatsApp
                      </a>
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
                ))}
              </div>
            )}

            {campaign.skipped.length > 0 && (
              <SectionCard
                title="Socios excluidos de la campaña"
                description="Listado de socios a los que no corresponde enviar mensaje en esta corrida."
                className="mt-2"
              >
                <div className="space-y-3">
                  {campaign.skipped.map((item) => (
                    <div
                      key={item.memberId}
                      className="rounded-2xl border border-ink/10 bg-white p-4"
                    >
                      <div className="font-semibold text-ink">
                        {item.lastName}, {item.firstName}
                      </div>
                      <div className="text-sm text-ink/70">
                        Matrícula: {item.matricula}
                      </div>
                      <div className="text-sm text-ink/70">
                        Celular: {item.destination ?? '-'}
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

      <SectionCard
        title="Historial de envíos"
        description="Trazabilidad de campañas y mensajes generados."
      >
        {loading ? (
          <div className="py-8 text-sm text-ink/60">Cargando historial...</div>
        ) : dispatches.length === 0 ? (
          <div className="py-8 text-sm text-ink/60">
            No hay envíos registrados todavía.
          </div>
        ) : (
          <div className="space-y-3">
            {dispatches.map((dispatch) => (
              <div
                key={dispatch.id}
                className="rounded-2xl border border-ink/10 bg-white p-4"
              >
                <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1">
                    <div className="font-semibold text-ink">
                      {dispatch.member
                        ? `${dispatch.member.lastName}, ${dispatch.member.firstName}`
                        : dispatch.destination}
                    </div>
                    <div className="text-sm text-ink/70">
                      {dispatch.destination}
                    </div>
                    <div className="text-xs text-ink/50">
                      {new Date(dispatch.createdAt).toLocaleString('es-AR')}
                    </div>
                    {dispatch.campaignCode && (
                      <div className="text-xs text-ink/50">
                        Campaña: {dispatch.campaignCode} {dispatch.campaignMonth}/
                        {dispatch.campaignYear}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-ink/10 px-3 py-2 text-xs font-semibold text-ink/70">
                    {dispatch.status}
                  </div>
                </div>

                <div className="mt-3 whitespace-pre-wrap rounded-2xl bg-ink/5 p-3 text-sm text-ink">
                  {dispatch.renderedBody}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
