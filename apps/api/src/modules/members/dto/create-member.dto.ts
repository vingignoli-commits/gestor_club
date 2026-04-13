import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { MemberCategory, MemberStatus } from '@prisma/client';

export enum MemberGrade {
  APRENDIZ = 'APRENDIZ',
  COMPANERO = 'COMPANERO',
  MAESTRO = 'MAESTRO',
}

export class CreateMemberDto {
  @IsString()
  matricula!: string;

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
  @IsEnum(MemberGrade)
  grade?: MemberGrade;

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
}
