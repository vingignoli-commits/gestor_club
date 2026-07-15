import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

import { AccessGuard } from './common/auth/access.guard';
import { AnnouncementsModule } from './modules/announcements/announcements.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuditModule } from './modules/audit/audit.module';
import { CashModule } from './modules/cash/cash.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { MembersModule } from './modules/members/members.module';
import { MonthlyRatesModule } from './modules/monthly-rates/monthly-rates.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { ReportsModule } from './modules/reports/reports.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AnnouncementsModule,
    AuthModule,
    MembersModule,
    MonthlyRatesModule,
    PaymentsModule,
    CashModule,
    DashboardModule,
    ReportsModule,
    AuditModule,
    WhatsappModule,
  ],
  providers: [
    // Cierra la API por defecto: todo endpoint exige token salvo @Public().
    {
      provide: APP_GUARD,
      useClass: AccessGuard,
    },
  ],
})
export class AppModule {}
