import { Body, Controller, Get, Post } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';

@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get('templates')
  getTemplates() {
    return this.whatsappService.getTemplates();
  }

  @Get('dispatches')
  getDispatches() {
    return this.whatsappService.getDispatches();
  }

  @Post('send')
  send(@Body() body: { memberId: string; templateId: string; destination: string }) {
    return this.whatsappService.sendMessage(body.memberId, body.templateId, body.destination);
  }
}
