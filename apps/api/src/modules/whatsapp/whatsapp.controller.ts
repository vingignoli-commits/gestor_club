import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { RequirePermissions } from '../../common/auth/auth.decorators';
import { WhatsappService } from './whatsapp.service';

@Controller('whatsapp')
@RequirePermissions('messaging:read')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get('templates')
  getTemplates() {
    return this.whatsappService.getTemplates();
  }

  @RequirePermissions('messaging:write')
  @Post('templates')
  createTemplate(@Body() body: { name: string; body: string }) {
    return this.whatsappService.createTemplate(body.name, body.body);
  }

  @RequirePermissions('messaging:write')
  @Patch('templates/:id')
  updateTemplate(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      body?: string;
      isActive?: boolean;
    },
  ) {
    return this.whatsappService.updateTemplate(id, body);
  }

  @Get('dispatches')
  getDispatches() {
    return this.whatsappService.getDispatches();
  }

  @Get('members/:memberId/history')
  getMemberHistory(@Param('memberId') memberId: string) {
    return this.whatsappService.getMemberHistory(memberId);
  }

  @Get('campaigns/initial-notice')
  getInitialNoticeCampaign() {
    return this.whatsappService.getInitialNoticeCampaign();
  }

  @RequirePermissions('messaging:write')
  @Post('campaigns/initial-notice/mark-sent')
  markInitialNoticeSent(@Body() body: { memberId: string }) {
    return this.whatsappService.markCampaignSent('initial-notice', body.memberId);
  }

  @Get('campaigns/reminder')
  getReminderCampaign() {
    return this.whatsappService.getReminderCampaign();
  }

  @RequirePermissions('messaging:write')
  @Post('campaigns/reminder/mark-sent')
  markReminderSent(@Body() body: { memberId: string }) {
    return this.whatsappService.markCampaignSent('reminder', body.memberId);
  }

  @RequirePermissions('messaging:write')
  @Post('send')
  send(
    @Body()
    body: {
      memberId: string;
      templateId?: string;
      destination: string;
      message?: string;
      campaignCode?: string;
    },
  ) {
    return this.whatsappService.sendMessage(
      body.memberId,
      body.destination,
      body.message,
      body.templateId,
      body.campaignCode,
    );
  }
}
