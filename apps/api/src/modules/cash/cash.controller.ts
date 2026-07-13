import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { RequirePermissions } from '../../common/auth/auth.decorators';
import { CashService } from './cash.service';

// Tesorería también lee el saldo y registra movimientos de caja.
const CAN_READ_CASH = ['cash:read', 'treasury:read'] as const;
const CAN_WRITE_CASH = ['cash:write', 'treasury:write'] as const;

@Controller('cash')
export class CashController {
  constructor(private readonly cashService: CashService) {}

  @RequirePermissions(...CAN_READ_CASH)
  @Get()
  findAll() {
    return this.cashService.findAll();
  }

  @RequirePermissions(...CAN_READ_CASH)
  @Get('summary')
  getSummary() {
    return this.cashService.getSummary();
  }

  @RequirePermissions(...CAN_READ_CASH)
  @Get('period-closes')
  getPeriodCloses() {
    return this.cashService.getPeriodCloses();
  }

  @RequirePermissions(...CAN_WRITE_CASH)
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

  @RequirePermissions(...CAN_WRITE_CASH)
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

  @RequirePermissions(...CAN_WRITE_CASH)
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

  @RequirePermissions('cash:write')
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

  @RequirePermissions('cash:write')
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
