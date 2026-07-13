import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { RequirePermissions } from '../../common/auth/auth.decorators';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @RequirePermissions('treasury:read')
  @Get()
  findAll() {
    return this.paymentsService.findAll();
  }

  @RequirePermissions('treasury:write')
  @Post()
  create(@Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(dto);
  }

  @RequirePermissions('treasury:write')
  @Post(':id/void')
  voidPayment(@Param('id') id: string) {
    return this.paymentsService.voidPayment(id);
  }

  @RequirePermissions('treasury:read', 'reports:read')
  @Get('monthly-summary')
  getMonthlySummary() {
    return this.paymentsService.getMonthlySummary();
  }
}
