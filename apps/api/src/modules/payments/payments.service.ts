import { BadRequestException, Injectable } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  findAll() {
    return this.prisma.payment.findMany({
      include: {
        member: true,
        allocations: {
          include: { billingPeriod: true },
        },
      },
      orderBy: { paidAt: 'desc' },
    });
  }

  async create(dto: CreatePaymentDto) {
    const allocationTotal = dto.allocations.reduce((sum, item) => sum + item.amount, 0);
    if (allocationTotal > dto.amount) {
      throw new BadRequestException('La imputacion supera el monto del pago');
    }

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          memberId: dto.memberId,
          paidAt: new Date(dto.paidAt),
          amount: dto.amount,
          methodCode: dto.methodCode,
          notes: dto.notes,
          allocations: {
            create: dto.allocations.map((allocation) => ({
              billingPeriodId: allocation.billingPeriodId,
              amount: allocation.amount,
            })),
          },
        },
        include: {
          allocations: true,
        },
      });

      await tx.cashTransaction.create({
        data: {
          direction: 'IN',
          sourceType: 'MEMBERSHIP_PAYMENT',
          occurredAt: new Date(dto.paidAt),
          amount: dto.amount,
          methodCode: dto.methodCode,
          referenceId: payment.id,
          description: `Cobro de cuota socio ${dto.memberId}`,
        },
      });

      await this.auditService.logWithinTx(tx, {
        entityName: 'payment',
        entityId: payment.id,
        action: 'CREATE',
        afterData: payment,
      });

      return payment;
    });
  }

  async voidPayment(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
    });

    if (!payment) {
      throw new BadRequestException('Pago no encontrado');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.payment.update({
        where: { id },
        data: { status: 'VOID' },
      });

      await tx.paymentAllocation.updateMany({
        where: { paymentId: id },
        data: { status: 'VOID' },
      });

      await this.auditService.logWithinTx(tx, {
        entityName: 'payment',
        entityId: id,
        action: 'VOID',
        beforeData: payment,
        afterData: updated,
      });

      return updated;
    });
  }
}

