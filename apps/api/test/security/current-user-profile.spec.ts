import { describe, expect, it, vi } from 'vitest';
import { SessionService, ProfileUpdateError } from '../../src/modules/identity-access/application/session.service.js';
import { hashPassword } from '../../src/modules/identity-access/infrastructure/password-hasher.js';

const config = {
  security: { sessionSecret: '12345678901234567890123456789012' },
} as never;

function userRecord(passwordHash: string | null = null) {
  return {
    id: 'user-1',
    displayName: 'Internal User',
    email: 'user@example.invalid',
    status: 'ACTIVE',
    passwordHash,
    version: 1,
    userRoles: [{ scope: 'TEAM', role: { code: 'RECRUITER' } }],
  };
}

describe('current user profile updates', () => {
  it('updates the display name and returns the refreshed session user', async () => {
    const current = userRecord();
    const updated = { ...current, displayName: 'Updated User', version: 2 };
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue(current),
        update: vi.fn().mockResolvedValue(updated),
      },
    };
    const service = new SessionService(config, prisma as never);

    await expect(service.updateOwnProfile('user-1', { displayName: '  Updated User  ' })).resolves.toMatchObject({
      id: 'user-1',
      displayName: 'Updated User',
      email: 'user@example.invalid',
      roles: ['RECRUITER'],
    });
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'user-1' },
      data: expect.objectContaining({ displayName: 'Updated User', version: { increment: 1 } }),
    }));
  });

  it('requires the current password and never writes secrets to audit data', async () => {
    const current = userRecord(await hashPassword('Current-Password-1'));
    const updated = { ...current, version: 2, passwordHash: 'new-hash' };
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue(current),
        update: vi.fn().mockResolvedValue(updated),
      },
    };
    const service = new SessionService(config, prisma as never);

    await expect(service.updateOwnProfile('user-1', { newPassword: 'New-Password-1' })).rejects.toBeInstanceOf(ProfileUpdateError);
    await expect(service.updateOwnProfile('user-1', { currentPassword: 'wrong-pass', newPassword: 'New-Password-1' })).rejects.toMatchObject({ code: 'CURRENT_PASSWORD_INVALID' });
    await service.updateOwnProfile('user-1', { currentPassword: 'Current-Password-1', newPassword: 'New-Password-1' });

    const updateCall = prisma.user.update.mock.calls.at(-1)?.[0] as { data: { passwordHash?: string } };
    expect(updateCall.data.passwordHash).toBeTruthy();
    expect(updateCall.data.passwordHash).not.toContain('New-Password-1');
  });

  it('rejects an empty update', async () => {
    const prisma = { user: { findUnique: vi.fn() } };
    const service = new SessionService(config, prisma as never);

    await expect(service.updateOwnProfile('user-1', {})).rejects.toMatchObject({ code: 'PROFILE_UPDATE_EMPTY' });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
