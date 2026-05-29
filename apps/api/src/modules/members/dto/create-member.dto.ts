import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { MemberCategory, MemberStatus } from '@prisma/client';

export class CreateMemberDto {
  @IsString()
  matricula!: string;

  @IsOptional()
  @IsString()
  documentNumber?: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsEnum(MemberCategory)
  category!: MemberCategory;

  @IsOptional()
  @IsEnum(MemberStatus)
  status?: MemberStatus;

  @IsOptional()
  @IsString()
  grade?: string | null;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsDateString()
  joinedAt!: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsDateString()
  initiationDate!: string;

  @IsOptional()
  @IsDateString()
  fellowcraftDate?: string;

  @IsOptional()
  @IsDateString()
  masterDate?: string;
}
