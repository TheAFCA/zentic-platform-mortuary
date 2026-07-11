import { IsOptional, Matches } from 'class-validator';

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

export class UpdateBrandDto {
  @IsOptional()
  @Matches(HEX_COLOR, { message: 'primaryColor debe ser un color hex válido' })
  primaryColor?: string;

  @IsOptional()
  @Matches(HEX_COLOR, {
    message: 'secondaryColor debe ser un color hex válido',
  })
  secondaryColor?: string;

  @IsOptional()
  @Matches(HEX_COLOR, { message: 'textColor debe ser un color hex válido' })
  textColor?: string;

  @IsOptional()
  @Matches(HEX_COLOR, {
    message: 'backgroundColor debe ser un color hex válido',
  })
  backgroundColor?: string;
}
