import { describe, expect, it, vi } from 'vitest';
import { SavedViewBadRequestError, SavedViewForbiddenError, SavedViewsService } from '../../src/modules/saved-views/application/saved-views.service.js';

const actorId = '11111111-1111-4111-8111-111111111111';
const teamId = '22222222-2222-4222-8222-222222222222';

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: '33333333-3333-4333-8333-333333333333',
    userId: actorId,
    teamId,
    resource: 'applications',
    name: 'Screening',
    query: { view: 'screening' },
    visibility: 'PRIVATE',
    createdAt: new Date('2026-08-25T00:00:00.000Z'),
    ...overrides,
  };
}

describe('SavedViewsService', () => {
  it('lists only private views owned by the actor and team views in the actor team', async () => {
    const findMany = vi.fn().mockResolvedValue([row()]);
    const service = new SavedViewsService({ savedView: { findMany } } as never);

    const result = await service.list(' applications ', { actorId, teamId, roles: [{ code: 'RECRUITER', scope: 'TEAM' }] });

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        resource: 'applications',
        OR: [
          { userId: actorId, visibility: 'PRIVATE' },
          { teamId, visibility: 'TEAM' },
        ],
      },
    }));
    expect(result[0]).toMatchObject({ resource: 'applications', query: { view: 'screening' } });
  });

  it('allows private views for an authenticated user and stores a normalized name', async () => {
    const create = vi.fn().mockResolvedValue(row({ name: 'My queue', query: { status: ['SCREENING'] } }));
    const service = new SavedViewsService({ savedView: { findFirst: vi.fn().mockResolvedValue(null), create } } as never);

    const result = await service.create({ resource: 'applications', name: '  My queue  ', query: { status: ['SCREENING'] }, visibility: 'PRIVATE' }, { actorId, roles: [{ code: 'RECRUITER' }] });

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: actorId, teamId: null, name: 'My queue', visibility: 'PRIVATE' }) }));
    expect(result).toMatchObject({ name: 'My queue', visibility: 'PRIVATE' });
  });

  it('fails closed when a non-manager attempts to publish a team view', async () => {
    const service = new SavedViewsService({ savedView: { findFirst: vi.fn() } } as never);

    await expect(service.create({ resource: 'applications', name: 'Team queue', query: {}, visibility: 'TEAM' }, { actorId, teamId, roles: [{ code: 'RECRUITER', scope: 'TEAM' }] })).rejects.toBeInstanceOf(SavedViewForbiddenError);
  });

  it('returns a client error when the list resource is missing', async () => {
    const service = new SavedViewsService({ savedView: { findMany: vi.fn() } } as never);

    await expect(service.list(undefined as never, { actorId, teamId, roles: [{ code: 'MANAGER', scope: 'TEAM' }] })).rejects.toBeInstanceOf(SavedViewBadRequestError);
  });
});
