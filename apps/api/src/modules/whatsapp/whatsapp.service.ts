import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WhatsappService {
  constructor(private readonly prisma: PrismaService) {}

  getTemplates() {
    return this.prisma.whatsappTemplate.findMany({
      where: { isActive: true },
    });
  }

  getDispatches() {
    return this.prisma.messageDispatch.findMany({
      include: { member: true, template: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async sendMessage(memberId: string, templateId: string, destination: string) {
    const template = await this.prisma.whatsappTemplate.findUnique({
      where: { id: templateId },
    });

    return this.prisma.messageDispatch.create({
      data: {
        memberId,
        templateId,
        destination,
        renderedBody: template?.body ?? '',
        status: 'PENDING',
      },
    });
  }
}
