import { IsDateString, IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';

export enum MemberRoleType {
  TITULAR = 'TITULAR',
  ADHERENTE = 'ADHERENTE',
  BECADO = 'BECADO',
  VITALICIO = 'VITALICIO',
  INVITADO = 'INVITADO',
}

export class CreateMemberDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsString()
  documentNumber!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsDateString()
  joinedAt!: string;

  @IsString()
  categoryId!: string;

  @IsEnum(MemberRoleType)
  memberType!: MemberRoleType;

  @IsOptional()
  @IsString()
  notes?: string;
}

