import { Body, Controller, Get, Put } from '@nestjs/common';
import { MonthlyRatesService } from './monthly-rates.service';
import { UpdateMonthlyRateDto } from './dto/update-monthly-rate.dto';

@Controller('monthly-rates')
export class MonthlyRatesController {
  constructor(private readonly monthlyRatesService: MonthlyRatesService) {}

  @Get()
  findCurrent() {
    return this.monthlyRatesService.findCurrent();
  }

  @Put()
  update(@Body() dto: UpdateMonthlyRateDto) {
    return this.monthlyRatesService.update(dto);
  }
}
