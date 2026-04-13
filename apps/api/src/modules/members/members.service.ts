import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import {
  buildCurrentRatesMap,
  buildDebtSnapshot,
} from './member-debt.utils';

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(search?: string) {
    return this.prisma.member.findMany({
      where: search
        ? {
            OR: [
              {
                firstName: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                lastName: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                matricula: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                email: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                phone: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : undefined,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  async create(dto: CreateMemberDto) {
    const joinedAt = new Date(dto.joinedAt);
    const joinedMonthStart = new Date(
      Date.UTC(joinedAt.getUTCFullYear(), joinedAt.getUTCMonth(), 1),
    );

    try {
      return await this.prisma.member.create({
        data: {
          matricula: dto.matricula.trim(),
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          category: dto.category,
          status: dto.status ?? 'ACTIVE',
          grade: dto.grade ?? null,
          phone: dto.phone?.trim() || null,
          email: dto.email?.trim() || null,
          notes: dto.notes?.trim() || null,
          joinedAt,
          statusHistory: {
            create: {
              status: dto.status ?? 'ACTIVE',
              effectiveFrom: joinedAt,
              reason: 'Alta inicial',
            },
          },
          categoryHistory: {
            create: {
              category: dto.category,
              effectiveFrom: joinedMonthStart,
              reason: 'Categoría inicial',
            },
          },
        },
      });
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('La matrícula ya existe.');
      }

      throw error;
    }
  }

  async findOne(id: string) {
    const member = await this.prisma.member.findUnique({
      where: { id },
      include: {
        charges: {
          include: { billingPeriod: true },
          orderBy: { dueDate: 'desc' },
        },
        payments: {
          orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
        },
        statusHistory: {
          orderBy: { effectiveFrom: 'desc' },
        },
        categoryHistory: {
          orderBy: { effectiveFrom: 'desc' },
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Socio no encontrado');
    }

    return member;
  }

  async update(id: string, dto: UpdateMemberDto) {
    const member = await this.findOne(id);
    const effectiveFrom = firstDayOfCurrentMonth();

    try {
      return await this.prisma.$transaction(async (tx) => {
        if (dto.category && dto.category !== member.category) {
          await tx.memberCategoryHistory.updateMany({
            where: {
              memberId: id,
              effectiveTo: null,
            },
            data: {
              effectiveTo: effectiveFrom,
            },
          });

          await tx.memberCategoryHistory.create({
            data: {
              memberId: id,
              category: dto.category,
              effectiveFrom,
              reason: 'Cambio de categoría',
            },
          });
        }

        if (dto.status && dto.status !== member.status) {
          await tx.memberStatusHistory.updateMany({
            where: {
              memberId: id,
              effectiveTo: null,
            },
            data: {
              effectiveTo: effectiveFrom,
            },
          });

          await tx.memberStatusHistory.create({
            data: {
              memberId: id,
              status: dto.status,
              effectiveFrom,
              reason: 'Cambio de estado',
            },
          });
        }

        return tx.member.update({
          where: { id },
          data: {
            matricula: dto.matricula?.trim(),
            firstName: dto.firstName?.trim(),
            lastName: dto.lastName?.trim(),
            category: dto.category,
            status: dto.status,
            grade: dto.grade === undefined ? undefined : dto.grade || null,
            phone: dto.phone === undefined ? undefined : dto.phone.trim() || null,
            email: dto.email === undefined ? undefined : dto.email.trim() || null,
            notes: dto.notes === undefined ? undefined : dto.notes.trim() || null,
          },
        });
      });
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('La matrícula ya existe.');
      }

      throw error;
    }
  }

  async getDebtSummary() {
    const queryDate = new Date();

    const [members, rates] = await Promise.all([
      this.prisma.member.findMany({
        include: {
          payments: {
            where: { status: 'REGISTERED' },
            orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
          },
          statusHistory: {
            orderBy: { effectiveFrom: 'desc' },
          },
          categoryHistory: {
            orderBy: { effectiveFrom: 'desc' },
          },
        },
      }),
      this.prisma.monthlyRate.findMany({
        where: {
          validFrom: { lte: queryDate },
          OR: [{ validTo: null }, { validTo: { gt: queryDate } }],
        },
        orderBy: [{ category: 'asc' }, { validFrom: 'desc' }],
      }),
    ]);

    const currentRates = buildCurrentRatesMap(rates, queryDate);

    return members
      .map((member) => {
        const snapshot = buildDebtSnapshot(member, currentRates, queryDate);

        return {
          id: member.id,
          matricula: member.matricula,
          firstName: member.firstName,
          lastName: member.lastName,
          category: member.category,
          status: member.status,
          phone: member.phone,
          debt: snapshot.debt,
          monthsOwed: snapshot.monthsOwed,
          owesCurrentMonth: snapshot.owesCurrentMonth,
          overdueMonthsCount: snapshot.overdueMonthsCount,
          overdueMonthLabels: snapshot.overdueMonthLabels,
          debtLevel: snapshot.debtLevel,
          debtLevelLabel: snapshot.debtLevelLabel,
          debtColor: snapshot.debtColor,
          months: snapshot.months,
        };
      })
      .filter((member) => member.debt > 0)
      .sort((a, b) => b.debt - a.debt);
  }

  async getAccountStatement(id: string) {
    const queryDate = new Date();

    const [member, rates] = await Promise.all([
      this.findOne(id),
      this.prisma.monthlyRate.findMany({
        where: {
          validFrom: { lte: queryDate },
          OR: [{ validTo: null }, { validTo: { gt: queryDate } }],
        },
        orderBy: [{ category: 'asc' }, { validFrom: 'desc' }],
      }),
    ]);

    const currentRates = buildCurrentRatesMap(rates, queryDate);
    const snapshot = buildDebtSnapshot(member, currentRates, queryDate);

    return {
      member,
      summary: {
        totalDebt: snapshot.debt,
        monthsOwed: snapshot.monthsOwed,
        owesCurrentMonth: snapshot.owesCurrentMonth,
        overdueMonthsCount: snapshot.overdueMonthsCount,
        overdueMonthLabels: snapshot.overdueMonthLabels,
        debtLevel: snapshot.debtLevel,
        debtLevelLabel: snapshot.debtLevelLabel,
        debtColor: snapshot.debtColor,
        months: snapshot.months,
      },
    };
  }
}

function firstDayOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}
