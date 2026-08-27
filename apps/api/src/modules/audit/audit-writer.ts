import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { redactStructuredValue } from '../../platform/security/redaction.js';

export interface AuditEventInput {
  actorUserId?: string | null;
  sessionId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  correlationId: string;
  diffJson?: Record<string, unknown>;
  metadataJson?: Record<string, unknown>;
}

@Injectable()
export class AuditWriter {
  async append(tx: Prisma.TransactionClient, event: AuditEventInput) {
    return tx.auditEvent.create({
      data: {
        actorUserId: event.actorUserId ?? null,
        sessionId: event.sessionId ?? null,
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId ?? null,
        correlationId: event.correlationId,
        diffJson: redactStructuredValue(event.diffJson ?? {}) as Prisma.InputJsonValue,
        metadataJson: redactStructuredValue(event.metadataJson ?? {}) as Prisma.InputJsonValue,
      },
    });
  }
}
