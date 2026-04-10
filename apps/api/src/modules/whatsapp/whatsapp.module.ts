import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';

@Module({
  imports: [AuditModule],
  controllers: [WhatsappController],
  providers: [WhatsappService],
})
export class WhatsappModule {}

