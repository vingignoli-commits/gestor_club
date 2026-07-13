import { Body, Controller, Get, Put } from '@nestjs/common';
import { RequirePermissions } from '../../common/auth/auth.decorators';
import { MonthlyRatesService } from './monthly-rates.service';
import { UpdateMonthlyRateDto } from './dto/update-monthly-rate.dto';

@Controller('monthly-rates')
export class MonthlyRatesController {
  constructor(private readonly monthlyRatesService: MonthlyRatesService) {}

  @RequirePermissions('treasury:read', 'cash:read', 'members:read')
  @Get()
  findCurrent() {
    return this.monthlyRatesService.findCurrent();
  }

  @RequirePermissions('treasury:write')
  @Put()
  update(@Body() dto: UpdateMonthlyRateDto) {
    return this.monthlyRatesService.update(dto);
  }
}
