import { Controller, Get } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('debtors')
  getDebtors() {
    return this.reportsService.getDebtors();
  }

  @Get('monthly-collection')
  getMonthlyCollection() {
    return this.reportsService.getMonthlyCollection();
  }

  @Get('cash-summary')
  getCashSummary() {
    return this.reportsService.getCashSummary();
  }

  @Get('members-by-category')
  getMembersByCategory() {
    return this.reportsService.getMembersByCategory();
  }
}
