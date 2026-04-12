import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';

export enum MemberCategoryEnum {
  SIMPLE = 'SIMPLE',
  DOBLE = 'DOBLE',
  ESTUDIANTE = 'ESTUDIANTE',
  SOCIAL = 'SOCIAL',
  MENOR = 'MENOR',
  HONOR = 'HONOR',
}

export enum MemberStatusEnum {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export class UpdateMemberDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEnum(MemberCategoryEnum)
  category?: MemberCategoryEnum;

  @IsOptional()
  @IsEnum(MemberStatusEnum)
  status?: MemberStatusEnum;

  @IsOptional()
  @IsString()
  grade?: string;

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
