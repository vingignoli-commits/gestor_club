import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
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

  @Get('period-closes')
  getPeriodCloses() {
    return this.cashService.getPeriodCloses();
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
      receiptUrl?: string;
      receiptNote?: string;
      notes?: string;
    },
  ) {
    return this.cashService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      direction?: 'IN' | 'OUT';
      amount?: number;
      description?: string;
      occurredAt?: string;
      methodCode?: string;
      incomeType?: string;
      expenseType?: string;
      receiptUrl?: string;
      receiptNote?: string;
      notes?: string;
    },
  ) {
    return this.cashService.update(id, body);
  }

  @Post(':id/void')
  voidTransaction(
    @Param('id') id: string,
    @Body()
    body: {
      reason?: string;
    },
  ) {
    return this.cashService.voidTransaction(id, body.reason);
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

  @Post('period-close')
  closePeriod(
    @Body()
    body: {
      period: string;
      initialBalance: number;
      notes?: string;
    },
  ) {
    return this.cashService.closePeriod(body);
  }
}
