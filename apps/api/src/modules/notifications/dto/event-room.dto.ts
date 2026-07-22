import { IsString, MaxLength, MinLength } from 'class-validator';

export class EventRoomDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  eventId: string;
}
