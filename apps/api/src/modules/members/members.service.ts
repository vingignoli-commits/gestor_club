import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { ChangeMemberStatusDto } from './dto/change-member-status.dto';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  findAll(search?: string) {
    const where: Prisma.MemberWhereInput | undefined = search
      ? {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { documentNumber: { contains: search, mode: 'insensitive' } },
          ],
        }
      : undefined;

    return this.prisma.member.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  async create(dto: CreateMemberDto) {
    const member = await this.prisma.$transaction(async (tx) => {
      const created = await tx.member.create({
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          documentNumber: dto.documentNumber,
          email: dto.email,
          phone: dto.phone,
          joinedAt: new Date(dto.joinedAt),
          currentStatusCode: 'ACTIVE',
          memberType: dto.memberType,
          notes: dto.notes,
          categoryId: dto.categoryId,
          statusHistory: {
            create: {
              statusCode: 'ACTIVE',
              effectiveFrom: new Date(dto.joinedAt),
              reason: 'Alta inicial',
            },
          },
          categoryHistory: {
            create: {
              categoryId: dto.categoryId,
              effectiveFrom: new Date(dto.joinedAt),
              reason: 'Categoria inicial',
            },
          },
        },
        include: {
          category: true,
          statusHistory: true,
        },
      });

      await this.auditService.logWithinTx(tx, {
        entityName: 'member',
        entityId: created.id,
        action: 'CREATE',
        afterData: created,
      });

      return created;
    });

    return member;
  }

  async findOne(id: string) {
    const member = await this.prisma.member.findUnique({
      where: { id },
      include: {
        category: true,
        statusHistory: { orderBy: { effectiveFrom: 'desc' } },
        categoryHistory: { orderBy: { effectiveFrom: 'desc' } },
        payments: {
          include: {
            allocations: {
              include: {
                billingPeriod: true,
              },
            },
          },
          orderBy: { paidAt: 'desc' },
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Socio no encontrado');
    }

    return member;
  }

  async update(id: string, dto: UpdateMemberDto) {
    const before = await this.findOne(id);

    const updated = await this.prisma.member.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        notes: dto.notes,
      },
    });

    await this.auditService.log({
      entityName: 'member',
      entityId: id,
      action: 'UPDATE',
      beforeData: before,
      afterData: updated,
    });

    return updated;
  }

  async changeStatus(id: string, dto: ChangeMemberStatusDto) {
    await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      const currentOpen = await tx.memberStatusHistory.findFirst({
        where: { memberId: id, effectiveTo: null },
        orderBy: { effectiveFrom: 'desc' },
      });

      if (currentOpen) {
        await tx.memberStatusHistory.update({
          where: { id: currentOpen.id },
          data: { effectiveTo: new Date(dto.effectiveFrom) },
        });
      }

      const status = await tx.memberStatusHistory.create({
        data: {
          memberId: id,
          statusCode: dto.statusCode,
          effectiveFrom: new Date(dto.effectiveFrom),
          reason: dto.reason,
        },
      });

      await tx.member.update({
        where: { id },
        data: { currentStatusCode: dto.statusCode },
      });

      await this.auditService.logWithinTx(tx, {
        entityName: 'member_status_history',
        entityId: status.id,
        action: 'STATUS_CHANGE',
        afterData: status,
      });

      return status;
    });
  }

  async getAccountStatement(id: string) {
    await this.findOne(id);

    const charges = await this.prisma.charge.findMany({
      where: { memberId: id, status: { not: 'VOID' } },
      include: { billingPeriod: true },
      orderBy: { dueDate: 'asc' },
    });

    const payments = await this.prisma.payment.findMany({
      where: { memberId: id, status: { not: 'VOID' } },
      include: {
        allocations: {
          include: { billingPeriod: true },
        },
      },
      orderBy: { paidAt: 'asc' },
    });

    const totalCharges = charges.reduce((sum, item) => sum + Number(item.amount), 0);
    const totalPaid = payments.reduce((sum, item) => sum + Number(item.amount), 0);

    return {
      memberId: id,
      summary: {
        totalCharges,
        totalPaid,
        balance: totalCharges - totalPaid,
      },
      charges,
      payments,
    };
  }
}

