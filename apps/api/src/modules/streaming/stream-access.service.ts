import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { CookieOptions } from 'express';
import { Env } from '../../config/env.validation';

export const STREAM_ACCESS_COOKIE = 'stream_event_access';

interface StreamAccessPayload {
  type: 'stream-access';
  eventId: string;
}

@Injectable()
export class StreamAccessService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<Env>,
  ) {}

  issueToken(eventId: string): Promise<string> {
    return this.jwtService.signAsync(
      { type: 'stream-access', eventId } satisfies StreamAccessPayload,
      {
        secret: this.config.getOrThrow('STREAM_ACCESS_SECRET'),
        expiresIn: this.config.get('STREAM_ACCESS_TOKEN_TTL_SECONDS', 7200),
        audience: 'stream-viewer',
        issuer: 'zentic',
      },
    );
  }

  async canAccess(
    token: string | undefined,
    eventId: string,
  ): Promise<boolean> {
    if (!token) return false;

    try {
      const payload = await this.jwtService.verifyAsync<StreamAccessPayload>(
        token,
        {
          secret: this.config.getOrThrow('STREAM_ACCESS_SECRET'),
          audience: 'stream-viewer',
          issuer: 'zentic',
        },
      );
      return payload.type === 'stream-access' && payload.eventId === eventId;
    } catch {
      return false;
    }
  }

  cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.get('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: this.config.get('STREAM_ACCESS_TOKEN_TTL_SECONDS', 7200) * 1000,
    };
  }
}
