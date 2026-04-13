import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { MemberCategory, MemberStatus } from '@prisma/client';
import { MemberGrade } from './create-member.dto';

export class UpdateMemberDto {
  @IsOptional()
  @IsString()
  matricula?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEnum(MemberCategory)
  category?: MemberCategory;

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
}
