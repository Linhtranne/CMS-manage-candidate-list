import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../platform/database/prisma.service.js';
import type { ActorRole } from '../../identity-access/domain/permission.registry.js';
import type { SavedViewVisibility } from '../http/saved-views.dto.js';

export interface SavedViewContext {
  actorId: string;
  teamId?: string;
  roles: readonly ActorRole[];
}

export class SavedViewBadRequestError extends Error {
  readonly statusCode = 400;
  readonly code = 'SAVED_VIEW_INVALID';
  readonly messageKey = 'errors.savedViewInvalid';
}

export class SavedViewNotFoundError extends Error {
  readonly statusCode = 404;
  readonly code = 'SAVED_VIEW_NOT_FOUND';
  readonly messageKey = 'errors.savedViewNotFound';
}

export class SavedViewForbiddenError extends Error {
  readonly statusCode = 403;
  readonly code = 'FORBIDDEN';
  readonly messageKey = 'errors.forbidden';
}

type SavedViewRow = {
  id: string;
  resource: string;
  name: string;
  query: Prisma.JsonValue;
  visibility: string;
  createdAt: Date;
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string' && item.length <= 500);
}

function normalizeQuery(value: unknown): Record<string, string | string[]> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new SavedViewBadRequestError('query must be an object');
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > 50) throw new SavedViewBadRequestError('query has too many keys');
  const result: Record<string, string | string[]> = {};
  for (const [key, item] of entries) {
    if (!key || key.length > 80) throw new SavedViewBadRequestError('query key is invalid');
    if (typeof item === 'string' && item.length <= 500) result[key] = item;
    else if (isStringArray(item) && item.length <= 50) result[key] = item;
    else throw new SavedViewBadRequestError('query values must be strings or string arrays');
  }
  return result;
}

function normalizeResource(resource: unknown): string {
  if (typeof resource !== 'string') throw new SavedViewBadRequestError('resource is required');
  const value = resource.trim();
  if (!/^[A-Za-z0-9._-]{1,80}$/.test(value)) throw new SavedViewBadRequestError('resource is invalid');
  return value;
}

function normalizeName(name: string): string {
  const value = name.trim();
  if (!value || value.length > 160) throw new SavedViewBadRequestError('name is invalid');
  return value;
}

function canPublishTeam(context: SavedViewContext): boolean {
  return Boolean(context.teamId) && context.roles.some((role) => role.code === 'MANAGER' || role.code === 'CONFIG_ADMIN');
}

function assertVisibility(visibility: SavedViewVisibility, context: SavedViewContext): void {
  if (visibility === 'TEAM' && !canPublishTeam(context)) {
    throw new SavedViewForbiddenError('team saved views require a manager role and team');
  }
}

function serialize(row: SavedViewRow): { id: string; resource: string; name: string; query: Record<string, string | string[]>; visibility: SavedViewVisibility; createdAt: string } {
  return { id: row.id, resource: row.resource, name: row.name, query: normalizeQuery(row.query), visibility: row.visibility as SavedViewVisibility, createdAt: row.createdAt.toISOString() };
}

@Injectable()
export class SavedViewsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(resource: string, context: SavedViewContext) {
    const normalizedResource = normalizeResource(resource);
    const rows = await this.prisma.savedView.findMany({
      where: {
        resource: normalizedResource,
        OR: [
          { userId: context.actorId, visibility: 'PRIVATE' },
          ...(context.teamId ? [{ teamId: context.teamId, visibility: 'TEAM' }] : []),
        ],
      },
      orderBy: [{ name: 'asc' }, { createdAt: 'desc' }, { id: 'asc' }],
    });
    return rows.map((row) => serialize(row));
  }

  async create(input: { resource: string; name: string; query: unknown; visibility: SavedViewVisibility }, context: SavedViewContext) {
    const resource = normalizeResource(input.resource);
    const name = normalizeName(input.name);
    const query = normalizeQuery(input.query);
    assertVisibility(input.visibility, context);
    const duplicate = await this.prisma.savedView.findFirst({ where: { userId: context.actorId, resource, name } });
    if (duplicate) throw new SavedViewBadRequestError('a view with this name already exists for this resource');
    const row = await this.prisma.savedView.create({
      data: { userId: context.actorId, teamId: input.visibility === 'TEAM' ? context.teamId! : null, resource, name, query: query as Prisma.InputJsonValue, visibility: input.visibility },
    });
    return serialize(row);
  }

  async update(id: string, input: { resource: string; name: string; query: unknown; visibility: SavedViewVisibility }, context: SavedViewContext) {
    const existing = await this.prisma.savedView.findUnique({ where: { id } });
    if (!existing) throw new SavedViewNotFoundError();
    if (existing.userId !== context.actorId) throw new SavedViewForbiddenError('only the owner can update a saved view');
    const resource = normalizeResource(input.resource);
    const name = normalizeName(input.name);
    const query = normalizeQuery(input.query);
    assertVisibility(input.visibility, context);
    const duplicate = await this.prisma.savedView.findFirst({ where: { userId: context.actorId, resource, name, NOT: { id } } });
    if (duplicate) throw new SavedViewBadRequestError('a view with this name already exists for this resource');
    const row = await this.prisma.savedView.update({
      where: { id },
      data: { resource, name, query: query as Prisma.InputJsonValue, visibility: input.visibility, teamId: input.visibility === 'TEAM' ? context.teamId! : null },
    });
    return serialize(row);
  }
}
