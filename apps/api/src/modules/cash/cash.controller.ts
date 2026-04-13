import { Body, Controller, Get, Post } from '@nestjs/common';
import { CashService } from './cash.service';

@Controller('cash')
export class CashController {
  constructor(private readonly cashService: CashService) {}

  @Get()
  findAll() {
    return this.cashService.findAll();
  }

  @Post()
  create(@Body() body: {
    direction: 'IN' | 'OUT';
    amount: number;
    description: string;
    occurredAt: string;
    methodCode?: string;
    incomeType?: string;
    expenseType?: string;
    receiptNote?: string;
  }) {
    return this.cashService.create(body);
  }
}
