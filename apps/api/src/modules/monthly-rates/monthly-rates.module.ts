import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MonthlyRatesController } from './monthly-rates.controller';
import { MonthlyRatesService } from './monthly-rates.service';

@Module({
  imports: [PrismaModule],
  controllers: [MonthlyRatesController],
  providers: [MonthlyRatesService],
  exports: [MonthlyRatesService],
})
export class MonthlyRatesModule {}
