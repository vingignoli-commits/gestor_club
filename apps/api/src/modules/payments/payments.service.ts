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

    if (!member) {
      throw new NotFoundException('Socio no encontrado');
    }

    const periodLabel = `${String(dto.periodMonth).padStart(2, '0')}/${dto.periodYear}`;

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          memberId: dto.memberId,
          paidAt: new Date(dto.paidAt),
          periodYear: dto.periodYear,
          periodMonth: dto.periodMonth,
          amount: dto.amount,
          methodCode: dto.methodCode,
          notes: dto.notes,
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
          receiptNote: dto.notes || null,
          referenceId: payment.id,
          notes: dto.notes || null,
        },
      });

      return payment;
    });
  }

  findOne(id: string) {
    return this.prisma.payment.findUnique({
      where: { id },
      include: { member: true },
    });
  }
}
