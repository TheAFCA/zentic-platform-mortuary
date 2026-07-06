import { hashPassword, verifyPassword } from './password.util';

describe('password util', () => {
  it('hashes and verifies passwords', async () => {
    const hash = await hashPassword('Secret123!');

    expect(hash).not.toBe('Secret123!');
    await expect(verifyPassword('Secret123!', hash)).resolves.toBe(true);
    await expect(verifyPassword('Wrong123!', hash)).resolves.toBe(false);
  });
});
