import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  memberId!: string;

  @IsDateString()
  paidAt!: string;

  @IsInt()
  @Min(2000)
  @Max(2100)
  periodYear!: number;

  @IsInt()
  @Min(1)
  @Max(12)
  periodMonth!: number;

  @IsNumber()
  amount!: number;

  @IsString()
  methodCode!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
