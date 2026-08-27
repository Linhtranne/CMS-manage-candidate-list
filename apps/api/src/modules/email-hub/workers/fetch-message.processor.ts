import { Injectable } from '@nestjs/common';
import type { QueuePayload } from '../../../platform/queue/queue.service.js';
import { EmailInboundService } from '../application/email-inbound.service.js';

@Injectable()
export class FetchMessageProcessor {
  constructor(private readonly inbound: EmailInboundService) {}

  async handle(payload: QueuePayload): Promise<void> {
    if (typeof payload.mailboxId !== 'string' || typeof payload.providerMessageId !== 'string') return;
    await this.inbound.ingest({ mailboxId: payload.mailboxId, providerMessageId: payload.providerMessageId, correlationId: payload.correlationId });
  }
}
