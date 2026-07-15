import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { StreamAccessService } from './stream-access.service';

describe('StreamAccessService', () => {
  const jwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };
  const config = {
    getOrThrow: jest.fn().mockReturnValue('s'.repeat(32)),
    get: jest.fn((key: string, fallback?: unknown) => {
      if (key === 'NODE_ENV') return 'test';
      if (key === 'STREAM_ACCESS_TOKEN_TTL_SECONDS') return 7200;
      return fallback;
    }),
  };
  let service: StreamAccessService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new StreamAccessService(
      jwtService as unknown as JwtService,
      config as unknown as ConfigService,
    );
  });

  it('issues a scoped, expiring token', async () => {
    jwtService.signAsync.mockResolvedValue('signed-token');

    await expect(service.issueToken('event-1')).resolves.toBe('signed-token');
    expect(jwtService.signAsync).toHaveBeenCalledWith(
      { type: 'stream-access', eventId: 'event-1' },
      expect.objectContaining({
        expiresIn: 7200,
        audience: 'stream-viewer',
        issuer: 'zentic',
      }),
    );
  });

  it('accepts only a token scoped to the requested event', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      type: 'stream-access',
      eventId: 'event-1',
    });

    await expect(service.canAccess('token', 'event-1')).resolves.toBe(true);
    await expect(service.canAccess('token', 'event-2')).resolves.toBe(false);
  });

  it('rejects missing, invalid or expired tokens', async () => {
    await expect(service.canAccess(undefined, 'event-1')).resolves.toBe(false);
    jwtService.verifyAsync.mockRejectedValue(new Error('expired'));
    await expect(service.canAccess('expired', 'event-1')).resolves.toBe(false);
  });

  it('uses an HttpOnly cookie available to HTTP and WebSocket paths', () => {
    expect(service.cookieOptions()).toEqual({
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 7_200_000,
    });
  });
});
