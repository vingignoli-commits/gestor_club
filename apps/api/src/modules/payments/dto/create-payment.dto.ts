import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class PaymentAllocationDto {
  @IsString()
  billingPeriodId!: string;

  @IsNumber()
  amount!: number;
}

export class CreatePaymentDto {
  @IsString()
  memberId!: string;

  @IsDateString()
  paidAt!: string;

  @IsNumber()
  amount!: number;

  @IsString()
  methodCode!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PaymentAllocationDto)
  allocations!: PaymentAllocationDto[];
}

