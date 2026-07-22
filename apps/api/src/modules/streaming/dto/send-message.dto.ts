import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  authorName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  content: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  iconType?: string;
}
