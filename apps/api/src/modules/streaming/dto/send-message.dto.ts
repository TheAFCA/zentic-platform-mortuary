import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  authorName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  content: string;

  @IsString()
  @IsOptional()
  iconType?: string;
}
