import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { RequirePermissions } from '../../common/auth/auth.decorators';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';

@Controller('announcements')
@RequirePermissions('announcements:read')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  /** Muro de avisos que ven los socios en "Nuestro Taller". */
  @Get()
  list() {
    return this.announcementsService.listPublished();
  }

  /** Vista de gestión del admin: incluye avisos inactivos. */
  @RequirePermissions('announcements:write')
  @Get('manage')
  listAll() {
    return this.announcementsService.listAll();
  }

  @RequirePermissions('announcements:write')
  @Post()
  create(@Body() dto: CreateAnnouncementDto) {
    return this.announcementsService.create(dto);
  }

  @RequirePermissions('announcements:write')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAnnouncementDto) {
    return this.announcementsService.update(id, dto);
  }

  @RequirePermissions('announcements:write')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.announcementsService.remove(id);
  }
}
