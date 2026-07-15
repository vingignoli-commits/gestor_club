import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAnnouncementDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body!: string;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;
}
