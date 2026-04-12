import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.payment.findMany({
      include: { member: true },
      orderBy: { paidAt: 'desc' },
    });
  }

  async create(dto: CreatePaymentDto) {
    const member = await this.prisma.member.findUnique({
      where: { id: dto.memberId },
    });
    if (!member) throw new NotFoundException('Socio no encontrado');

    const payment = await this.prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          memberId: dto.memberId,
          paidAt: new Date(dto.paidAt),
          amount: dto.amount,
          methodCode: dto.methodCode,
          notes: dto.notes,
        },
      });

      await tx.cashTransaction.create({
        data: {
          direction: 'IN',
          occurredAt: new Date(dto.paidAt),
          amount: dto.amount,
          methodCode: dto.methodCode,
          description: `Cuota socio ${member.lastName} ${member.firstName}`,
          incomeType: 'MEMBERSHIP',
          referenceId: p.id,
        },
      });

      // Imputar el pago a las deudas pendientes mas antiguas
      let remaining = dto.amount;
      const pendingCharges = await tx.charge.findMany({
        where: {
          memberId: dto.memberId,
          paidAmount: { lt: tx.charge.fields.amount },
        },
        orderBy: { dueDate: 'asc' },
      });

      for (const charge of pendingCharges) {
        if (remaining <= 0) break;
        const debt = Number(charge.amount) - Number(charge.paidAmount);
        const toApply = Math.min(remaining, debt);
        await tx.charge.update({
          where: { id: charge.id },
          data: { paidAmount: { increment: toApply } },
        });
        await tx.paymentAllocation.create({
          data: {
            paymentId: p.id,
            chargeId: charge.id,
            amount: toApply,
          },
        });
        remaining -= toApply;
      }

      return p;
    });

    return payment;
  }

  async voidPayment(id: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Pago no encontrado');
    return this.prisma.payment.update({
      where: { id },
      data: { status: 'VOID' },
    });
  }

  getMonthlySummary() {
    return this.prisma.payment.groupBy({
      by: ['paidAt'],
      where: { status: 'REGISTERED' },
      _sum: { amount: true },
      orderBy: { paidAt: 'desc' },
    });
  }
}
