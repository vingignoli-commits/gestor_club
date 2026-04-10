import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  getMembersReport(status?: string) {
    return this.prisma.member.findMany({
      where: status ? { currentStatusCode: status } : undefined,
      include: { category: true },
      orderBy: [{ currentStatusCode: 'asc' }, { lastName: 'asc' }],
    });
  }

  async getDelinquencyReport() {
    const charges = await this.prisma.charge.findMany({
      where: { status: 'PENDING' },
      include: {
        member: true,
        billingPeriod: true,
      },
      orderBy: [{ member: { lastName: 'asc' } }, { dueDate: 'asc' }],
    });

    return charges.map((charge) => ({
      memberId: charge.memberId,
      memberName: `${charge.member.lastName}, ${charge.member.firstName}`,
      period: charge.billingPeriod.label,
      amount: charge.amount,
      dueDate: charge.dueDate,
    }));
  }
}

