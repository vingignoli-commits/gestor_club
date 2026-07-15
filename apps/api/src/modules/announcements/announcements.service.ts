import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';

@Injectable()
export class AnnouncementsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Avisos visibles para los socios: solo los activos, fijados primero. */
  listPublished() {
    return this.prisma.announcement.findMany({
      where: { isActive: true },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });
  }

  /** Todos los avisos, para la gestión del admin. */
  listAll() {
    return this.prisma.announcement.findMany({
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });
  }

  create(dto: CreateAnnouncementDto) {
    return this.prisma.announcement.create({
      data: {
        title: dto.title,
        body: dto.body,
        isPinned: dto.isPinned ?? false,
      },
    });
  }

  async update(id: string, dto: UpdateAnnouncementDto) {
    await this.ensureExists(id);

    return this.prisma.announcement.update({
      where: { id },
      data: {
        title: dto.title,
        body: dto.body,
        isPinned: dto.isPinned,
        isActive: dto.isActive,
      },
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.announcement.delete({ where: { id } });
    return { id };
  }

  private async ensureExists(id: string) {
    const found = await this.prisma.announcement.findUnique({ where: { id } });

    if (!found) {
      throw new NotFoundException('El aviso no existe.');
    }
  }
}
