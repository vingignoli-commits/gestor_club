import { Body, Controller, Get, Post } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';

@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get('templates')
  getTemplates() {
    return this.whatsappService.getTemplates();
  }

  @Get('campaigns/initial-notice')
  getInitialNoticeCampaign() {
    return this.whatsappService.getInitialNoticeCampaign();
  }

  @Post('campaigns/initial-notice/mark-sent')
  markInitialNoticeSent(
    @Body()
    body: {
      memberId: string;
    },
  ) {
    return this.whatsappService.markCampaignSent('initial-notice', body.memberId);
  }

  @Get('campaigns/reminder')
  getReminderCampaign() {
    return this.whatsappService.getReminderCampaign();
  }

  @Post('campaigns/reminder/mark-sent')
  markReminderSent(
    @Body()
    body: {
      memberId: string;
    },
  ) {
    return this.whatsappService.markCampaignSent('reminder', body.memberId);
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
