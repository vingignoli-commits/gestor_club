import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WhatsappService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  listTemplates() {
    return this.prisma.whatsappTemplate.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async sendIndividualMessage(memberId: string, templateId: string) {
    const [member, template] = await Promise.all([
      this.prisma.member.findUnique({ where: { id: memberId } }),
      this.prisma.whatsappTemplate.findUnique({ where: { id: templateId } }),
    ]);

    if (!member) {
      throw new NotFoundException('Socio no encontrado');
    }
    if (!template) {
      throw new NotFoundException('Plantilla no encontrada');
    }

    const renderedBody = template.body
      .replace('{{nombre}}', member.firstName)
      .replace('{{apellido}}', member.lastName);

    const dispatch = await this.prisma.messageDispatch.create({
      data: {
        memberId,
        templateId,
        channel: 'WHATSAPP',
        destination: member.phone ?? 'SIN_TELEFONO',
        renderedBody,
        status: 'PENDING',
      },
    });

    await this.auditService.log({
      entityName: 'message_dispatch',
      entityId: dispatch.id,
      action: 'CREATE',
      afterData: dispatch,
    });

    return dispatch;
  }
}

