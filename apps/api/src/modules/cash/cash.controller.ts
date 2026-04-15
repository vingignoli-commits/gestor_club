import { Body, Controller, Get, Post } from '@nestjs/common';
import { CashService } from './cash.service';

@Controller('cash')
export class CashController {
  constructor(private readonly cashService: CashService) {}

  @Get()
  findAll() {
    return this.cashService.findAll();
  }

  @Get('summary')
  getSummary() {
    return this.cashService.getSummary();
  }

  @Post()
  create(
    @Body()
    body: {
      direction: 'IN' | 'OUT';
      amount: number;
      description: string;
      occurredAt: string;
      methodCode?: string;
      incomeType?: string;
      expenseType?: string;
      receiptNote?: string;
      notes?: string;
    },
  ) {
    return this.cashService.create(body);
  }

  @Post('correction')
  createCorrection(
    @Body()
    body: {
      actualBalance: number;
      occurredAt?: string;
      notes?: string;
      methodCode?: string;
    },
  ) {
    return this.cashService.createCorrection(body);
  }
}
