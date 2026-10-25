import { validateEnv } from './env.validation';

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
  const storageEnv = {
    DATABASE_URL: 'postgresql://test:test@localhost/test',
    JWT_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
    STREAM_ACCESS_SECRET: 'c'.repeat(32),
    STORAGE_PROVIDER: 's3',
    S3_ENDPOINT: 'http://garage:3900',
    S3_BUCKET: 'homena-imagenes',
    S3_ACCESS_KEY_ID: 'test',
    S3_SECRET_ACCESS_KEY: 'test',
    STORAGE_PUBLIC_URL: 'https://homena.test/api/files/images',
  };

  it('accepts Garage with an internal HTTP endpoint and public HTTPS URLs', () => {
    expect(
      validateEnv({ ...storageEnv, NODE_ENV: 'production' }).S3_REGION,
    ).toBe('garage');
  });

  it.each([
    'S3_ENDPOINT',
    'S3_BUCKET',
    'S3_ACCESS_KEY_ID',
    'S3_SECRET_ACCESS_KEY',
    'STORAGE_PUBLIC_URL',
  ])('requires %s when S3 is enabled', (key) => {
    expect(() => validateEnv({ ...storageEnv, [key]: '' })).toThrow(key);
  });

  it('rejects public HTTP image URLs in production', () => {
    expect(() =>
      validateEnv({
        ...storageEnv,
        NODE_ENV: 'production',
        STORAGE_PUBLIC_URL: 'http://homena.test/api/files/images',
      }),
    ).toThrow('HTTPS');
  });
});
