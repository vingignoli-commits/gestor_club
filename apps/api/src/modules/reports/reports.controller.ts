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

  @Get('members-by-category')
  getMembersByCategory() {
    return this.reportsService.getMembersByCategory();
  }

  @Get('financial-summary')
  getFinancialSummary() {
    return this.reportsService.getFinancialSummary();
  }
}
