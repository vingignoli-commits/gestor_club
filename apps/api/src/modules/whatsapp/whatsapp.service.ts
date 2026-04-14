import { Injectable, NotFoundException } from '@nestjs/common';
import {
  MemberCategory,
  MemberStatus,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type MemberWithDebtData = Prisma.MemberGetPayload<{
  include: {
    payments: true;
    statusHistory: true;
    categoryHistory: true;
  };
}>;

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
      category: MemberCategory;
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

const MONTHS_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

@Injectable()
export class WhatsappService {
  constructor(private readonly prisma: PrismaService) {}

  getTemplates() {
    return this.prisma.whatsappTemplate.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  getDispatches() {
    return this.prisma.messageDispatch.findMany({
      include: { member: true, template: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCurrentMonthDuesCampaign() {
    const queryDate = new Date();
    const currentYear = queryDate.getUTCFullYear();
    const currentMonth = queryDate.getUTCMonth() + 1;

    const [members, rates, existingDispatches] = await Promise.all([
      this.prisma.member.findMany({
        include: {
          payments: {
            where: { status: PaymentStatus.REGISTERED },
            orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
          },
          statusHistory: {
            orderBy: { effectiveFrom: 'desc' },
          },
          categoryHistory: {
            orderBy: { effectiveFrom: 'desc' },
          },
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      }),
      this.prisma.monthlyRate.findMany({
        where: {
          validFrom: { lte: queryDate },
          OR: [{ validTo: null }, { validTo: { gt: queryDate } }],
        },
        orderBy: [{ category: 'asc' }, { validFrom: 'desc' }],
      }),
      this.prisma.messageDispatch.findMany({
        where: {
          campaignCode: 'current-month-dues',
          campaignYear: currentYear,
          campaignMonth: currentMonth,
        },
        select: {
          memberId: true,
        },
      }),
    ]);

    const currentRates = this.buildCurrentRatesMap(rates, queryDate);
    const remindedMemberIds = new Set(
      existingDispatches
        .map((dispatch) => dispatch.memberId)
        .filter((memberId): memberId is string => Boolean(memberId)),
    );

    const recipients: CampaignRecipient[] = [];
    const skipped: CampaignSkipped[] = [];

    for (const member of members) {
      const phone = this.normalizePhone(member.phone);
      const snapshot = this.buildDebtSnapshot(member, currentRates, queryDate);

      if (!phone) {
        skipped.push({
          memberId: member.id,
          matricula: member.matricula,
          firstName: member.firstName,
          lastName: member.lastName,
          destination: null,
          reasonCode: 'NO_PHONE',
          reasonLabel: 'No tiene celular cargado',
        });
        continue;
      }

      if (!snapshot.owesCurrentMonth && snapshot.monthsOwed === 0) {
        skipped.push({
          memberId: member.id,
          matricula: member.matricula,
          firstName: member.firstName,
          lastName: member.lastName,
          destination: phone,
          reasonCode: 'PAID_CURRENT_MONTH_AND_NO_DEBT',
          reasonLabel: 'Ya pagó el mes en curso y no registra deuda',
        });
        continue;
      }

      if (!snapshot.owesCurrentMonth) {
        skipped.push({
          memberId: member.id,
          matricula: member.matricula,
          firstName: member.firstName,
          lastName: member.lastName,
          destination: phone,
          reasonCode: 'NO_CURRENT_MONTH_DEBT',
          reasonLabel: 'No debe el mes en curso',
        });
        continue;
      }

      const currentMonthAmount =
        snapshot.months.find((month) => month.isCurrentMonth)?.amount ?? 0;

      const message = this.buildCurrentMonthDebtMessage(
        member.firstName,
        member.grade,
        snapshot.currentMonthLabel,
        currentMonthAmount,
        snapshot.overdueMonthLabels,
      );

      const reminderSentThisMonth = remindedMemberIds.has(member.id);

      recipients.push({
        memberId: member.id,
        matricula: member.matricula,
        firstName: member.firstName,
        lastName: member.lastName,
        grade: member.grade,
        destination: phone,
        message,
        waUrl: `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
        reminderSentThisMonth,
        debt: {
          totalDebt: snapshot.debt,
          monthsOwed: snapshot.monthsOwed,
          owesCurrentMonth: snapshot.owesCurrentMonth,
          overdueMonthLabels: snapshot.overdueMonthLabels,
          currentMonthAmount,
          months: snapshot.months,
        },
      });
    }

    return {
      campaignCode: 'current-month-dues',
      generatedAt: queryDate.toISOString(),
      currentMonthLabel: this.monthLabel(currentYear, currentMonth),
      recipientsCount: recipients.length,
      skippedCount: skipped.length,
      recipients,
      skipped,
    };
  }

  async createCurrentMonthDuesCampaign() {
    const campaign = await this.getCurrentMonthDuesCampaign();
    const queryDate = new Date();
    const currentYear = queryDate.getUTCFullYear();
    const currentMonth = queryDate.getUTCMonth() + 1;

    const pendingRecipients = campaign.recipients.filter(
      (recipient) => !recipient.reminderSentThisMonth,
    );

    const created = await this.prisma.$transaction(
      pendingRecipients.map((recipient) =>
        this.prisma.messageDispatch.create({
          data: {
            memberId: recipient.memberId,
            destination: recipient.destination,
            renderedBody: recipient.message,
            status: 'PENDING',
            campaignCode: 'current-month-dues',
            campaignYear: currentYear,
            campaignMonth: currentMonth,
          },
          include: {
            member: true,
            template: true,
          },
        }),
      ),
    );

    return {
      campaignCode: campaign.campaignCode,
      generatedAt: campaign.generatedAt,
      createdCount: created.length,
      skippedAlreadySentCount: campaign.recipients.filter(
        (recipient) => recipient.reminderSentThisMonth,
      ).length,
      dispatches: created,
    };
  }

  async sendMessage(
    memberId: string,
    destination: string,
    message?: string,
    templateId?: string,
  ) {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      throw new NotFoundException('Socio no encontrado');
    }

    let renderedBody = message?.trim() ?? '';

    if (templateId) {
      const template = await this.prisma.whatsappTemplate.findUnique({
        where: { id: templateId },
      });

      if (!template) {
        throw new NotFoundException('Plantilla no encontrada');
      }

      if (!renderedBody) {
        renderedBody = template.body;
      }

      return this.prisma.messageDispatch.create({
        data: {
          memberId,
          templateId,
          destination,
          renderedBody,
          status: 'PENDING',
        },
        include: {
          member: true,
          template: true,
        },
      });
    }

    if (!renderedBody) {
      throw new NotFoundException('Mensaje vacío');
    }

    return this.prisma.messageDispatch.create({
      data: {
        memberId,
        destination,
        renderedBody,
        status: 'PENDING',
      },
      include: {
        member: true,
        template: true,
      },
    });
  }

  private buildCurrentMonthDebtMessage(
    firstName: string,
    grade: string | null,
    currentMonthLabel: string,
    currentMonthAmount: number,
    overdueMonthLabels: string[],
  ) {
    const greeting =
      grade === 'MAESTRO'
        ? `Hola V.·.H.·. ${firstName}.`
        : `Hola Q.·.H.·. ${firstName}.`;

    const currentAmountText = this.formatCurrency(currentMonthAmount);

    if (overdueMonthLabels.length === 0) {
      return `${greeting} Siendo que arrancó el ${currentMonthLabel} estamos haciendo el seguimiento de los pagos de la cápita, lo tuyo es ${currentAmountText} y lo debes transferir al alias tesoreria.p100 así como también enviarme el comprobante por este mismo medio. Desde ya muchas gracias y abrazo grande Q.·.H.·.`;
    }

    return `${greeting} Siendo que arrancó el ${currentMonthLabel} estamos haciendo el seguimiento de los pagos de la cápita, lo tuyo es ${currentAmountText} y lo debes transferir al alias tesoreria.p100 así como también enviarme el comprobante por este mismo medio. Además, registrás cuotas adeudadas de los siguientes meses: ${overdueMonthLabels.join(', ')}. Desde ya muchas gracias y abrazo grande Q.·.H.·.`;
  }

  private formatCurrency(amount: number) {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(amount);
  }

  private normalizePhone(phone: string | null) {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, '');
    return digits || null;
  }

  private buildCurrentRatesMap(
    rates: Array<{
      category: MemberCategory;
      amount: Prisma.Decimal | number;
      validFrom: Date;
      validTo: Date | null;
    }>,
    queryDate: Date,
  ) {
    const map = new Map<MemberCategory, number>();
    const sorted = [...rates].sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }

      return b.validFrom.getTime() - a.validFrom.getTime();
    });

    for (const rate of sorted) {
      const isValid =
        rate.validFrom.getTime() <= queryDate.getTime() &&
        (rate.validTo === null || rate.validTo.getTime() > queryDate.getTime());

      if (!isValid) continue;
      if (map.has(rate.category)) continue;

      map.set(rate.category, Number(rate.amount));
    }

    return map;
  }

  private buildDebtSnapshot(
    member: MemberWithDebtData,
    currentRates: Map<MemberCategory, number>,
    queryDate: Date,
  ) {
    const queryMonthStart = this.startOfMonth(queryDate);
    const joinedMonthStart = this.startOfMonth(member.joinedAt);

    const paidPeriods = new Set(
      member.payments
        .filter((payment) => payment.status === PaymentStatus.REGISTERED)
        .map((payment) => this.periodKey(payment.periodYear, payment.periodMonth)),
    );

    const months: Array<{
      label: string;
      category: MemberCategory;
      amount: number;
      overdue: boolean;
      isCurrentMonth: boolean;
    }> = [];

    for (
      let cursor = new Date(joinedMonthStart);
      cursor.getTime() <= queryMonthStart.getTime();
      cursor = this.addMonths(cursor, 1)
    ) {
      const monthStart = this.startOfMonth(cursor);
      const monthEnd = this.addMonths(monthStart, 1);
      const isCurrentMonth = monthStart.getTime() === queryMonthStart.getTime();

      if (!this.isActiveInMonth(member, monthStart, monthEnd)) {
        continue;
      }

      const category = this.resolveCategoryForMonth(member, monthStart, monthEnd);
      if (!category) {
        continue;
      }

      const key = this.periodKey(
        monthStart.getUTCFullYear(),
        monthStart.getUTCMonth() + 1,
      );

      if (paidPeriods.has(key)) {
        continue;
      }

      months.push({
        label: this.monthLabel(
          monthStart.getUTCFullYear(),
          monthStart.getUTCMonth() + 1,
        ),
        category,
        amount: currentRates.get(category) ?? 0,
        overdue: monthStart.getTime() < queryMonthStart.getTime(),
        isCurrentMonth,
      });
    }

    return {
      debt: months.reduce((sum, month) => sum + month.amount, 0),
      monthsOwed: months.length,
      owesCurrentMonth: months.some((month) => month.isCurrentMonth),
      overdueMonthLabels: months
        .filter((month) => month.overdue)
        .map((month) => month.label),
      currentMonthLabel: this.monthLabel(
        queryMonthStart.getUTCFullYear(),
        queryMonthStart.getUTCMonth() + 1,
      ),
      months,
    };
  }

  private resolveCategoryForMonth(
    member: MemberWithDebtData,
    monthStart: Date,
    monthEnd: Date,
  ) {
    const overlapping = member.categoryHistory
      .filter((item) =>
        this.overlaps(item.effectiveFrom, item.effectiveTo, monthStart, monthEnd),
      )
      .sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime());

    if (overlapping.length > 0) {
      return overlapping[0].category;
    }

    return member.category;
  }

  private isActiveInMonth(
    member: MemberWithDebtData,
    monthStart: Date,
    monthEnd: Date,
  ) {
    if (member.statusHistory.length > 0) {
      return member.statusHistory.some(
        (item) =>
          item.status === MemberStatus.ACTIVE &&
          this.overlaps(item.effectiveFrom, item.effectiveTo, monthStart, monthEnd),
      );
    }

    return (
      member.status === MemberStatus.ACTIVE &&
      member.joinedAt.getTime() < monthEnd.getTime()
    );
  }

  private overlaps(
    from: Date,
    to: Date | null,
    monthStart: Date,
    monthEnd: Date,
  ) {
    const effectiveTo = to ?? new Date('2999-12-31T00:00:00.000Z');
    return (
      from.getTime() < monthEnd.getTime() &&
      effectiveTo.getTime() > monthStart.getTime()
    );
  }

  private startOfMonth(date: Date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  }

  private addMonths(date: Date, months: number) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  }

  private periodKey(year: number, month: number) {
    return `${year}-${String(month).padStart(2, '0')}`;
  }

  private monthLabel(year: number, month: number) {
    return `${MONTHS_ES[month - 1]} ${year}`;
  }
}
