import { Injectable } from '@nestjs/common';
import { MemberStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Directorio de contacto del Taller.
   *
   * El select es explícito y no un `findMany` pelado: esta lista la ve todo el
   * padrón por 'contacts:read', así que solo puede viajar lo que es
   * efectivamente un dato de contacto. Nada de categoría, estado de cuenta ni
   * fechas masónicas, que se consultan en Cuadro con 'members:read'.
   */
  findAll(search?: string, includeInactive = false) {
    const term = search?.trim();

    return this.prisma.member.findMany({
      where: {
        ...(includeInactive ? {} : { status: MemberStatus.ACTIVE }),
        ...(term
          ? {
              OR: [
                { firstName: { contains: term, mode: 'insensitive' } },
                { lastName: { contains: term, mode: 'insensitive' } },
                { matricula: { contains: term, mode: 'insensitive' } },
                { email: { contains: term, mode: 'insensitive' } },
                { phone: { contains: term, mode: 'insensitive' } },
                { alternatePhone: { contains: term, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        matricula: true,
        firstName: true,
        lastName: true,
        grade: true,
        status: true,
        phone: true,
        alternatePhone: true,
        email: true,
        emergencyContactName: true,
        emergencyContactRelationship: true,
        emergencyContactPhone: true,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }
}
