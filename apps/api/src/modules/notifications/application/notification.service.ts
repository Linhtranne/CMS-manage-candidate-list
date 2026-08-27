import { Injectable } from '@nestjs/common';
import { Prisma, type Notification as PrismaNotification } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../platform/database/prisma.service.js';

export const NOTIFICATION_KINDS = ['INTERVIEW_SCHEDULED', 'MAIL_NEEDS_ACTION', 'JOURNEY_AT_RISK', 'TASK_ASSIGNED', 'APPLICATION_DECISION'] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];
export type NotificationSeverity = 'INFO' | 'WARNING' | 'DANGER';

export interface CreateNotificationInput {
  userId: string;
  kind: NotificationKind;
  severity: NotificationSeverity;
  params?: Record<string, unknown>;
  href?: string | null;
  dedupeKey: string;
}

function isRecord(value: Prisma.JsonValue): value is Prisma.JsonObject {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function validateHref(href: string | null | undefined): string | null {
  if (href === undefined || href === null || href === '') return null;
  if (!href.startsWith('/') || href.startsWith('//') || href.length > 500) throw new NotificationBadRequestError('notification href must be an internal path');
  return href;
}

function serialize(row: PrismaNotification) {
  return {
    id: row.id,
    kind: row.kind as NotificationKind,
    severity: row.severity as NotificationSeverity,
    params: isRecord(row.params) ? row.params : {},
    href: row.href,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export class NotificationBadRequestError extends Error {
  readonly statusCode = 400;
  readonly code = 'NOTIFICATION_INVALID';
  readonly messageKey = 'errors.notificationInvalid';
}

export class NotificationNotFoundError extends Error {
  readonly statusCode = 404;
  readonly code = 'NOTIFICATION_NOT_FOUND';
  readonly messageKey = 'errors.notificationNotFound';
}

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, limitInput?: string) {
    const parsedLimit = Number(limitInput ?? 20);
    const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(50, Math.floor(parsedLimit))) : 20;
    const [rows, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({ where: { userId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: limit }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);
    return { items: rows.map(serialize), unreadCount, nextCursor: null };
  }

  async markRead(userId: string, notificationId: string) {
    const updated = await this.prisma.notification.updateMany({ where: { id: notificationId, userId, readAt: null }, data: { readAt: new Date() } });
    if (updated.count === 0) {
      const existing = await this.prisma.notification.findFirst({ where: { id: notificationId, userId } });
      if (!existing) throw new NotificationNotFoundError();
      return serialize(existing);
    }
    return serialize(await this.prisma.notification.findUniqueOrThrow({ where: { id: notificationId } }));
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
    return { updatedCount: result.count };
  }

  async create(input: CreateNotificationInput, transaction?: Prisma.TransactionClient) {
    if (!NOTIFICATION_KINDS.includes(input.kind)) throw new NotificationBadRequestError('notification kind is invalid');
    const params = input.params ?? {};
    if (Array.isArray(params) || Object.keys(params).length > 20) throw new NotificationBadRequestError('notification params are invalid');
    const href = validateHref(input.href);
    const client = transaction ?? this.prisma;
    const row = await client.notification.upsert({
      where: { dedupeKey: input.dedupeKey },
      create: { userId: input.userId, kind: input.kind, severity: input.severity, params: params as Prisma.InputJsonValue, href, dedupeKey: input.dedupeKey },
      update: {},
    });
    return serialize(row);
  }
}
