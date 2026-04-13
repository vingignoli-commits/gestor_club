import { Injectable, NotFoundException } from '@nestjs/common';
import { MemberCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateMonthlyRateDto } from './dto/update-monthly-rate.dto';

@Injectable()
export class MonthlyRatesService {
  constructor(private readonly prisma: PrismaService) {}

  async findCurrent() {
    const now = new Date();

    const categories = Object.values(MemberCategory);

    const rates = await Promise.all(
      categories.map(async (category) => {
        const current = await this.prisma.monthlyRate.findFirst({
          where: {
            category,
            validFrom: { lte: now },
            OR: [{ validTo: null }, { validTo: { gt: now } }],
          },
          orderBy: { validFrom: 'desc' },
        });

        return {
          category,
          amount: current ? Number(current.amount) : 0,
          validFrom: current?.validFrom ?? null,
          validTo: current?.validTo ?? null,
        };
      }),
    );

    return rates;
  }

  async findRateForCategory(category: MemberCategory, at?: Date) {
    const targetDate = at ?? new Date();

    const rate = await this.prisma.monthlyRate.findFirst({
      where: {
        category,
        validFrom: { lte: targetDate },
        OR: [{ validTo: null }, { validTo: { gt: targetDate } }],
      },
      orderBy: { validFrom: 'desc' },
    });

    if (!rate) {
      throw new NotFoundException(
        `No existe una tarifa vigente para la categoría ${category}.`,
      );
    }

    return rate;
  }

  async update(dto: UpdateMonthlyRateDto) {
    const validFrom = new Date(dto.validFrom);

    return this.prisma.$transaction(async (tx) => {
      await tx.monthlyRate.updateMany({
        where: {
          category: dto.category,
          validTo: null,
        },
        data: {
          validTo: validFrom,
        },
      });

      return tx.monthlyRate.create({
        data: {
          category: dto.category,
          amount: dto.amount,
          validFrom,
          validTo: null,
        },
      });
    });
  }
}
