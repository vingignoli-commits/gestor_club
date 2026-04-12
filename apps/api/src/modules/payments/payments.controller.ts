import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  findAll() {
    return this.paymentsService.findAll();
  }

  @Post()
  create(@Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(dto);
  }

  @Post(':id/void')
  voidPayment(@Param('id') id: string) {
    return this.paymentsService.voidPayment(id);
  }

  @Get('monthly-summary')
  getMonthlySummary() {
    return this.paymentsService.getMonthlySummary();
  }
}
