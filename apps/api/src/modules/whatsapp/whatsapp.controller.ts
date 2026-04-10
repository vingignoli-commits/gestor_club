import { Body, Controller, Get, Post } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';

@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get('templates')
  listTemplates() {
    return this.whatsappService.listTemplates();
  }

  @Post('messages/send')
  sendMessage(@Body() body: { memberId: string; templateId: string }) {
    return this.whatsappService.sendIndividualMessage(body.memberId, body.templateId);
  }
}

