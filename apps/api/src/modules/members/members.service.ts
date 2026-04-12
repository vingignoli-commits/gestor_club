import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(search?: string) {
    return this.prisma.member.findMany({
      where: search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { matricula: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  async create(dto: CreateMemberDto) {
    return this.prisma.member.create({
      data: {
        matricula: dto.matricula,
        firstName: dto.firstName,
        lastName: dto.lastName,
        category: dto.category,
        status: dto.status ?? 'ACTIVE',
        grade: dto.grade,
        phone: dto.phone,
        email: dto.email,
        notes: dto.notes,
        joinedAt: new Date(dto.joinedAt),
      },
    });
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
          orderBy: { paidAt: 'desc' },
        },
      },
    });
    if (!member) throw new NotFoundException('Socio no encontrado');
    return member;
  }

  async update(id: string, dto: UpdateMemberDto) {
    await this.findOne(id);
    return this.prisma.member.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        category: dto.category,
        status: dto.status,
        grade: dto.grade,
        phone: dto.phone,
        email: dto.email,
        notes: dto.notes,
      },
    });
  }

  async getDebtSummary() {
    const members = await this.prisma.member.findMany({
      include: {
        charges: {
          include: { billingPeriod: true },
        },
      },
    });

    return members
      .map((m) => {
        const totalCharged = m.charges.reduce((s, c) => s + Number(c.amount), 0);
        const totalPaid = m.charges.reduce((s, c) => s + Number(c.paidAmount), 0);
        const debt = totalCharged - totalPaid;
        return {
          id: m.id,
          matricula: m.matricula,
          firstName: m.firstName,
          lastName: m.lastName,
          category: m.category,
          status: m.status,
          debt,
          charges: m.charges,
        };
      })
      .filter((m) => m.debt > 0);
  }

  async getAccountStatement(id: string) {
    const member = await this.findOne(id);
    const totalCharged = member.charges.reduce((s, c) => s + Number(c.amount), 0);
    const totalPaid = member.charges.reduce((s, c) => s + Number(c.paidAmount), 0);
    return {
      member,
      summary: {
        totalCharged,
        totalPaid,
        balance: totalCharged - totalPaid,
      },
    };
  }
}
