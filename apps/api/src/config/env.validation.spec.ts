import { validateEnv } from './env.validation';

const BASE_ENV = {
  DATABASE_URL: 'postgresql://zentic:password@localhost:5545/zentic_dev',
  JWT_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
  STREAM_ACCESS_SECRET: 'c'.repeat(32),
};

describe('validateEnv', () => {
  it('accepts a valid environment config', () => {
    const env = validateEnv({
      NODE_ENV: 'development',
      PORT: '3000',
      DATABASE_URL: 'postgresql://zentic:password@localhost:5545/zentic_dev',
      JWT_SECRET: 'a'.repeat(32),
      JWT_REFRESH_SECRET: 'b'.repeat(32),
      STREAM_ACCESS_SECRET: 'c'.repeat(32),
      FRONTEND_URL: 'http://localhost:4200',
      PLATFORM_DOMAIN: 'localhost',
    });

    expect(env.PORT).toBe(3000);
    expect(env.JWT_ACCESS_EXPIRES_IN).toBe('15m');
    expect(env.JWT_REFRESH_EXPIRES_IN).toBe('7d');
    expect(env.STREAM_ACCESS_TOKEN_TTL_SECONDS).toBe(7200);
  });

  it('rejects invalid environment config', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'development',
      }),
    ).toThrow('Environment validation failed');
  });

  it('defaults TRUST_PROXY_HOPS to 0 and coerces it to a number', () => {
    expect(validateEnv(BASE_ENV).TRUST_PROXY_HOPS).toBe(0);
    expect(
      validateEnv({ ...BASE_ENV, TRUST_PROXY_HOPS: '1' }).TRUST_PROXY_HOPS,
    ).toBe(1);
  });
});
