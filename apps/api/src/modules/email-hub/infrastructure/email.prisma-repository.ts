import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../platform/database/prisma.service.js';
import type { EmailMessageDirection, EmailMessageStatus, MailboxHealthStatus, MailboxProvider } from '../domain/email.types.js';

export interface CreateMailboxInput {
  address: string;
  displayName: string;
  provider?: MailboxProvider;
  status?: MailboxHealthStatus;
  providerAccountRef?: string;
}

export interface CreateConversationInput {
  mailboxId: string;
  candidateId?: string;
  applicationId?: string;
  journeyId?: string;
  subject: string;
  snippet: string;
  lastActivityAt: Date;
}

export interface CreateMessageInput {
  mailboxId: string;
  conversationId: string;
  direction: EmailMessageDirection;
  status: EmailMessageStatus;
  providerMessageId?: string;
  internetMessageId?: string;
  idempotencyKey?: string;
  fromAddress: string;
  subject: string;
  bodyText: string;
  sanitizedHtml?: string;
  sentOrReceivedAt: Date;
  recipients: readonly { kind: 'TO' | 'CC' | 'BCC'; address: string }[];
}

@Injectable()
export class EmailPrismaRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService | Prisma.TransactionClient) {}

  async withTransaction<T>(work: (repository: EmailPrismaRepository, transaction: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    if ('$transaction' in this.prisma) {
      return this.prisma.$transaction(async (transaction) => work(new EmailPrismaRepository(transaction), transaction));
    }
    return work(this, this.prisma);
  }

  createMailbox(input: CreateMailboxInput) {
    return this.prisma.mailbox.create({
      data: {
        address: input.address,
        displayName: input.displayName,
        provider: input.provider ?? 'DISABLED',
        status: input.status ?? 'NOT_CONFIGURED',
        ...(input.providerAccountRef ? { providerAccountRef: input.providerAccountRef } : {}),
      },
    });
  }

  createConversation(input: CreateConversationInput) {
    return this.prisma.emailConversation.create({
      data: {
        mailboxId: input.mailboxId,
        ...(input.candidateId ? { candidateId: input.candidateId } : {}),
        ...(input.applicationId ? { applicationId: input.applicationId } : {}),
        ...(input.journeyId ? { journeyId: input.journeyId } : {}),
        subject: input.subject,
        snippet: input.snippet,
        lastActivityAt: input.lastActivityAt,
      },
    });
  }

  createMessage(input: CreateMessageInput) {
    return this.prisma.emailMessage.create({
      data: {
        mailboxId: input.mailboxId,
        conversationId: input.conversationId,
        direction: input.direction,
        status: input.status,
        ...(input.providerMessageId ? { providerMessageId: input.providerMessageId } : {}),
        ...(input.internetMessageId ? { internetMessageId: input.internetMessageId } : {}),
        ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
        fromAddress: input.fromAddress,
        subject: input.subject,
        bodyText: input.bodyText,
        ...(input.sanitizedHtml ? { sanitizedHtml: input.sanitizedHtml } : {}),
        sentOrReceivedAt: input.sentOrReceivedAt,
        recipients: { create: input.recipients.map((recipient, position) => ({ ...recipient, position })) },
      },
      include: { recipients: true, attachments: true },
    });
  }

  findMessage(id: string) {
    return this.prisma.emailMessage.findUnique({ where: { id }, include: { recipients: true, attachments: true } });
  }

  async transitionMessage(id: string, expectedStatus: EmailMessageStatus, targetStatus: EmailMessageStatus) {
    const result = await this.prisma.emailMessage.updateMany({ where: { id, status: expectedStatus }, data: { status: targetStatus, version: { increment: 1 } } });
    if (result.count !== 1) throw new Error('EMAIL_MESSAGE_VERSION_CONFLICT');
    return this.findMessage(id);
  }
}
