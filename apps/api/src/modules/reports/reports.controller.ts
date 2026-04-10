import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('members')
  getMembersReport(@Query('status') status?: string) {
    return this.reportsService.getMembersReport(status);
  }

  @Get('delinquency')
  getDelinquencyReport() {
    return this.reportsService.getDelinquencyReport();
  }
}

