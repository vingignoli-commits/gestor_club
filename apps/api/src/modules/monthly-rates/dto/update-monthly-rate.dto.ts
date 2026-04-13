import { IsDateString, IsEnum, IsNumber } from 'class-validator';
import { MemberCategory } from '@prisma/client';

export class UpdateMonthlyRateDto {
  @IsEnum(MemberCategory)
  category!: MemberCategory;

  @IsNumber()
  amount!: number;

  @IsDateString()
  validFrom!: string;
}
