import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

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
}
