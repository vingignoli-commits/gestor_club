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

    return this.prisma.$transaction(async (tx) => {
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

      return p;
    });
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
    return this.prisma.payment.findMany({
      where: { status: 'REGISTERED' },
      orderBy: { paidAt: 'desc' },
    });
  }
}
