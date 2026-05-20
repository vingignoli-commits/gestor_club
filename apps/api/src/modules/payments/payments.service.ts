import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.payment.findMany({
      include: {
        member: true,
      },
      orderBy: {
        paidAt: 'desc',
      },
    });
  }

  async create(dto: CreatePaymentDto) {
    const member = await this.prisma.member.findUnique({
      where: {
        id: dto.memberId,
      },
    });

    if (!member) {
      throw new NotFoundException('Socio no encontrado');
    }

    const periodLabel = `${String(dto.periodMonth).padStart(2, '0')}/${dto.periodYear}`;
    const receiptNote = dto.receiptNote?.trim() || dto.notes?.trim() || null;
    const receiptUrl = dto.receiptUrl?.trim() || null;

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          memberId: dto.memberId,
          paidAt: new Date(dto.paidAt),
          periodYear: dto.periodYear,
          periodMonth: dto.periodMonth,
          amount: dto.amount,
          methodCode: dto.methodCode,
          notes: dto.notes?.trim() || null,
          receiptUrl,
          receiptNote,
        },
        include: {
          member: true,
        },
      });

      await tx.cashTransaction.create({
        data: {
          direction: 'IN',
          occurredAt: new Date(dto.paidAt),
          amount: dto.amount,
          methodCode: dto.methodCode,
          incomeType: 'MEMBERSHIP',
          description: `Cobro cuota ${periodLabel} - ${member.lastName}, ${member.firstName}`,
          receiptUrl,
          receiptNote,
          referenceId: payment.id,
          notes: dto.notes?.trim() || null,
        },
      });

      return payment;
    });
  }

  findOne(id: string) {
    return this.prisma.payment.findUnique({
      where: {
        id,
      },
      include: {
        member: true,
      },
    });
  }

  async voidPayment(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: {
        id,
      },
      include: {
        member: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }

    if (payment.status === PaymentStatus.VOID) {
      return payment;
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.payment.update({
        where: {
          id,
        },
        data: {
          status: PaymentStatus.VOID,
        },
        include: {
          member: true,
        },
      });

      await tx.cashTransaction.create({
        data: {
          direction: 'OUT',
          occurredAt: new Date(),
          amount: payment.amount,
          methodCode: payment.methodCode,
          expenseType: 'OTHER',
          description: `Anulación de pago - ${payment.member.lastName}, ${payment.member.firstName}`,
          referenceId: payment.id,
          receiptUrl: payment.receiptUrl ?? null,
          receiptNote: payment.receiptNote ?? null,
          notes: `Anulación del pago ${payment.id}`,
        },
      });

      return updated;
    });
  }

  async getMonthlySummary() {
    const payments = await this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.REGISTERED,
      },
      orderBy: [{ periodYear: 'asc' }, { periodMonth: 'asc' }],
      include: {
        member: true,
      },
    });

    const summaryMap = new Map<
      string,
      {
        periodYear: number;
        periodMonth: number;
        totalAmount: number;
        paymentsCount: number;
      }
    >();

    for (const payment of payments) {
      const key = `${payment.periodYear}-${payment.periodMonth}`;

      const current = summaryMap.get(key) ?? {
        periodYear: payment.periodYear,
        periodMonth: payment.periodMonth,
        totalAmount: 0,
        paymentsCount: 0,
      };

      current.totalAmount += Number(payment.amount);
      current.paymentsCount += 1;

      summaryMap.set(key, current);
    }

    return Array.from(summaryMap.values()).sort((a, b) => {
      if (a.periodYear !== b.periodYear) {
        return a.periodYear - b.periodYear;
      }

      return a.periodMonth - b.periodMonth;
    });
  }
}
