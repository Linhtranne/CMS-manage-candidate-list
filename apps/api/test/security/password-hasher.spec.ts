import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/modules/identity-access/infrastructure/password-hasher.js';

describe('password hashing', () => {
  it('hashes a password and verifies only the original value', async () => {
    const hash = await hashPassword('LocalOnly-2026!');

    expect(hash).not.toContain('LocalOnly-2026!');
    await expect(verifyPassword('LocalOnly-2026!', hash)).resolves.toBe(true);
    await expect(verifyPassword('wrong-password', hash)).resolves.toBe(false);
  });

  it('rejects malformed password hashes', async () => {
    await expect(verifyPassword('anything', 'not-a-scrypt-hash')).resolves.toBe(false);
  });
});
