import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateEmergencyContactDto } from './dto/update-emergency-contact.dto';
import { UpsertHealthDto } from './dto/upsert-health.dto';

/** Campos de texto libre: se guardan recortados, y vacío equivale a "sin dato". */
const TEXT_FIELDS = [
  'allergies',
  'medications',
  'chronicConditions',
  'insuranceProvider',
  'insuranceMemberId',
  'insuranceEmergencyPhone',
  'primaryDoctorName',
  'primaryDoctorPhone',
  'implantedDevices',
  'relevantSurgeries',
  'advanceDirectives',
] as const;

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Devuelve la ficha del socio junto con los datos de contacto de emergencia,
   * que viven en Member. Quien está mirando esta pantalla necesita las dos
   * cosas a la vez, y pedirlas por separado invita a mostrar una sin la otra.
   */
  async findByMemberId(memberId: string) {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        matricula: true,
        firstName: true,
        lastName: true,
        birthDate: true,
        phone: true,
        alternatePhone: true,
        emergencyContactName: true,
        emergencyContactRelationship: true,
        emergencyContactPhone: true,
        health: true,
      },
    });

    if (!member) {
      throw new NotFoundException('Socio no encontrado');
    }

    const { health, ...contact } = member;

    return {
      member: contact,
      // null significa "todavía no cargó nada", que es distinto de "no tiene
      // ninguna condición". El front tiene que poder distinguirlos.
      health,
    };
  }

  async upsert(memberId: string, dto: UpsertHealthDto, actorUserId: string) {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: { id: true },
    });

    if (!member) {
      throw new NotFoundException('Socio no encontrado');
    }

    const previous = await this.prisma.memberHealth.findUnique({
      where: { memberId },
    });

    const data: Prisma.MemberHealthUncheckedCreateInput = { memberId };

    if (dto.bloodType !== undefined) data.bloodType = dto.bloodType;

    if (dto.organDonationOpposition !== undefined) {
      data.organDonationOpposition = dto.organDonationOpposition;
    }

    for (const field of TEXT_FIELDS) {
      if (dto[field] !== undefined) {
        data[field] = dto[field]?.trim() || null;
      }
    }

    const { memberId: _omit, ...updateData } = data;

    const saved = await this.prisma.memberHealth.upsert({
      where: { memberId },
      create: data,
      update: updateData,
    });

    // Se audita QUÉ campos cambiaron, nunca sus valores: copiar una alergia o
    // una medicación al AuditLog duplicaría el dato sensible en una tabla que
    // se lee con 'audit:read', un permiso mucho más difundido que 'health:read'.
    const changedFields = Object.keys(updateData).filter(
      (key) =>
        previous === null ||
        previous[key as keyof typeof previous] !==
          saved[key as keyof typeof saved],
    );

    if (changedFields.length > 0) {
      await this.audit.log({
        entityName: 'member_health',
        entityId: memberId,
        action: previous ? 'UPDATE' : 'CREATE',
        afterData: { actorUserId, changedFields },
      });
    }

    return saved;
  }

  /**
   * Actualiza a quién llamar. Vive en Member y no en MemberHealth porque hay
   * que poder avisar a la familia sin el permiso 'health:read'; pero lo edita
   * el propio socio, así que la puerta está acá y no en 'members:write'.
   */
  async updateEmergencyContact(
    memberId: string,
    dto: UpdateEmergencyContactDto,
    actorUserId: string,
  ) {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: {
        emergencyContactName: true,
        emergencyContactRelationship: true,
        emergencyContactPhone: true,
      },
    });

    if (!member) {
      throw new NotFoundException('Socio no encontrado');
    }

    const clean = (value: string | undefined) =>
      value === undefined ? undefined : value.trim() || null;

    const data = {
      emergencyContactName: clean(dto.emergencyContactName),
      emergencyContactRelationship: clean(dto.emergencyContactRelationship),
      emergencyContactPhone: clean(dto.emergencyContactPhone),
    };

    const updated = await this.prisma.member.update({
      where: { id: memberId },
      data,
      select: {
        emergencyContactName: true,
        emergencyContactRelationship: true,
        emergencyContactPhone: true,
      },
    });

    // A diferencia de la ficha de salud, acá sí se pueden auditar los valores:
    // un contacto de emergencia no es dato sensible de salud, y saber qué
    // número había antes es justamente lo que sirve si alguien lo pisa.
    const changed = Object.keys(data).filter(
      (key) =>
        data[key as keyof typeof data] !== undefined &&
        member[key as keyof typeof member] !==
          updated[key as keyof typeof updated],
    );

    if (changed.length > 0) {
      await this.audit.log({
        entityName: 'member_emergency_contact',
        entityId: memberId,
        action: 'UPDATE',
        beforeData: { ...member, actorUserId },
        afterData: updated,
      });
    }

    return updated;
  }
}
