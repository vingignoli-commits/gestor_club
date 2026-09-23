import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { BloodType } from '@prisma/client';

/**
 * Todos los campos son opcionales a propósito: la ficha de emergencia se carga
 * de forma voluntaria y parcial. Un socio puede querer declarar solo sus
 * alergias y nada más, y eso ya es útil.
 */
export class UpsertHealthDto {
  @IsOptional()
  @IsEnum(BloodType)
  bloodType?: BloodType;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  allergies?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  medications?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  chronicConditions?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  insuranceProvider?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  insuranceMemberId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  insuranceEmergencyPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  primaryDoctorName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  primaryDoctorPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  implantedDevices?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  relevantSurgeries?: string;

  @IsOptional()
  @IsBoolean()
  organDonationOpposition?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  advanceDirectives?: string;
}
