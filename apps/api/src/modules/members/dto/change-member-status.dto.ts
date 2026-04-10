import { IsDateString, IsOptional, IsString } from 'class-validator';

export class ChangeMemberStatusDto {
  @IsString()
  statusCode!: string;

  @IsDateString()
  effectiveFrom!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

