import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateObituaryMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  authorName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  content!: string;

  @IsOptional()
  @IsString()
  iconType?: string;

  // Requerido solo si el obituario tiene isPublic=false.
  @IsOptional()
  @IsString()
  accessCode?: string;
}
