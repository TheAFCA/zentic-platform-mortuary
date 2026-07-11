import { IsString, IsIn } from 'class-validator';

export class SendReactionDto {
  @IsString()
  @IsIn(['heart', 'candle', 'flower', 'dove'])
  type: string;
}
