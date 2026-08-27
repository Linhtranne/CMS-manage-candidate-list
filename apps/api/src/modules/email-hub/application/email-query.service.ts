import { Injectable } from '@nestjs/common';
import { EmailDomainError, EMAIL_CONVERSATION_STATUSES, type EmailConversationStatus } from '../domain/email.types.js';
import type { ActorContext } from '../../identity-access/domain/permission.registry.js';
import { PolicyService } from '../../identity-access/application/policy.service.js';
import { EmailPrismaRepository, type ConversationQueryInput, type ConversationReadScope } from '../infrastructure/email.prisma-repository.js';

type ConversationListInput = Omit<ConversationQueryInput, 'scope'>;

export interface EmailConversationReadActor {
  userId: string;
  status?: ActorContext['status'];
  teamId?: string;
  roles: ActorContext['roles'];
}

type CandidateRefRow = { id: string; code: string; name: string };
type RecipientRow = { kind: string; address: string; position: number };
type AttachmentRow = { id: string; fileName: string; sizeBytes: bigint | number; status: string };
type MessageRow = {
  id: string;
  direction: string;
  status: string;
  fromAddress: string;
  subject: string;
  bodyText: string;
  sanitizedHtml: string | null;
  sentOrReceivedAt: Date;
  immutable: boolean;
  recipients: RecipientRow[];
  attachments: AttachmentRow[];
};
export type ConversationRow = {
  id: string;
  subject: string;
  snippet: string;
  status: string;
  lastActivityAt: Date;
  messageCount: number;
  hasUnreadInbound: boolean;
  version: number;
  candidate: CandidateRefRow | null;
  applicationId: string | null;
  journeyId: string | null;
  messages?: MessageRow[];
};

const READ_ACTION = 'email.read' as const;
const MANUAL_LINK_ACTION = 'email.manual_link' as const;

@Injectable()
export class EmailQueryService {
  constructor(private readonly repository: EmailPrismaRepository, private readonly policy: PolicyService) {}

  async list(query: ConversationListInput, actor: EmailConversationReadActor) {
    const scope = this.readScope(actor);
    if (scope.denied) return { items: [], page: { hasMore: false, nextCursor: null } };
    const result = await this.repository.listConversations({ ...query, scope });
    return {
      items: result.items.map(serializeConversation),
      page: { hasMore: result.hasMore, nextCursor: result.nextCursor },
    };
  }

  async get(id: string, actor: EmailConversationReadActor) {
    const scope = this.readScope(actor);
    if (scope.denied) throw new EmailDomainError('EMAIL_CONVERSATION_NOT_FOUND', 'errors.emailRequestRejected', 404);
    const row = await this.repository.findConversationForRead(id, scope);
    if (!row) throw new EmailDomainError('EMAIL_CONVERSATION_NOT_FOUND', 'errors.emailRequestRejected', 404);
    return serializeConversationDetail(row);
  }

  private readScope(actor: EmailConversationReadActor): ConversationReadScope {
    const policyActor: ActorContext = {
      userId: actor.userId,
      status: actor.status ?? 'ACTIVE',
      teamId: actor.teamId,
      roles: actor.roles,
    };
    const raw = this.policy.scopeFilter(policyActor, READ_ACTION);
    const candidateClauses = toCandidateClauses(raw);
    const companyScope = Object.keys(raw).length === 0;
    const denied = raw.id === '__DENY_ALL__' || (!companyScope && candidateClauses.length === 0);
    let includeUnmatched = false;
    try {
      this.policy.assert({ actor: policyActor, action: MANUAL_LINK_ACTION, sensitivity: 'NORMAL' });
      includeUnmatched = true;
    } catch {
      // Unmatched shared-mailbox messages require the explicit manual-link permission.
    }
    return { denied, includeUnmatched, candidateClauses };
  }
}

function toCandidateClauses(scope: Record<string, unknown>): Array<{ ownerId?: string; teamId?: string }> {
  if (!Object.keys(scope).length) return [];
  if (!Array.isArray(scope.OR)) return [];
  return scope.OR.flatMap((clause): Array<{ ownerId?: string; teamId?: string }> => {
    if (!clause || typeof clause !== 'object') return [];
    const value = clause as Record<string, unknown>;
    if (typeof value.ownerUserId === 'string') return [{ ownerId: value.ownerUserId }];
    if (typeof value.teamId === 'string') return [{ teamId: value.teamId }];
    return [];
  });
}

export function serializeConversation(row: ConversationRow) {
  return {
    id: row.id,
    subject: row.subject,
    snippet: row.snippet,
    lastActivityAt: row.lastActivityAt.toISOString(),
    status: assertConversationStatus(row.status),
    candidate: row.candidate ? { id: row.candidate.id, code: row.candidate.code, name: row.candidate.name } : null,
    applicationId: row.applicationId,
    journeyId: row.journeyId,
    messageCount: row.messageCount,
    hasUnreadInbound: row.hasUnreadInbound,
    version: row.version,
  };
}

export function serializeConversationDetail(row: ConversationRow) {
  const messages = (row.messages ?? []).map((message) => {
    return serializeEmailMessage(message);
  });
  const attachments = (row.messages ?? []).flatMap((message) => message.attachments.map((attachment) => ({
    id: attachment.id,
    fileName: attachment.fileName,
    sizeBytes: Number(attachment.sizeBytes),
    scanStatus: attachment.status,
    downloadUrl: null,
  })));
  return { ...serializeConversation(row), messages, attachments, internalNotes: [] };
}

export function serializeEmailMessage(message: MessageRow) {
  const recipients = [...message.recipients].sort((left, right) => left.position - right.position);
  return {
    id: message.id,
    direction: message.direction,
    status: message.status,
    from: message.fromAddress,
    to: recipients.filter((recipient) => recipient.kind === 'TO').map((recipient) => recipient.address),
    cc: recipients.filter((recipient) => recipient.kind === 'CC').map((recipient) => recipient.address),
    subject: message.subject,
    bodyText: message.bodyText,
    sanitizedHtml: message.sanitizedHtml,
    sentOrReceivedAt: message.sentOrReceivedAt.toISOString(),
    attachmentIds: message.attachments.map((attachment) => attachment.id),
    immutable: message.immutable,
  };
}

export function assertConversationStatus(value: string): EmailConversationStatus {
  if ((EMAIL_CONVERSATION_STATUSES as readonly string[]).includes(value)) return value as EmailConversationStatus;
  throw new EmailDomainError('EMAIL_CONVERSATION_INVALID_STATUS', 'errors.emailRequestRejected', 500);
}
