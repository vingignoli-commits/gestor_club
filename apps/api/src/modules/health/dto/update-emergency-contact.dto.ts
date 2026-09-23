import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * El contacto de emergencia: a quién llamamos si algo le pasa al socio.
 *
 * No tiene nada que ver con el teléfono de urgencias de la obra social, que
 * vive en la ficha de salud. Este lo carga el propio socio y es el de una
 * persona concreta, por eso el nombre y el parentesco viajan con el número:
 * un teléfono suelto no le dice a nadie a quién está llamando.
 */
export class UpdateEmergencyContactDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  emergencyContactRelationship?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  emergencyContactPhone?: string;
}
