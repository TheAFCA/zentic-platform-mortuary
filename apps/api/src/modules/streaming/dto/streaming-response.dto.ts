import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EventListItemResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiProperty() slug: string;
  @ApiProperty() status: string;
  @ApiProperty() isPublic: boolean;
  @ApiProperty() scheduledAt: Date;
}

export class EventDetailResponseDto extends EventListItemResponseDto {
  @ApiPropertyOptional({ nullable: true }) description: string | null;
  @ApiPropertyOptional({ nullable: true }) recordingUrl: string | null;
  @ApiPropertyOptional({ nullable: true }) playbackUrl: string | null;
}

export class PublicEventResponseDto {
  @ApiPropertyOptional({ nullable: true }) id: string | null;
  @ApiProperty() title: string;
  @ApiProperty() slug: string;
  @ApiProperty() status: string;
  @ApiProperty() isPublic: boolean;
  @ApiPropertyOptional({ nullable: true }) playbackUrl: string | null;
  @ApiProperty() recordingReady: boolean;
  @ApiPropertyOptional({ nullable: true })
  deceased: Record<string, unknown> | null;
  @ApiPropertyOptional({ nullable: true })
  tenant: {
    name: string;
    brandConfig: {
      logoUrl: string | null;
      primaryColor: string;
      secondaryColor: string;
      textColor: string;
      backgroundColor: string;
    } | null;
  };
}

export class StreamCredentialsResponseDto {
  @ApiPropertyOptional({ nullable: true }) streamKey: string | null;
  @ApiPropertyOptional({ nullable: true }) rtmpUrl: string | null;
  @ApiProperty() revealed: boolean;
}

export class PlaybackResponseDto {
  @ApiProperty() url: string;
}
