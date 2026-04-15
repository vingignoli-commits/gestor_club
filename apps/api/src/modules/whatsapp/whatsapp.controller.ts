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

  @Get('campaigns/current-month-dues')
  getCurrentMonthDuesCampaign() {
    return this.whatsappService.getCurrentMonthDuesCampaign();
  }

  @Post('campaigns/current-month-dues/mark-sent')
  markCurrentMonthDuesSent(
    @Body()
    body: {
      memberId: string;
    },
  ) {
    return this.whatsappService.markCurrentMonthDuesSent(body.memberId);
  }

  @Post('send')
  send(
    @Body()
    body: {
      memberId: string;
      templateId?: string;
      destination: string;
      message?: string;
    },
  ) {
    return this.whatsappService.sendMessage(
      body.memberId,
      body.destination,
      body.message,
      body.templateId,
    );
  }
}
