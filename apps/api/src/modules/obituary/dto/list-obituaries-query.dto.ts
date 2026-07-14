import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ObituaryStatus } from '@zentic/shared-types';

export class ListObituariesQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(ObituaryStatus)
  status?: ObituaryStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 25;
}
